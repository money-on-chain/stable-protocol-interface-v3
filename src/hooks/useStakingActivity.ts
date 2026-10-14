import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
    buildStakingActivity,
    type RawStakingOperation,
    type StakingActivity,
} from "../helpers/stakingActivity";
import api from "../services/api";
import { API_OPERATIONS_BASE, apiOperationsUrl } from "../services/apiConfig";

type RawStakingOperationsResponse = {
    results: RawStakingOperation[];
    total: number;
};

// The API caps limit at 100. Fetch that single page and paginate in the
// table: grouping the rows of one tx needs both halves of each pair, which a
// small server-side page could split.
const FETCH_LIMIT = 100;

export interface StakingActivityResult {
    activity: StakingActivity[];
    isError: boolean;
    isLoading: boolean;
}

export function useStakingActivity(
    stakerAddress: string | undefined
): StakingActivityResult {
    const {
        data: rows,
        isError,
        isLoading,
    } = useQuery({
        queryKey: ["stakingOperations", stakerAddress?.toLowerCase()],
        enabled: !!stakerAddress && !!API_OPERATIONS_BASE,
        refetchInterval: 30_000,
        queryFn: async () => {
            const url = apiOperationsUrl("omoc/staking_operations/");
            url.search = new URLSearchParams({
                address: stakerAddress!,
                limit: String(FETCH_LIMIT),
                skip: "0",
            }).toString();
            const response = (await api<RawStakingOperationsResponse>(
                "get",
                url.toString()
            )) as RawStakingOperationsResponse;
            return response.results ?? [];
        },
    });

    const activity = useMemo(() => buildStakingActivity(rows ?? []), [rows]);

    return { activity, isError, isLoading: isLoading && !!stakerAddress };
}
