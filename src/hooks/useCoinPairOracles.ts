import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { readContract } from "viem/actions";

import { runMulticallSync } from "../backend/runMulticallSync";
import CoinPairPrice from "../contracts/omoc/CoinPairPrice.json";
import type { Address, CallRequest, SyncMulticallInput } from "../types/hooks";
import type { RegisteredOracleInfo } from "./useRegisteredOracles";

const ABI_CoinPairPrice = CoinPairPrice.abi as readonly unknown[];

export interface CoinPairOracleInfo {
    owner: Address;
    oracleAddr: Address;
    url: string;
    points: bigint;
    selectedInCurrentRound: boolean;
    // Consecutive rounds without a valid signature — reaching
    // maxMissedSigRounds triggers automatic unsubscription.
    missedSignatureRounds: bigint;
}

export interface CoinPairRoundInfo {
    round: bigint;
    // Timestamp after which the round is ready to switch — i.e. the round's
    // effective end (see RoundInfoLib.isReadyToSwitch on-chain).
    lockPeriodTimestamp: bigint;
    // How many oracles are actually selected to participate in this round —
    // the top-stake subset of subscribedOracles, capped at maxOraclesPerRound.
    selectedCount: number;
    maxOraclesPerRound: bigint;
}

export interface CoinPairOraclesData {
    oracles: CoinPairOracleInfo[];
    roundInfo: CoinPairRoundInfo | null;
    // A value of 0 means auto-unsubscribe is disabled for this pair.
    maxMissedSigRounds: bigint;
    // Reward token balance held by this coin pair's contract, pending
    // distribution to oracles (RoundManager.getAvailableRewardFees).
    availableRewardFees: bigint;
}

/**
 * For a single coin pair's CoinPairPrice contract, reads which oracle owners
 * are currently subscribed, their round info (points, whether selected in
 * the current round), and the pair's current round number/lock-period end.
 * Owner -> oracleAddr/url is looked up from the already fetched
 * registered-oracles list rather than re-reading it here.
 *
 * Meant to be used on-demand (e.g. an "Explore" action on a single row),
 * hence the plain address param instead of wiring through Wallet context.
 */
