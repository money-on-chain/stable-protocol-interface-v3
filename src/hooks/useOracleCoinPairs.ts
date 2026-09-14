import { useQuery } from "@tanstack/react-query";
import type { Abi, PublicClient } from "viem";
import { hexToString } from "viem";
import { readContract } from "viem/actions";

import { runMulticallSync } from "../backend/runMulticallSync";
import CoinPairPrice from "../contracts/omoc/CoinPairPrice.json";
import type { Address, CallRequest, DContracts, SyncMulticallInput } from "../types/hooks";

const ABI_CoinPairPrice = CoinPairPrice.abi as readonly unknown[];

export interface OracleCoinPairInfo {
    // bytes32, passed back as-is to subscribeToCoinPair/unSubscribeFromCoinPair
    pairRaw: `0x${string}`;
    pairName: string;
    isSubscribed: boolean;
    // Current price (18 decimals) and validity, read from the pair's CoinPairPrice contract
    price: bigint;
    priceIsValid: boolean;
    // Address of the pair's CoinPairPrice contract — used to look up its
    // subscribed oracles (see useCoinPairOracles.ts)
    coinPairPriceAddress: Address;
    // How many oracles are subscribed vs. the pair's subscription cap
    subscribedCount: number;
    maxSubscribedOracles: number;
    // Whether the connected owner is selected in this pair's current round —
    // this is exactly what blocks OracleManager._canRemoveOracle (see
    // components/Oracles/OracleSetup)
    isSelectedInCurrentRound: boolean;
    // Whether the registered contract for this pair actually implements
    // CoinPairPrice. Some names registered under StakingMachine's coin-pair
    // registry aren't real price feeds — e.g. "TASKSRUNNER" reuses
    // OracleManager.registerCoinPair to point at an automation TasksRunner
    // contract instead (see the protocol deploy scripts). Subscribing still
    // works for these (it's plain StakingMachine bookkeeping), but round/price
    // metrics don't apply — see useCoinPairOracles.ts for how the "Explore"
    // detail view falls back for them.
    isPriceContract: boolean;
}

/**
 * Reads the full coin-pair list from StakingMachine (OMoC's oracle registry
 * interface, merged into the same contract instance — see
 * contracts/omoc/StakingMachine.json) and, when userAddress is known, whether
 * the connected account's oracle is subscribed to each one.
 *
 * The pair list length is only known at read time (getCoinPairCount), so this
 * can't be expressed as a static useMultiCall call array — it runs as a
 * sequential imperative multicall inside a single useQuery, same style as
 * mocAddresses' tpTokens loop in hooks/useReadContracts.ts.
 */
