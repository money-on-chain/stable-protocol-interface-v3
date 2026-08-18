import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export type LiquidationRecord = {
    acSeized: bigint;
    tpPaid: bigint;
};

// keyed by `${tpTokenAddress.toLowerCase()}-${mocBucketAddress.toLowerCase()}`
export type LiquidationHistoryMap = Map<string, LiquidationRecord>;

type RawLiquidateRow = {
    tpToken?: string | null;
    mocBucket?: string | null;
    acSwapped?: string | null;
    tpPaid?: string | null;
    isComplete?: boolean | null;
};

type RawLiquidateResponse = {
    rows: RawLiquidateRow[];
};

export function useLiquidationHistory(
    userAddress: string | undefined
): LiquidationHistoryMap {
    const apiBase = import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS as
        | string
        | undefined;

    const { data: rows } = useQuery({
        queryKey: ["lendingLiquidations", userAddress],
        enabled: !!userAddress && !!apiBase,
        refetchInterval: 60_000,
        queryFn: async () => {
            const url = new URL(String(apiBase));
            url.pathname = "/v1/lending/liquidations/";
            url.searchParams.set("user", userAddress!);
            url.searchParams.set("limit", "1000");
            const response = await axios.get<RawLiquidateResponse>(
                url.toString(),
                { timeout: 10_000 }
            );
            if (response.status !== 200) throw new Error("API error");
            return response.data.rows;
        },
    });

    return useMemo(() => {
        if (!rows?.length) return new Map();

        // API returns newest-first. For each vault pair, take the first row
        // with isComplete=true — that is the most recent completed liquidation.
        const result = new Map<string, LiquidationRecord>();
        for (const row of rows) {
            if (!row.tpToken || !row.mocBucket || !row.isComplete) continue;
            const key = `${row.tpToken.toLowerCase()}-${row.mocBucket.toLowerCase()}`;
            if (result.has(key)) continue; // already captured the most recent one
            result.set(key, {
                acSeized: BigInt(row.acSwapped ?? "0"),
                tpPaid: BigInt(row.tpPaid ?? "0"),
            });
        }

        return result;
    }, [rows]);
}
