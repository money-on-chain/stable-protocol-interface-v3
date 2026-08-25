import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { hexToString } from "viem";
import { readContract } from "viem/actions";

import { runMulticallSync } from "../backend/runMulticallSync";
import type { Address, CallRequest, DContracts, SyncMulticallInput } from "../types/hooks";

export interface OracleCoinPairInfo {
    // bytes32, passed back as-is to subscribeToCoinPair/unSubscribeFromCoinPair
    pairRaw: `0x${string}`;
    pairName: string;
    isSubscribed: boolean;
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

            return pairs.map((pairRaw, i) => ({
                pairRaw,
                pairName: hexToString(pairRaw, { size: 32 }),
                isSubscribed: !!subscribed[i],
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
