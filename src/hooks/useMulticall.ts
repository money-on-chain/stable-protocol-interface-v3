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
    // Step 1: Convert call definitions into wagmi-compatible format
    const contracts = calls.map(({ contract, functionName, args }) => {
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

    // Step 2: Perform the multicall using wagmi
    const {
        data: results,
        isLoading,
        isFetching,
        refetch,
        error,
        queryKey,
    } = useReadContracts({
        batchSize: options.batchSize ?? 50,
        contracts: contracts,
        scopeKey: options.scopeKey ?? undefined,
        query: {
            refetchInterval: options.refetchInterval ?? 30_000,
            enabled: options.enabled ?? true,
        },
    });

    // Step 3: Structure result into a nested dictionary, with optional transforms
    let storage: Record<string | number, unknown> | undefined = {};
    let canOperate = true;
    results?.forEach((item, i) => {
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
                canOperate = fallback.canOperate;
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
                canOperate = false;
                console.warn(
                    `Multicall failed for keys [${keys.join(".")}] at index ${i}`
                );
            }
        }

        if (storage) {
            assignNestedValue(storage, keys, value);
        }
    });

    if (results && results.length > 0) {
        storage["canOperate"] = canOperate;
    } else {
        storage = undefined;
    }

    // merge with external data
    if (storage && options.externalData) {
        //storage = { ...storage, ...options.externalData }
        storage = deepMerge(
            storage,
            options.externalData as Record<string | number, unknown>
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