export function useOracleCoinPairs(
    publicClient: PublicClient | undefined,
    contracts: DContracts | null | undefined,
    userAddress?: Address,
    refetchInterval = 30_000
) {
    const stakingMachine = contracts?.StakingMachine;

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ["oracleCoinPairs", stakingMachine?.address, userAddress],
        enabled: !!publicClient && !!stakingMachine,
        refetchInterval,
        queryFn: async (): Promise<OracleCoinPairInfo[]> => {
            if (!publicClient || !stakingMachine) return [];

            const count = (await readContract(publicClient, {
                address: stakingMachine.address,
                abi: stakingMachine.abi,
                functionName: "getCoinPairCount",
                args: [],
            })) as bigint;

            const pairCount = Number(count);
            if (pairCount <= 0) return [];

            const indexCalls: CallRequest[] = [];
            for (let i = 0; i < pairCount; i++) {
                indexCalls.push({
                    contract: stakingMachine,
                    functionName: "getCoinPairAtIndex",
                    args: [i],
                    resultType: "bytes32",
                    keys: ["getCoinPairAtIndex", i],
                });
            }
            const indexRes = await runMulticallSync(
                publicClient,
                indexCalls as SyncMulticallInput[]
            );
            const pairs =
                ((indexRes.data?.getCoinPairAtIndex as `0x${string}`[]) ??
                    []) || [];

            let subscribed: boolean[] = pairs.map(() => false);
            if (userAddress) {
                const subscribedCalls: CallRequest[] = pairs.map(
                    (pair, i) => ({
                        contract: stakingMachine,
                        functionName: "isSubscribed",
                        args: [userAddress, pair],
                        resultType: "bool",
                        keys: ["isSubscribed", i],
                    })
                );
                const subscribedRes = await runMulticallSync(
                    publicClient,
                    subscribedCalls as SyncMulticallInput[]
                );
                subscribed =
                    (subscribedRes.data?.isSubscribed as boolean[]) ??
                    subscribed;
            }

            const addressCalls: CallRequest[] = pairs.map((pair, i) => ({
                contract: stakingMachine,
                functionName: "getContractAddress",
                args: [pair],
                resultType: "address",
                keys: ["getContractAddress", i],
            }));
            const addressRes = await runMulticallSync(
                publicClient,
                addressCalls as SyncMulticallInput[]
            );
            const coinPairPriceAddresses =
                (addressRes.data?.getContractAddress as Address[]) ?? [];

            // Not every registered "coin pair" is backed by a CoinPairPrice
            // contract (see isPriceContract on OracleCoinPairInfo above).
            // getPriceInfo is used as a canary to tell them apart, via a
            // failure-tolerant multicall so a non-price entry never throws.
            const priceInfoResults = coinPairPriceAddresses.length
                ? await publicClient.multicall({
                      contracts: coinPairPriceAddresses.map((address) => ({
                          address,
                          abi: ABI_CoinPairPrice as Abi,
                          functionName: "getPriceInfo",
                          args: [],
                      })),
                      allowFailure: true,
                  })
                : [];

            const isPriceContract = pairs.map(
                (_pair, i) => priceInfoResults[i]?.status === "success"
            );
            const priceInfos: [bigint, boolean, bigint][] = pairs.map(
                (_pair, i) =>
                    (isPriceContract[i]
                        ? (priceInfoResults[i].result as [
                              bigint,
                              boolean,
                              bigint,
                          ])
                        : undefined) ?? [0n, false, 0n]
            );

            const capacityCalls: CallRequest[] =
                coinPairPriceAddresses.flatMap((address, i) => [
                    {
                        contract: { address, abi: ABI_CoinPairPrice },
                        functionName: "getSubscribedOraclesLen",
                        args: [],
                        resultType: "uint256" as const,
                        keys: ["getSubscribedOraclesLen", i],
                    },
                    {
                        contract: { address, abi: ABI_CoinPairPrice },
                        functionName: "getMaxSubscribedOraclesPerRound",
                        args: [],
                        resultType: "uint256" as const,
                        keys: ["getMaxSubscribedOraclesPerRound", i],
                    },
                ]);
            const capacityRes = capacityCalls.length
                ? await runMulticallSync(
                      publicClient,
                      capacityCalls as SyncMulticallInput[]
                  )
                : { data: undefined };
            const subscribedCounts =
                (capacityRes.data?.getSubscribedOraclesLen as
                    | bigint[]
                    | undefined) ?? [];
            const maxSubscribedCounts =
                (capacityRes.data?.getMaxSubscribedOraclesPerRound as
                    | bigint[]
                    | undefined) ?? [];

            let selectedInCurrentRound: boolean[] = pairs.map(() => false);
            if (userAddress) {
                const roundInfoCalls: CallRequest[] =
                    coinPairPriceAddresses.map((address, i) => ({
                        contract: { address, abi: ABI_CoinPairPrice },
                        functionName: "getOracleRoundInfo",
                        args: [userAddress],
                        resultType: [
                            { type: "uint256", name: "points" },
                            { type: "bool", name: "selectedInCurrentRound" },
                        ],
                        keys: ["getOracleRoundInfo", i],
                    }));
                const roundInfoRes = roundInfoCalls.length
                    ? await runMulticallSync(
                          publicClient,
                          roundInfoCalls as SyncMulticallInput[]
                      )
                    : { data: undefined };
                const roundInfos =
                    (roundInfoRes.data?.getOracleRoundInfo as
                        | [bigint, boolean][]
                        | undefined) ?? [];
                selectedInCurrentRound = pairs.map(
                    (_pair, i) => roundInfos[i]?.[1] ?? false
                );
            }

            return pairs.map((pairRaw, i) => ({
                pairRaw,
                pairName: hexToString(pairRaw, { size: 32 }),
                isSubscribed: !!subscribed[i],
                price: priceInfos[i]?.[0] ?? 0n,
                priceIsValid: priceInfos[i]?.[1] ?? false,
                coinPairPriceAddress: coinPairPriceAddresses[i],
                subscribedCount: Number(subscribedCounts[i] ?? 0n),
                maxSubscribedOracles: Number(maxSubscribedCounts[i] ?? 0n),
                isSelectedInCurrentRound: !!selectedInCurrentRound[i],
                isPriceContract: isPriceContract[i],
            }));
        },
    });

    return {
        data: data ?? [],
        isLoading,
        isFetching,
        error,
        refetch,
    };
}
