import { useMemo } from "react";
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
        if (current[key] == null || typeof current[key] !== "object") {
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

    // Step 1: Convert call definitions into wagmi-compatible format.
    // Parent hooks are expected to provide a stable `calls` array via their own useMemo.
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
    }, [calls]);

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

    // Step 3: Structure result into a nested dictionary, with optional transforms
    let storage: Record<string | number, unknown> | undefined = {};

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

    // Return undefined while calls are pending so consumers can distinguish loading from empty
    if (calls.length > 0 && (!results || results.length === 0)) {
        storage = undefined;
    }

    // Merge with external data
    if (storage && externalData) {
        storage = deepMerge(
            storage,
            externalData as Record<string | number, unknown>
        );
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
