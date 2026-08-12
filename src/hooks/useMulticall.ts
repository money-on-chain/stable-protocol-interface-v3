import { useEffect, useMemo, useRef, useState } from "react";
import type { Abi } from "viem";
import { usePublicClient, useReadContracts } from "wagmi";

import type { MultiCallInput, MultiCallOptions } from "../types/hooks";

// Some price providers whitelist callers by msg.sender and reject peek()
// calls routed through the multicall aggregator contract, since the
// aggregator's own address is never on that whitelist — only a direct,
// non-batched call can succeed. address(1) is the conventional "public
// reader" account these providers whitelist for exactly this purpose.
const DIRECT_RETRY_ACCOUNT =
    "0x0000000000000000000000000000000000000001" as const;

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
                    address: contract,
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

    // Step 2b: Retry failed peek() calls individually (bypassing multicall)
    // as DIRECT_RETRY_ACCOUNT — see comment above. Keyed by contract address
    // (peek() always takes no args) so it survives `calls` re-ordering and
    // naturally refreshes every poll cycle since a price feed's value
    // changes over time.
    const publicClient = usePublicClient();
    const [directRetryResults, setDirectRetryResults] = useState<
        Record<string, unknown>
    >({});
    const inFlightRetries = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!publicClient || !results) return;

        results.forEach((item, i) => {
            if (item.status === "success") return;

            const call = calls[i];
            if (!call || call.functionName !== "peek") return;
            if (
                typeof call.contract !== "object" ||
                !("address" in call.contract)
            )
                return;

            const address = call.contract.address.toLowerCase();
            if (inFlightRetries.current.has(address)) return;
            inFlightRetries.current.add(address);

            publicClient
                .readContract({
                    address: call.contract.address,
                    abi: call.contract.abi,
                    functionName: "peek",
                    args: call.args ?? [],
                    account: DIRECT_RETRY_ACCOUNT,
                })
                .then((result) => {
                    setDirectRetryResults((prev) => ({
                        ...prev,
                        [address]: result,
                    }));
                })
                .catch(() => {
                    // Leave unresolved — the existing onError/default
                    // fallback in `storage` still applies for this call.
                })
                .finally(() => {
                    inFlightRetries.current.delete(address);
                });
        });
    }, [results, calls, publicClient]);

    // Step 3: Structure results into a nested dictionary, with optional transforms.
    // Wrapped in useMemo so the transform + deepMerge only re-run when results,
    // calls, or externalData actually change — not on every parent render.
    const storage = useMemo(() => {
        let next: Record<string | number, unknown> | undefined = {};

        // Return undefined while calls are pending, AND while there are no
        // calls at all yet — every caller builds `calls` from something like
        // `if (!contracts) return []`, so an empty `calls` array on the first
        // render(s) means "prerequisites (wallet/contracts) not ready yet",
        // not "legitimately nothing to fetch". Treating it as ready-with-{}
        // let consumers' `data != null` checks pass prematurely against a
        // hollow object — see estimateExchangeOutputV1's reload-only crash.
        if (calls.length === 0 || !results || results.length === 0) {
            return undefined;
        }

        const safeLength = Math.min(results?.length || 0, calls.length);
        results?.slice(0, safeLength).forEach((item, i) => {
            if (!calls[i]) {
                console.warn(
                    `Multicall: results[${i}] exists but calls[${i}] is undefined. Skipping.`
                );
                return;
            }

            const { contract, resultType, keys, transform, onError } = calls[i];
            let value: unknown;

            // A failed batched call may already have a fresh result from
            // the direct (non-multicall) retry below — treat that exactly
            // like a successful decode instead of falling back to onError.
            const directRetryResult =
                item.status !== "success" &&
                typeof contract === "object" &&
                "address" in contract
                    ? directRetryResults[contract.address.toLowerCase()]
                    : undefined;
            const succeeded =
                item.status === "success" || directRetryResult !== undefined;

            if (succeeded) {
                value =
                    item.status === "success" ? item.result : directRetryResult;
                // A live decode always hands back a native bigint for
                // uint256/int256, but on a cold page load `results` can
                // briefly reflect cached/rehydrated query state instead of a
                // fresh decode, which can't carry a raw bigint the same way
                // (e.g. round-tripped through JSON) — coerce defensively so
                // downstream bigint math (wadDiv/mulDiv) never sees anything
                // else and throws "Cannot mix BigInt and other types".
                if (
                    (resultType === "uint256" || resultType === "int256") &&
                    typeof value !== "bigint"
                ) {
                    try {
                        value = BigInt(value as string | number | boolean);
                    } catch {
                        value = 0n;
                    }
                }
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
                    value = onError().value;
                } else {
                    switch (resultType) {
                        case "uint256":
                        case "int256":
                            // Successful uint256/int256 decodes come back as
                            // native bigint (viem) — the fallback must match
                            // that type, or downstream bigint arithmetic
                            // (e.g. wadDiv/mulDiv) throws "Cannot mix BigInt
                            // and other types" the moment a call fails.
                            value = 0n;
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

            if (next) {
                assignNestedValue(next, keys, value);
            }
        });

        if (next && externalData) {
            next = deepMerge(next, externalData);
        }

        return next;
    }, [results, calls, externalData, directRetryResults]);

    return {
        data: storage,
        isLoading,
        isFetching,
        refetch,
        error,
        queryKey,
    };
}
