import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { getBlock } from "viem/actions";

import { runMulticallSync } from "../backend/runMulticallSync";
import CoinPairPrice from "../contracts/omoc/CoinPairPrice.json";
import type {
    Address,
    CallRequest,
    ContractInfo,
    SyncMulticallInput,
} from "../types/hooks";
import type { RegisteredOracleInfo } from "./useRegisteredOracles";

const ABI_CoinPairPrice = CoinPairPrice.abi as readonly unknown[];

export interface CoinPairOracleInfo {
    owner: Address;
    oracleAddr: Address;
    url: string;
    // Looked up from the registeredOracles list passed in, not re-read here.
    stake: bigint;
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
    // Sum of points accumulated by selected oracles so far in this round —
    // the denominator used to split availableRewardFees on round close.
    totalPoints: bigint;
}

export interface CoinPairPriceStatus {
    isValid: boolean;
    // Seconds elapsed since the last price publication, or null if the
    // price has never been published.
    lastPublishedAgoSeconds: number | null;
    // Estimated seconds until the price is considered stale (negative if
    // already expired), or null if never published. validPricePeriodInBlocks
    // is a block count on-chain, not a duration — there's no fixed RSK
    // block-time constant, so this converts it to wall-clock time using the
    // average block time actually observed between the publication block and
    // the current block (falls back to an assumed 30s/block only when both
    // blocks are the same, i.e. published this same block).
    expiresInSeconds: number | null;
}

const FALLBACK_BLOCK_TIME_SECONDS = 30;

export interface CoinPairOraclesData {
    oracles: CoinPairOracleInfo[];
    roundInfo: CoinPairRoundInfo | null;
    // A value of 0 means auto-unsubscribe is disabled for this pair.
    maxMissedSigRounds: bigint;
    // Reward token balance held by this coin pair's contract, pending
    // distribution to oracles (RoundManager.getAvailableRewardFees).
    availableRewardFees: bigint;
    priceStatus: CoinPairPriceStatus;
}

const emptyPriceStatus: CoinPairPriceStatus = {
    isValid: false,
    lastPublishedAgoSeconds: null,
    expiresInSeconds: null,
};

/**
 * For a single coin pair's CoinPairPrice contract, reads which oracle owners
 * are currently subscribed, their round info (points, whether selected in
 * the current round), and the pair's current round number/lock-period end.
 * Owner -> oracleAddr/url is looked up from the already fetched
 * registered-oracles list rather than re-reading it here.
 *
 * Not every registered "coin pair" is backed by a real CoinPairPrice contract
 * (see isPriceContract on useOracleCoinPairs' OracleCoinPairInfo — e.g.
 * "TASKSRUNNER" points at an automation TasksRunner contract instead). When
 * the CoinPairPrice-shaped reads fail, this falls back to a StakingMachine-
 * only view: which of the registered oracles are subscribed to this pair
 * (StakingMachine.isSubscribed), with no round/price/reward data — hence the
 * extra stakingMachine/pairRaw params, only needed for that fallback.
 *
 * Meant to be used on-demand (e.g. an "Explore" action on a single row),
 * hence the plain address param instead of wiring through Wallet context.
 */
