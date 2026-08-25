import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { hexToString } from "viem";
import { getBalance, readContract } from "viem/actions";

import { runMulticallSync } from "../backend/runMulticallSync";
import CoinPairPrice from "../contracts/omoc/CoinPairPrice.json";
import type {
    Address,
    CallRequest,
    DContracts,
    SyncMulticallInput,
} from "../types/hooks";

const ABI_CoinPairPrice = CoinPairPrice.abi as readonly unknown[];

export interface RegisteredOracleInfo {
    owner: Address;
    oracleAddr: Address;
    url: string;
    stake: bigint;
    // Native coin (RBTC) balance of the oracle address — what it pays gas
    // with when publishing prices. Not a contract call, so it can't be
    // batched through the ABI-based multicall like the rest of this hook.
    gas: bigint;
    subscribedPairs: string[];
}

/**
 * Reads every registered oracle from StakingMachine (owner, oracle address,
 * URL, stake) and, for each coin pair, which owners are currently subscribed
 * to it (CoinPairPrice.getSubscribedOraclesLen/getSubscribedOracleAtIndex),
 * merging both into a single flat list for display.
 *
 * All the list lengths involved (oracle count, coin pair count, subscribed
 * oracles per pair) are only known at read time, so this runs as a sequential
 * imperative multicall inside a single useQuery, same style as
 * useOracleCoinPairs.ts.
 */
export function useRegisteredOracles(
    publicClient: PublicClient | undefined,
    contracts: DContracts | null | undefined,
    refetchInterval = 30_000
) {
    const stakingMachine = contracts?.StakingMachine;

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ["registeredOracles", stakingMachine?.address],
        enabled: !!publicClient && !!stakingMachine,
        refetchInterval,
        queryFn: async (): Promise<RegisteredOracleInfo[]> => {
            if (!publicClient || !stakingMachine) return [];

            const oracleCount = (await readContract(publicClient, {
                address: stakingMachine.address,
                abi: stakingMachine.abi,
                functionName: "getRegisteredOraclesLen",
                args: [],
            })) as bigint;

            const oracleLen = Number(oracleCount);
            if (oracleLen <= 0) return [];

            const oracleCalls: CallRequest[] = [];
            for (let i = 0; i < oracleLen; i++) {
                oracleCalls.push({
                    contract: stakingMachine,
                    functionName: "getRegisteredOracleAtIndex",
                    args: [i],
                    resultType: [
                        { type: "address", name: "ownerAddr" },
                        { type: "address", name: "oracleAddr" },
                        { type: "string", name: "url" },
                    ],
                    keys: ["getRegisteredOracleAtIndex", i],
                });
            }
            const oracleRes = await runMulticallSync(
                publicClient,
                oracleCalls as SyncMulticallInput[]
            );
            const oracleRows =
                (oracleRes.data?.getRegisteredOracleAtIndex as
                    | [Address, Address, string][]
                    | undefined) ?? [];

            const stakeCalls: CallRequest[] = oracleRows.map((row, i) => ({
                contract: stakingMachine,
                functionName: "getBalance",
                args: [row[0]],
                resultType: "uint256",
                keys: ["getBalance", i],
            }));
            const stakeRes = stakeCalls.length
                ? await runMulticallSync(
                      publicClient,
                      stakeCalls as SyncMulticallInput[]
                  )
                : { data: undefined };
            const stakes =
                (stakeRes.data?.getBalance as bigint[] | undefined) ?? [];

            const gasBalances = await Promise.all(
                oracleRows.map(([, oracleAddr]) =>
                    getBalance(publicClient, { address: oracleAddr }).catch(
                        () => 0n
                    )
                )
            );

            const pairCount = (await readContract(publicClient, {
                address: stakingMachine.address,
                abi: stakingMachine.abi,
                functionName: "getCoinPairCount",
                args: [],
            })) as bigint;

            const pairLen = Number(pairCount);
            const pairCalls: CallRequest[] = [];
            for (let i = 0; i < pairLen; i++) {
                pairCalls.push({
                    contract: stakingMachine,
                    functionName: "getCoinPairAtIndex",
                    args: [i],
                    resultType: "bytes32",
                    keys: ["getCoinPairAtIndex", i],
                });
            }
            const pairRes = pairLen
                ? await runMulticallSync(
                      publicClient,
                      pairCalls as SyncMulticallInput[]
                  )
                : { data: undefined };
            const pairsRaw =
                (pairRes.data?.getCoinPairAtIndex as
                    | `0x${string}`[]
                    | undefined) ?? [];
            const pairNames = pairsRaw.map((pair) =>
                hexToString(pair, { size: 32 })
            );

            const addressCalls: CallRequest[] = pairsRaw.map((pair, i) => ({
                contract: stakingMachine,
                functionName: "getContractAddress",
                args: [pair],
                resultType: "address",
                keys: ["getContractAddress", i],
            }));
            const addressRes = pairsRaw.length
                ? await runMulticallSync(
                      publicClient,
                      addressCalls as SyncMulticallInput[]
                  )
                : { data: undefined };
            const coinPairPriceAddresses =
                (addressRes.data?.getContractAddress as
                    | Address[]
                    | undefined) ?? [];

            const subLenCalls: CallRequest[] = coinPairPriceAddresses.map(
                (address, i) => ({
                    contract: { address, abi: ABI_CoinPairPrice },
                    functionName: "getSubscribedOraclesLen",
                    args: [],
                    resultType: "uint256",
                    keys: ["getSubscribedOraclesLen", i],
                })
            );
            const subLenRes = subLenCalls.length
                ? await runMulticallSync(
                      publicClient,
                      subLenCalls as SyncMulticallInput[]
                  )
                : { data: undefined };
            const subLens =
                (subLenRes.data?.getSubscribedOraclesLen as
                    | bigint[]
                    | undefined) ?? [];

            const subIndexCalls: CallRequest[] = [];
            coinPairPriceAddresses.forEach((address, pairIdx) => {
                const subscribedLen = Number(subLens[pairIdx] ?? 0n);
                for (let idx = 0; idx < subscribedLen; idx++) {
                    subIndexCalls.push({
                        contract: { address, abi: ABI_CoinPairPrice },
                        functionName: "getSubscribedOracleAtIndex",
                        args: [idx],
                        resultType: "address",
                        keys: ["getSubscribedOracleAtIndex", pairIdx, idx],
                    });
                }
            });
            const subIndexRes = subIndexCalls.length
                ? await runMulticallSync(
                      publicClient,
                      subIndexCalls as SyncMulticallInput[]
                  )
                : { data: undefined };
            const subOwnersByPair =
                (subIndexRes.data?.getSubscribedOracleAtIndex as
                    | (Address[] | undefined)[]
                    | undefined) ?? [];

            const subscriptionsByOwner = new Map<string, string[]>();
            subOwnersByPair.forEach((owners, pairIdx) => {
                (owners ?? []).forEach((owner) => {
                    const key = owner.toLowerCase();
                    const list = subscriptionsByOwner.get(key) ?? [];
                    list.push(pairNames[pairIdx]);
                    subscriptionsByOwner.set(key, list);
                });
            });

            return oracleRows.map(([owner, oracleAddr, url], i) => ({
                owner,
                oracleAddr,
                url,
                stake: stakes[i] ?? 0n,
                gas: gasBalances[i] ?? 0n,
                subscribedPairs:
                    subscriptionsByOwner.get(owner.toLowerCase()) ?? [],
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
