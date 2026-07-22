// Pure helpers backing moc-v1's Liquidity Mining page — ported from the old
// dapp's src/helpers/helper.jsx (getRewardedToday, StatusReward) and
// src/components/Cards/MocLiquidity's daily-date/claimed-today check.
import { normalizeToBigInt, WAD,wadDiv, wadMul } from "./precision";

// Claiming isn't a normal token transfer: it's a tiny, fixed-value native
// coin "signal" transfer to the backend's agent address (see useIncentives'
// useIncentivesAgent). The agent watches for it and pays out the real MOC
// reward off-chain. Value is fixed by the backend's expectations, not by
// the user's actual claimable amount — mirrors the old dapp's MocLiquidity
// claimRewards() exactly (which also ignores incentiveState.gas_cost).
export const AGENT_SIGNAL_VALUE_WEI = 10000000000000n;

export interface RewardedTodayV1 {
    toGetToday: bigint; // WAD-scaled MOC
    toGetNow: bigint; // WAD-scaled MOC
    timeLeftSeconds: number;
}

// value is a positive multiplier < 1, applied in WAD space as a plain ratio.
const DAILY_ACCRUAL_SHARE = (6n * WAD) / 10n; // 0.6, matches the old dapp's formula

/**
 * Estimates today's accrued (not-yet-claimable) MOC reward from the backend's
 * daily accrual figures, pro-rated by the user's share of total BPro and by
 * how much of "today" (UTC, backend settles at 01:00 UTC) has elapsed.
 * Mirrors the old dapp's getRewardedToday(daily_moc, userBproBalance,
 * total_bpro, end_block_dt) 1:1, in WAD-scaled bigint instead of BigNumber.
 */
export function getRewardedTodayV1(
    dailyMoc: bigint,
    userBproBalance: bigint,
    totalBpro: bigint,
    endBlockDt: number
): RewardedTodayV1 {
    if (dailyMoc <= 0n || totalBpro <= 0n) {
        return { toGetToday: 0n, toGetNow: 0n, timeLeftSeconds: 0 };
    }

    const start = new Date(endBlockDt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const dayDiff = Math.round(
        (tomorrow.getTime() - start.getTime()) / (1000 * 24 * 60 * 60)
    );

    tomorrow.setUTCHours(1, 0, 0, 0);
    const settlementDiffSeconds = Math.round(
        (tomorrow.getTime() - start.getTime()) / 1000
    );
    const timeLeftSeconds = (tomorrow.getTime() - now.getTime()) / 1000;

    const perBproShare = wadDiv(wadMul(dailyMoc, userBproBalance), totalBpro);
    const toGetToday = wadMul(
        perBproShare * BigInt(Math.max(dayDiff, 0)),
        DAILY_ACCRUAL_SHARE
    );

    const elapsedSeconds = settlementDiffSeconds - timeLeftSeconds;
    const toGetNow =
        settlementDiffSeconds > 0
            ? (toGetToday * BigInt(Math.max(Math.round(elapsedSeconds), 0))) /
              BigInt(settlementDiffSeconds)
            : 0n;

    return { toGetToday, toGetNow, timeLeftSeconds };
}

export type IncentiveClaimStatus =
    | "sent"
    | "confirming"
    | "processing"
    | "failed"
    | "unknown";

// Mirrors the old dapp's StatusReward({state, result}) mapping.
export function claimStatus(
    state: string | undefined,
    result: string | undefined
): IncentiveClaimStatus {
    if (result === "ok" && state === "complete") return "sent";
    if (!result && state === "new") return "confirming";
    if (!result && (state === "confirmed" || state === "sent"))
        return "processing";
    if (result && result !== "ok") return "failed";
    return "unknown";
}

export interface IncentiveClaimRecord {
    mocs: bigint;
    creationUnix: number;
    state?: string;
    result?: string;
    sentHash?: string;
    hash?: string;
    gasCost: bigint;
}

export interface RawIncentiveClaim {
    mocs?: string | number;
    creation?: number;
    state?: string;
    result?: string;
    sent_hash?: string | null;
    hash?: string | null;
    value?: string | number;
}

export function parseIncentiveClaim(
    raw: RawIncentiveClaim
): IncentiveClaimRecord {
    return {
        mocs: normalizeToBigInt(raw.mocs) ?? 0n,
        creationUnix: raw.creation ?? 0,
        state: raw.state,
        result: raw.result,
        sentHash: raw.sent_hash ?? undefined,
        hash: raw.hash ?? undefined,
        gasCost: normalizeToBigInt(raw.value) ?? 0n,
    };
}

// The backend settles claims per UTC-less local calendar day, same as the
// old dapp's enableClaim (compares MM/DD/YYYY in the browser's locale).
export function hasClaimedToday(claims: IncentiveClaimRecord[]): boolean {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    return claims.some((claim) => {
        const d = new Date(claim.creationUnix * 1000);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
    });
}