export function useCoinPairOracles(
    publicClient: PublicClient | undefined,
    coinPairPriceAddress: Address | undefined,
    registeredOracles: RegisteredOracleInfo[],
    stakingMachine?: ContractInfo,
    pairRaw?: `0x${string}`,
    refetchInterval = 30_000
) {
    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ["coinPairOracles", coinPairPriceAddress, pairRaw],
        enabled: !!publicClient && !!coinPairPriceAddress,
        refetchInterval,
        queryFn: async (): Promise<CoinPairOraclesData> => {
            if (!publicClient || !coinPairPriceAddress) {
                return {
                    oracles: [],
                    roundInfo: null,
                    maxMissedSigRounds: 0n,
                    availableRewardFees: 0n,
                    priceStatus: emptyPriceStatus,
                };
            }

            const contract = {
                address: coinPairPriceAddress,
                abi: ABI_CoinPairPrice,
            };

            const [multicallResults, currentBlock] = await Promise.all([
                publicClient.multicall({
                    contracts: [
                        {
                            ...contract,
                            functionName: "getSubscribedOraclesLen",
                            args: [],
                        },
                        { ...contract, functionName: "getRoundInfo", args: [] },
                        {
                            ...contract,
                            functionName: "getMaxMissedSigRounds",
                            args: [],
                        },
                        {
                            ...contract,
                            functionName: "getAvailableRewardFees",
                            args: [],
                        },
                        {
                            ...contract,
                            functionName: "maxOraclesPerRound",
                            args: [],
                        },
                        { ...contract, functionName: "getPriceInfo", args: [] },
                        {
                            ...contract,
                            functionName: "getValidPricePeriodInBlocks",
                            args: [],
                        },
                    ],
                    allowFailure: true,
                }),
                getBlock(publicClient),
            ]);

            const [
                lenResult,
                roundInfoResult,
                maxMissedSigRoundsResult,
                availableRewardFeesResult,
                maxOraclesPerRoundResult,
                priceInfoResult,
                validPricePeriodInBlocksResult,
            ] = multicallResults;

            // getSubscribedOraclesLen/getRoundInfo live on RoundManager, the
            // base every coin-pair-registered contract shares — including
            // non-price ones like TASKSRUNNER's TasksRunner contract (it
            // extends RoundManager too, just without CoinPairPrice's price
            // publishing on top). So round/reward/subscribed-oracle data is
            // genuinely available for those; only getPriceInfo (defined on
            // CoinPairPrice itself, not RoundManager) isn't. Only fall back
            // to a StakingMachine-only view when even the RoundManager-level
            // calls fail, i.e. the address isn't a RoundManager at all.
            if (
                lenResult.status !== "success" ||
                roundInfoResult.status !== "success"
            ) {
                if (!stakingMachine || !pairRaw) {
                    return {
                        oracles: [],
                        roundInfo: null,
                        maxMissedSigRounds: 0n,
                        availableRewardFees: 0n,
                        priceStatus: emptyPriceStatus,
                    };
                }

                const subscribedCalls: CallRequest[] = registeredOracles.map(
                    (oracle, i) => ({
                        contract: stakingMachine,
                        functionName: "isSubscribed",
                        args: [oracle.owner, pairRaw],
                        resultType: "bool",
                        keys: ["isSubscribed", i],
                    })
                );
                const subscribedRes = subscribedCalls.length
                    ? await runMulticallSync(
                          publicClient,
                          subscribedCalls as SyncMulticallInput[]
                      )
                    : { data: undefined };
                const subscribedFlags =
                    (subscribedRes.data?.isSubscribed as
                        | boolean[]
                        | undefined) ?? [];

                const oracles: CoinPairOracleInfo[] = registeredOracles
                    .filter((_oracle, i) => subscribedFlags[i])
                    .map((oracle) => ({
                        owner: oracle.owner,
                        oracleAddr: oracle.oracleAddr,
                        url: oracle.url,
                        stake: oracle.stake,
                        points: 0n,
                        selectedInCurrentRound: false,
                        missedSignatureRounds: 0n,
                    }));

                return {
                    oracles,
                    roundInfo: null,
                    maxMissedSigRounds: 0n,
                    availableRewardFees: 0n,
                    priceStatus: emptyPriceStatus,
                };
            }

            const len =
                lenResult.status === "success"
                    ? (lenResult.result as bigint)
                    : 0n;
            const roundInfoRaw: [
                bigint,
                bigint,
                bigint,
                bigint,
                Address[],
                Address[],
            ] =
                roundInfoResult.status === "success"
                    ? (roundInfoResult.result as [
                          bigint,
                          bigint,
                          bigint,
                          bigint,
                          Address[],
                          Address[],
                      ])
                    : [0n, 0n, 0n, 0n, [], []];
            const maxMissedSigRounds =
                maxMissedSigRoundsResult.status === "success"
                    ? (maxMissedSigRoundsResult.result as bigint)
                    : 0n;
            const availableRewardFees =
                availableRewardFeesResult.status === "success"
                    ? (availableRewardFeesResult.result as bigint)
                    : 0n;
            const maxOraclesPerRound =
                maxOraclesPerRoundResult.status === "success"
                    ? (maxOraclesPerRoundResult.result as bigint)
                    : 0n;
            // CoinPairPrice-only (not on RoundManager) — genuinely absent for
            // non-price registrations like TASKSRUNNER, so priceStatus below
            // degrades to emptyPriceStatus for those rather than failing.
            const priceInfoRaw: [bigint, boolean, bigint] =
                priceInfoResult.status === "success"
                    ? (priceInfoResult.result as [bigint, boolean, bigint])
                    : [0n, false, 0n];
            const validPricePeriodInBlocks =
                validPricePeriodInBlocksResult.status === "success"
                    ? (validPricePeriodInBlocksResult.result as bigint)
                    : 0n;

            const roundInfo: CoinPairRoundInfo = {
                round: roundInfoRaw[0],
                lockPeriodTimestamp: roundInfoRaw[2],
                selectedCount: roundInfoRaw[4].length,
                maxOraclesPerRound,
                totalPoints: roundInfoRaw[3],
            };

            const [, priceIsValid, lastPublicationBlock] = priceInfoRaw;
            let lastPublishedAgoSeconds: number | null = null;
            let expiresInSeconds: number | null = null;

            if (lastPublicationBlock > 0n) {
                const publishedBlock =
                    lastPublicationBlock === currentBlock.number
                        ? currentBlock
                        : await getBlock(publicClient, {
                              blockNumber: lastPublicationBlock,
                          });

                const lastPublishedAt = publishedBlock.timestamp;
                lastPublishedAgoSeconds = Number(
                    currentBlock.timestamp - lastPublishedAt
                );

                const blockDelta = currentBlock.number - lastPublicationBlock;
                const avgBlockTimeSeconds =
                    blockDelta > 0n
                        ? Number(currentBlock.timestamp - lastPublishedAt) /
                          Number(blockDelta)
                        : FALLBACK_BLOCK_TIME_SECONDS;

                const expiresAtSeconds =
                    Number(lastPublishedAt) +
                    Number(validPricePeriodInBlocks) * avgBlockTimeSeconds;
                expiresInSeconds = Math.round(
                    expiresAtSeconds - Number(currentBlock.timestamp)
                );
            }

            const priceStatus: CoinPairPriceStatus = {
                isValid: priceIsValid,
                lastPublishedAgoSeconds,
                expiresInSeconds,
            };

            const subscribedLen = Number(len);
            if (subscribedLen <= 0) {
                return {
                    oracles: [],
                    roundInfo,
                    maxMissedSigRounds,
                    availableRewardFees,
                    priceStatus,
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
                    stake: registered?.stake ?? 0n,
                    points: oracleRoundInfos[i]?.[0] ?? 0n,
                    selectedInCurrentRound:
                        oracleRoundInfos[i]?.[1] ?? false,
                    missedSignatureRounds: missedRounds[i] ?? 0n,
                };
            });

            return {
                oracles,
                roundInfo,
                maxMissedSigRounds,
                availableRewardFees,
                priceStatus,
            };
        },
    });

    return {
        data: data?.oracles ?? [],
        roundInfo: data?.roundInfo ?? null,
        maxMissedSigRounds: data?.maxMissedSigRounds ?? 0n,
        availableRewardFees: data?.availableRewardFees ?? 0n,
        priceStatus: data?.priceStatus ?? emptyPriceStatus,
        isLoading,
        isFetching,
        error,
        refetch,
    };
}
