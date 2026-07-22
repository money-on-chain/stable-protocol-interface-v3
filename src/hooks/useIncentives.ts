import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { IncentiveClaimRecord, RawIncentiveClaim } from "../helpers/incentives";
import { parseIncentiveClaim } from "../helpers/incentives";
import { normalizeToBigInt } from "../helpers/precision";
import api from "../services/api";
import { API_INCENTIVES_BASE } from "../services/apiConfig";

// moc-v1's Liquidity Mining rewards — a centralized, backend-computed daily
// MOC accrual paid out by an off-chain "agent" relayer (no on-chain reward
// contract), ported 1:1 from the old dapp's src/components/Cards/MocLiquidity
// and src/components/Tables/Claims. See helpers/incentives.ts for the
// accrual/status math.

interface RawAgent {
    agent_address?: string;
    gas_cost?: string | number;
}

export interface IncentivesAgent {
    agentAddress: string;
    gasCost: bigint;
}

export function useIncentivesAgent() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["incentivesAgent"],
        enabled: !!API_INCENTIVES_BASE,
        refetchInterval: 60_000,
        queryFn: async (): Promise<IncentivesAgent> => {
            const response = (await api<RawAgent>(
                "get",
                `${API_INCENTIVES_BASE}agent/`
            )) as RawAgent;
            return {
                agentAddress: response.agent_address ?? "",
                gasCost: normalizeToBigInt(response.gas_cost) ?? 0n,
            };
        },
    });

    return { data, isLoading, error };
}

interface RawBalance {
    moc_balance?: string | number;
    daily_moc?: string | number;
    total_bpro?: string | number;
    end_block_dt?: number;
}

export interface IncentivesBalance {
    mocBalance: bigint;
    dailyMoc: bigint;
    totalBpro: bigint;
    endBlockDt: number;
}

export function useIncentivesBalance(userAddress: string | undefined) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["incentivesBalance", userAddress],
        enabled: !!API_INCENTIVES_BASE && !!userAddress,
        refetchInterval: 30_000,
        queryFn: async (): Promise<IncentivesBalance> => {
            const response = (await api<RawBalance>(
                "get",
                `${API_INCENTIVES_BASE}balance/${userAddress}`
            )) as RawBalance;
            return {
                mocBalance: normalizeToBigInt(response.moc_balance) ?? 0n,
                dailyMoc: normalizeToBigInt(response.daily_moc) ?? 0n,
                totalBpro: normalizeToBigInt(response.total_bpro) ?? 0n,
                endBlockDt: response.end_block_dt ?? 0,
            };
        },
    });

    return { data, isLoading, error, refetch };
}

interface IncentivesClaimsPage {
    claims: IncentiveClaimRecord[];
    hasNextPage: boolean;
}

export function useIncentivesClaims(
    userAddress: string | undefined,
    page: number,
    pageSize: number
) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["incentivesClaims", userAddress, page, pageSize],
        enabled: !!API_INCENTIVES_BASE && !!userAddress,
        refetchInterval: 30_000,
        queryFn: async (): Promise<IncentivesClaimsPage> => {
            const skip = (page - 1) * pageSize;
            const response = await api<RawIncentiveClaim[]>(
                "get",
                `${API_INCENTIVES_BASE}claims/${userAddress}`,
                { limit: pageSize, skip }
            );
            const rows = Array.isArray(response) ? response : [];
            const claims = rows
                .map(parseIncentiveClaim)
                .sort((a, b) => b.creationUnix - a.creationUnix);
            return { claims, hasNextPage: rows.length === pageSize };
        },
    });

    return useMemo(
        () => ({
            claims: data?.claims ?? [],
            hasNextPage: data?.hasNextPage ?? false,
            isLoading,
            error,
            refetch,
        }),
        [data, isLoading, error, refetch]
    );
}
