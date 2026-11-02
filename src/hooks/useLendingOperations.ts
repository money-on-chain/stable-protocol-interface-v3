import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";
import { formatUnits } from "viem";

import type {
    LendingOperation,
    LendingOperationCategory,
    LendingOperationType,
    OperationAssetMovement,
} from "../components/LendingBorrowing/OperationsTable";
import { getLendingBorrowingTokenMetadata } from "../components/LendingBorrowing/tokenMetadata";
import type { DContracts } from "../types/hooks";

type RawLendingUserOperation = {
    id_event?: string | null;
    hash?: string | null;
    eventName?: string | null;
    user?: string | null;
    tpToken?: string | null;
    extra?: Record<string, unknown> | null;
    createdAt?: string | null;
    lastUpdatedAt?: string | null;
};

type RawLendingUserOperationsResponse = {
    rows: RawLendingUserOperation[];
};

const EVENT_MAPPING: Record<string, { category: LendingOperationCategory; type: LendingOperationType }> = {
    Deposit: { category: "lending", type: "deposit" },
    Withdraw: { category: "lending", type: "withdraw" },
    AddACtoVault: { category: "borrowing", type: "deposit-collateral" },
    RemoveACfromVault: { category: "borrowing", type: "withdraw-collateral" },
    Borrow: { category: "borrowing", type: "borrow" },
    Repay: { category: "borrowing", type: "repay" },
    RepayWithAC: { category: "borrowing", type: "repay-with-collateral" },
    Liquidate: { category: "borrowing", type: "liquidation" },
};

function fmtAmount(raw: string, decimals: number): string {
    const n = parseFloat(formatUnits(BigInt(raw), 18));
    return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function extraString(extra: Record<string, unknown>, key: string): string | undefined {
    const value = extra[key];
    return typeof value === "string" ? value : undefined;
}

function buildMovements(
    eventName: string,
    extra: Record<string, unknown>,
    tpTicker: string,
    tpDecimals: number,
    collateralTicker: string | undefined,
    collateralDecimals: number,
): OperationAssetMovement[] | null {
    switch (eventName) {
        case "Deposit":
        case "Borrow": {
            const tpAmount = extraString(extra, "tpAmount");
            return tpAmount ? [{ amount: fmtAmount(tpAmount, tpDecimals), ticker: tpTicker, direction: "in" }] : null;
        }
        case "Withdraw":
        case "Repay": {
            const tpAmount = extraString(extra, "tpAmount");
            return tpAmount ? [{ amount: fmtAmount(tpAmount, tpDecimals), ticker: tpTicker, direction: "out" }] : null;
        }
        case "AddACtoVault": {
            const acAmount = extraString(extra, "acAmount");
            return acAmount && collateralTicker
                ? [{ amount: fmtAmount(acAmount, collateralDecimals), ticker: collateralTicker, direction: "in" }]
                : null;
        }
        case "RemoveACfromVault": {
            const acAmount = extraString(extra, "acAmount");
            return acAmount && collateralTicker
                ? [{ amount: fmtAmount(acAmount, collateralDecimals), ticker: collateralTicker, direction: "out" }]
                : null;
        }
        case "RepayWithAC": {
            const acSold = extraString(extra, "acSold");
            const tpAmount = extraString(extra, "tpAmount");
            return acSold && tpAmount && collateralTicker
                ? [
                      { amount: fmtAmount(acSold, collateralDecimals), ticker: collateralTicker, direction: "out" },
                      { amount: fmtAmount(tpAmount, tpDecimals), ticker: tpTicker, direction: "out" },
                  ]
                : null;
        }
        case "Liquidate": {
            const acSwapped = extraString(extra, "acSwapped");
            const tpPaid = extraString(extra, "tpPaid");
            return acSwapped && tpPaid && collateralTicker
                ? [
                      { amount: fmtAmount(acSwapped, collateralDecimals), ticker: collateralTicker, direction: "out" },
                      { amount: fmtAmount(tpPaid, tpDecimals), ticker: tpTicker, direction: "out" },
                  ]
                : null;
        }
        default:
            return null;
    }
}

export interface LendingOperationsResult {
    isLoading: boolean;
    operations: LendingOperation[];
}

export function useLendingOperations(
    userAddress: string | undefined,
    contractsAddress: DContracts | null | undefined,
): LendingOperationsResult {
    const apiBase = import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS as string | undefined;

    const { data: rows, isLoading } = useQuery({
        queryKey: ["lendingUserOperations", userAddress],
        enabled: !!userAddress && !!apiBase,
        refetchInterval: 60_000,
        queryFn: async () => {
            const url = new URL(String(apiBase));
            url.pathname = "/api/v1/lending/user_operations/";
            url.searchParams.set("user", userAddress!);
            url.searchParams.set("limit", "1000");
            const response = await axios.get<RawLendingUserOperationsResponse>(url.toString(), { timeout: 10_000 });
            if (response.status !== 200) throw new Error("API error");
            return response.data.rows;
        },
    });

    // tpToken/mocBucket come back as raw addresses; map them to the same
    // ticker metadata the rest of the lending & borrowing UI uses, keyed by
    // their position in the contracts bag (TP_<index> / CA_<index>).
    const tpTokenByAddress = useMemo(() => {
        const map = new Map<string, { ticker: string; decimals: number }>();
        (contractsAddress?.TP ?? []).forEach((tp, index) => {
            const meta = getLendingBorrowingTokenMetadata(`TP_${index}`);
            map.set(tp.address.toLowerCase(), { ticker: meta.ticker, decimals: meta.visibleDecimals });
        });
        return map;
    }, [contractsAddress]);

    const mocBucketByAddress = useMemo(() => {
        const map = new Map<string, { ticker: string; decimals: number }>();
        (contractsAddress?.Moc ?? []).forEach((moc, index) => {
            const meta = getLendingBorrowingTokenMetadata(`CA_${index}`);
            map.set(moc.address.toLowerCase(), { ticker: meta.ticker, decimals: meta.visibleDecimals });
        });
        return map;
    }, [contractsAddress]);

    const operations = useMemo((): LendingOperation[] => {
        if (!rows?.length) return [];

        const result: LendingOperation[] = [];
        for (const row of rows) {
            if (!row.id_event || !row.eventName || !row.hash || !row.tpToken) continue;
            const mapping = EVENT_MAPPING[row.eventName];
            const tp = tpTokenByAddress.get(row.tpToken.toLowerCase());
            if (!mapping || !tp) continue;

            const extra = row.extra ?? {};
            const mocBucket = extraString(extra, "mocBucket");
            const ca = mocBucket ? mocBucketByAddress.get(mocBucket.toLowerCase()) : undefined;

            const movements = buildMovements(row.eventName, extra, tp.ticker, tp.decimals, ca?.ticker, ca?.decimals ?? 2);
            if (!movements) continue;

            result.push({
                id: row.id_event,
                category: mapping.category,
                type: mapping.type,
                // The indexed events only ever land here once confirmed on-chain —
                // there's no queued/errored state represented in this feed.
                status: "confirmed",
                timestamp: String(row.createdAt ?? row.lastUpdatedAt ?? ""),
                tpTicker: tp.ticker,
                collateralTicker: ca?.ticker,
                movements,
                transactionHash: row.hash,
            });
        }

        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return result;
    }, [rows, tpTokenByAddress, mocBucketByAddress]);

    return { isLoading, operations };
}
