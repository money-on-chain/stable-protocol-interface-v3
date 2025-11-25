import { useEffect, useMemo, useRef } from "react";
import type { Abi } from "viem";
import { useReadContracts } from "wagmi";

import type { MultiCallInput, MultiCallOptions } from "../types/hooks";

/**
 * Assigns a value into a nested object structure given a path of keys.
 */
function assignNestedValue(
    obj: Record<string | number, unknown>,
    path: (string | number)[],
    value: unknown
) {
    let current: Record<string | number, unknown> = obj;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (current[key] == null) {
            current[key] = typeof path[i + 1] === "number" ? [] : {};
        }
        current = current[key] as Record<string | number, unknown>;
    }
    current[path[path.length - 1]] = value;
}

function deepMerge(
    target: Record<string | number, unknown>,
    source: Record<string | number, unknown>
): Record<string | number, unknown> {
    if (
        typeof target !== "object" ||
        typeof source !== "object" ||
        target == null ||
        source == null
    ) {
        return source;
    }

    const merged: Record<string | number, unknown> = Array.isArray(target)
        ? { ...target }
        : { ...target };

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (
                typeof source[key] === "object" &&
                source[key] !== null &&
                typeof merged[key] === "object" &&
                merged[key] !== null
            ) {
                merged[key] = deepMerge(
                    merged[key] as Record<string | number, unknown>,
                    source[key] as Record<string | number, unknown>
                );
            } else {
                merged[key] = source[key];
            }
        }
    }

    return merged;
}

/**
 * Custom hook to simulate multicall behavior using wagmi's useReadContracts.
 * It supports deeply nested storage mapping, error fallbacks, and custom value transforms.
 */
export function useMultiCall(
    calls: MultiCallInput[] = [],
    options: MultiCallOptions = {}
) {
    // Extract options values for stable dependencies
    const {
        batchSize = 50,
        scopeKey,
        refetchInterval = 30_000,
        enabled = true,
        externalData,
    } = options;

    // Step 1: Convert call definitions into wagmi-compatible format
    // Memoize to prevent unnecessary re-renders and refetches
    // Note: We rely on parent hooks to provide stable 'calls' arrays via their own useMemo
    // Track both length and a hash of call signatures to detect meaningful changes
    const callsSignature = useMemo(() => {
        return calls
            .map(
                (c) =>
                    `${typeof c.contract === "string" ? c.contract : c.contract.address}:${c.functionName}`
            )
            .join("|");
    }, [calls]);

    const contracts = useMemo(() => {
        if (calls.length === 0) return [];

        return calls.map(({ contract, functionName, args }) => {
            const isGetBalance = functionName === "getBalance";
            const isAddressOnly = typeof contract === "string";

            if (isGetBalance && isAddressOnly) {
                return {
                    address: contract as `0x${string}`,
                    abi: [] as Abi,
                    functionName: "getBalance",
                    type: "getBalance" as const,
                };
            }

            if (
                typeof contract === "object" &&
                "address" in contract &&
                "abi" in contract
            ) {
                return {
                    address: contract.address,
                    abi: contract.abi as Abi,
                    functionName,
                    args,
                };
            }

            throw new Error(
                `Invalid contract input for function "${functionName}"`
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calls.length, callsSignature]);

    // Memoize external data - parent should provide stable reference
    const memoizedExternalData = externalData;

    // Step 2: Perform the multicall using wagmi
    const {
        data: results,
        isLoading,
        isFetching,
        refetch,
        error,
        queryKey,
    } = useReadContracts({
        batchSize,
        contracts,
        scopeKey,
        query: {
            refetchInterval,
            enabled,
            placeholderData: (previousData) => previousData, // Keep previous data while refetching
        },
    });

    // Log only when data actually changes (fetches), not on every render
    const prevResultsRef = useRef<typeof results>();
    useEffect(() => {
        if (results !== prevResultsRef.current) {
            if (results !== undefined) {
                console.warn(
                    `[Multicall Fetch] ${scopeKey || "unknown"} - ${results.length} results - ${new Date().toLocaleTimeString()}`
                );
            } else {
                console.warn(
                    `[Multicall Loading] ${scopeKey || "unknown"} - ${calls.length} calls pending - ${new Date().toLocaleTimeString()}`
                );
            }
            prevResultsRef.current = results;
        }
    }, [results, scopeKey, calls.length]);

    // Step 3: Structure result into a nested dictionary, with optional transforms
    let storage: Record<string | number, unknown> | undefined = {};

    // Handle different result states
    if (!results || results.length === 0) {
        // No results yet - this is normal during initial load or when calls are empty
        if (calls.length > 0) {
            // We have calls but no results - this is expected during loading
            // Don't log this as it's normal behavior
        }
    } else if (results.length !== calls.length) {
        // Length mismatch - this can happen with stale cached results
        console.warn(
            `[Multicall] Length mismatch for ${scopeKey || "unknown"}: results=${results.length}, calls=${calls.length}. Using available data.`
        );
    }

    // Only process results that have corresponding calls
    const safeLength = Math.min(results?.length || 0, calls.length);
    results?.slice(0, safeLength).forEach((item, i) => {
        // Safety check: ensure calls[i] exists (should always be true now)
        if (!calls[i]) {
            console.warn(
                `Multicall: results[${i}] exists but calls[${i}] is undefined. Skipping.`
            );
            return;
        }

        const { resultType, keys, transform, onError } = calls[i];

        let value: unknown;

        if (item.status === "success") {
            value = item.result;
            if (transform) {
                try {
                    value = transform(value);
                } catch (e) {
                    console.warn(
                        `Transform failed for keys [${keys.join(".")}]`,
                        e
                    );
                }
            }
        } else {
            if (onError) {
                const fallback = onError();
                value = fallback.value;
            } else {
                switch (resultType) {
                    case "uint256":
                    case "int256":
                        value = "0";
                        break;
                    case "address":
                        value = "0x";
                        break;
                    case "bool":
                        value = false;
                        break;
                    default:
                        value = null;
                }
                console.warn(
                    `Multicall failed for keys [${keys.join(".")}] at index ${i}`
                );
            }
        }

        if (storage) {
            assignNestedValue(storage, keys, value);
        }
    });

    // Set canOperate flag and handle empty results
    if (calls.length === 0) {
        // We have calls but no results yet - return undefined to indicate loading
        storage = undefined;
    }

    // merge with external data
    if (storage && memoizedExternalData) {
        //storage = { ...storage, ...memoizedExternalData }
        storage = deepMerge(
            storage,
            memoizedExternalData as Record<string | number, unknown>
        );

        if (storage.length === 0) {
            // We have calls but no results yet - return undefined to indicate loading
            storage = undefined;
        }
    }

    return {
        data: storage,
        isLoading,
        isFetching,
        refetch,
        error,
        queryKey,
    };
}
