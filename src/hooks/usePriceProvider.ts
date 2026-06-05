import { useMemo } from "react";

import { normalizeToBigInt } from "../helpers/precision";
import type { DContracts, MultiCallInput } from "../types/hooks";
import { useMultiCall } from "./useMulticall";

function isPeekResult(result: unknown): result is [string | bigint, boolean] {
    return (
        Array.isArray(result) &&
        result.length >= 2 &&
        (typeof result[0] === "string" || typeof result[0] === "bigint") &&
        typeof result[1] === "boolean"
    );
}

/** Map of pair label → [price (18-decimal bigint), valid flag] */
export type PriceProviderData = Record<string, [bigint, boolean]>;

export interface UsePriceProviderResult {
    data: PriceProviderData;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Fetches prices from custom price-provider contracts loaded via
 * REACT_APP_CONTRACT_PRICE_PROVIDER_CUSTOM (format: "PAIR/USD:0x…,PAIR2/USD:0x…").
 *
 * If offchainPrices contains an entry for a pair the onchain peek() is skipped
 * for that pair and the offchain value is used instead — same pattern as
 * useContractProtocolStatus.
 */
export function usePriceProvider(
    contracts?: DContracts,
    offchainPrices?: PriceProviderData,
    refetchInterval = 30_000
): UsePriceProviderResult {
    const callsRequests = useMemo(() => {
        const ppContracts = contracts?.PP_CUSTOM;
        if (!ppContracts?.length) return [];

        const callRequest: MultiCallInput[] = [];
        for (const pp of ppContracts) {
            const pair = pp.name!;
            if (offchainPrices && pair in offchainPrices) continue;
            callRequest.push({
                contract: pp,
                functionName: "peek",
                args: [],
                resultType: [
                    { internalType: "bytes32", name: "", type: "bytes32" },
                    { internalType: "bool", name: "", type: "bool" },
                ],
                keys: [pair],
                transform: (result: unknown) => {
                    if (!isPeekResult(result)) return [0n, false];
                    return [normalizeToBigInt(result[0]), result[1]];
                },
            });
        }
        return callRequest;
    }, [contracts, offchainPrices]);

    const multicallState = useMultiCall(callsRequests, {
        refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: "priceProvider",
    });

    const data = useMemo((): PriceProviderData => {
        const merged: PriceProviderData = offchainPrices
            ? { ...offchainPrices }
            : {};
        if (multicallState.data) {
            const raw = multicallState.data as Record<
                string,
                [bigint, boolean]
            >;
            for (const [pair, value] of Object.entries(raw)) {
                merged[pair] = value;
            }
        }
        return merged;
    }, [multicallState.data, offchainPrices]);

    return {
        data,
        isLoading: multicallState.isLoading,
        isFetching: multicallState.isFetching,
        error: multicallState.error as Error | null,
        refetch: multicallState.refetch as () => void,
    };
}