export function useCoinPairOracles(
    publicClient: PublicClient | undefined,
    coinPairPriceAddress: Address | undefined,
    registeredOracles: RegisteredOracleInfo[],
    refetchInterval = 30_000
) {
    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ["coinPairOracles", coinPairPriceAddress],
        enabled: !!publicClient && !!coinPairPriceAddress,
        refetchInterval,
        queryFn: async (): Promise<CoinPairOraclesData> => {
            if (!publicClient || !coinPairPriceAddress) {
                return {
                    oracles: [],
                    roundInfo: null,
                    maxMissedSigRounds: 0n,
                    availableRewardFees: 0n,
                };
            }

            const contract = {
                address: coinPairPriceAddress,
                abi: ABI_CoinPairPrice,
            };

            const [
                len,
                roundInfoRaw,
                maxMissedSigRounds,
                availableRewardFees,
                maxOraclesPerRound,
            ] = await Promise.all([
                readContract(publicClient, {
                    address: coinPairPriceAddress,
                    abi: ABI_CoinPairPrice,
                    functionName: "getSubscribedOraclesLen",
                    args: [],
                }) as Promise<bigint>,
                readContract(publicClient, {
                    address: coinPairPriceAddress,
                    abi: ABI_CoinPairPrice,
                    functionName: "getRoundInfo",
                    args: [],
                }) as Promise<
                    [bigint, bigint, bigint, bigint, Address[], Address[]]
                >,
                readContract(publicClient, {
                    address: coinPairPriceAddress,
                    abi: ABI_CoinPairPrice,
                    functionName: "getMaxMissedSigRounds",
                    args: [],
                }) as Promise<bigint>,
                readContract(publicClient, {
                    address: coinPairPriceAddress,
                    abi: ABI_CoinPairPrice,
                    functionName: "getAvailableRewardFees",
                    args: [],
                }) as Promise<bigint>,
                readContract(publicClient, {
                    address: coinPairPriceAddress,
                    abi: ABI_CoinPairPrice,
                    functionName: "maxOraclesPerRound",
                    args: [],
                }) as Promise<bigint>,
            ]);

            const roundInfo: CoinPairRoundInfo = {
                round: roundInfoRaw[0],
                lockPeriodTimestamp: roundInfoRaw[2],
                selectedCount: roundInfoRaw[4].length,
                maxOraclesPerRound,
            };

            const subscribedLen = Number(len);
            if (subscribedLen <= 0) {
                return {
                    oracles: [],
                    roundInfo,
                    maxMissedSigRounds,
                    availableRewardFees,
                };
            }

            const ownerCalls: CallRequest[] = [];
            for (let i = 0; i < subscribedLen; i++) {
                ownerCalls.push({
                    contract,
                    functionName: "getSubscribedOracleAtIndex",
                    args: [i],
                    resultType: "address",
                    keys: ["getSubscribedOracleAtIndex", i],
                });
            }
            const ownerRes = await runMulticallSync(
                publicClient,
                ownerCalls as SyncMulticallInput[]
            );
            const owners =
                (ownerRes.data?.getSubscribedOracleAtIndex as
                    | Address[]
                    | undefined) ?? [];

            const roundInfoCalls: CallRequest[] = owners.map((owner, i) => ({
                contract,
                functionName: "getOracleRoundInfo",
                args: [owner],
                resultType: [
                    { type: "uint256", name: "points" },
                    { type: "bool", name: "selectedInCurrentRound" },
                ],
                keys: ["getOracleRoundInfo", i],
            }));
            const oracleRoundInfoRes = roundInfoCalls.length
                ? await runMulticallSync(
                      publicClient,
                      roundInfoCalls as SyncMulticallInput[]
                  )
                : { data: undefined };
            const oracleRoundInfos =
                (oracleRoundInfoRes.data?.getOracleRoundInfo as
                    | [bigint, boolean][]
                    | undefined) ?? [];

            const missedRoundsCalls: CallRequest[] = owners.map(
                (owner, i) => ({
                    contract,
                    functionName: "getMissedSignatureRounds",
                    args: [owner],
                    resultType: "uint256",
                    keys: ["getMissedSignatureRounds", i],
                })
            );
            const missedRoundsRes = missedRoundsCalls.length
                ? await runMulticallSync(
                      publicClient,
                      missedRoundsCalls as SyncMulticallInput[]
                  )
                : { data: undefined };
            const missedRounds =
                (missedRoundsRes.data?.getMissedSignatureRounds as
                    | bigint[]
                    | undefined) ?? [];

            const registeredByOwner = new Map(
                registeredOracles.map((oracle) => [
                    oracle.owner.toLowerCase(),
                    oracle,
                ])
            );

            const oracles = owners.map((owner, i) => {
                const registered = registeredByOwner.get(owner.toLowerCase());
                return {
                    owner,
                    oracleAddr: registered?.oracleAddr ?? owner,
                    url: registered?.url ?? "",
                    points: oracleRoundInfos[i]?.[0] ?? 0n,
                    selectedInCurrentRound:
                        oracleRoundInfos[i]?.[1] ?? false,
                    missedSignatureRounds: missedRounds[i] ?? 0n,
                };
            });

            return { oracles, roundInfo, maxMissedSigRounds, availableRewardFees };
        },
    });

    return {
        data: data?.oracles ?? [],
        roundInfo: data?.roundInfo ?? null,
        maxMissedSigRounds: data?.maxMissedSigRounds ?? 0n,
        availableRewardFees: data?.availableRewardFees ?? 0n,
        isLoading,
        isFetching,
        error,
        refetch,
    };
}
