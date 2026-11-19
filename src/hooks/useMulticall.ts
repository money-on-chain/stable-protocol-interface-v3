import { useEffect, useMemo, useRef, useState } from "react";
import type { Abi } from "viem";
import {
    BaseError,
    HttpRequestError,
    LimitExceededRpcError,
    TimeoutError,
} from "viem";
import { usePublicClient, useReadContracts } from "wagmi";

import type { MultiCallInput, MultiCallOptions } from "../types/hooks";

// Some price providers whitelist callers by msg.sender and reject peek()
// calls routed through the multicall aggregator contract, since the
// aggregator's own address is never on that whitelist — only a direct,
// non-batched call can succeed. address(1) is the conventional "public
// reader" account these providers whitelist for exactly this purpose.
const DIRECT_RETRY_ACCOUNT =
    "0x0000000000000000000000000000000000000001" as const;

// How long a failed peek() may keep showing its last good result when the
// RPC can't be reached. A fetch failure isn't the contract saying the price
// is invalid, so it shouldn't raise the "invalid price" alert - but don't
// keep serving a stale price forever either.
const PEEK_STALE_MS = 5 * 60_000;

/** True when the call never got an answer from the contract (network down,
 * HTTP error, rate limit, timeout), as opposed to the contract reverting. */
function isUnreachableError(error: unknown): boolean {
    return (
        error instanceof BaseError &&
        !!error.walk(
            (e) =>
                e instanceof HttpRequestError ||
                e instanceof TimeoutError ||
                e instanceof LimitExceededRpcError
        )
    );
}

/** Which field a call fills: target, function and where its result goes.
 * Args are left out on purpose: a call whose args change between polls
 * (roc passes the latest off-chain prices to calcPTCac, calcCglb...) still
 * fills the same field. */
function callSlot(call: MultiCallInput): string {
    const contract = call.contract as { address?: string } | string;
    const address =
        typeof contract === "string" ? contract : (contract?.address ?? "");
    return [address.toLowerCase(), call.functionName, call.keys.join(".")].join(
        "|"
    );
}

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

/** One line about why a call failed (rate limit, timeout, revert...). */
function describeError(error: unknown): string {
    if (!error) return "unknown error";
    if (error instanceof Error) {
        const e = error as Error & { shortMessage?: string };
        return `${e.name}: ${e.shortMessage ?? e.message.split("\n")[0]}`;
    }
    return typeof error === "string" ? error : "non-Error failure";
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
        // viem measures this in calldata BYTES per aggregate3 chunk, not in
        // calls. At 50 bytes nearly every call with an argument got its own
        // eth_call, so each poll fired dozens of parallel requests through
        // the wallet's RPC, and a rejected chunk fails every call in it.
        // A call that burns all its gas (e.g. reading past the end of an
        // array on a Solidity < 0.8 contract) leaves aggregate3 out of gas
        // and fails its whole chunk, so never batch such calls (see
        // proposalsList in useContractOmocStatus).
        batchSize = 1024,
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
        data: rawResults,
        isPlaceholderData,
        isLoading,
        isFetching,
        refetch,
        error,
        queryKey,
        dataUpdatedAt,
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

    // Placeholder data only shows when the query key changed, i.e. while the
    // results still belong to the PREVIOUS call list. Mapping them by index
    // onto the new list put values in the wrong fields whenever calls were
    // added or removed (e.g. proposalsList growing), so match them by slot
    // (callSlot) instead: a call whose args changed keeps showing its last
    // value until the new one arrives, with no "--" flicker in the header.
    // Report "loading" instead of mixing data when a new slot has no
    // previous result, or when scopeKey changed: hooks put the account in
    // it, so another account's data is never shown.
    const callKeys = useMemo(() => calls.map(callSlot), [calls]);
    // Slots and scope behind the last non-placeholder results
    const resultCallKeys = useRef<string[] | null>(null);
    const resultScope = useRef<string | undefined>(undefined);
    const results = useMemo(() => {
        if (!rawResults) return undefined;
        if (!isPlaceholderData) {
            resultCallKeys.current = callKeys;
            resultScope.current = scopeKey;
            return rawResults;
        }
        const prevKeys = resultCallKeys.current;
        if (
            !prevKeys ||
            prevKeys.length !== rawResults.length ||
            resultScope.current !== scopeKey
        )
            return undefined;
        const byKey = new Map(prevKeys.map((k, i) => [k, rawResults[i]]));
        const aligned = callKeys.map((k) => byKey.get(k));
        return aligned.every((r) => r !== undefined)
            ? (aligned)
            : undefined;
    }, [rawResults, isPlaceholderData, callKeys, scopeKey]);

    // Step 2b: Retry failed peek() calls individually (bypassing multicall)
    // as DIRECT_RETRY_ACCOUNT — see comment above. Keyed by contract address
    // (peek() always takes no args) so it survives `calls` re-ordering and
    // naturally refreshes every poll cycle since a price feed's value
    // changes over time.
    const publicClient = usePublicClient();
    const [directRetryResults, setDirectRetryResults] = useState<
        Record<string, unknown>
    >({});
    // Addresses whose direct retry also failed, so the onError fallback is final
    const [directRetryFailed, setDirectRetryFailed] = useState<
        Record<string, true>
    >({});
    // Addresses whose direct retry couldn't reach the RPC: their price is
    // unknown, not invalid, so the last good result keeps being used
    const [unreachablePeeks, setUnreachablePeeks] = useState<
        Record<string, true>
    >({});
    // Last successful peek() result per address, with when it was read
    const lastGoodPeeks = useRef<
        Record<string, { value: unknown; at: number }>
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
                    lastGoodPeeks.current[address] = {
                        value: result,
                        at: Date.now(),
                    };
                    setDirectRetryResults((prev) => ({
                        ...prev,
                        [address]: result,
                    }));
                    setDirectRetryFailed((prev) => {
                        if (!prev[address]) return prev;
                        const next = { ...prev };
                        delete next[address];
                        return next;
                    });
                    setUnreachablePeeks((prev) => {
                        if (!prev[address]) return prev;
                        const next = { ...prev };
                        delete next[address];
                        return next;
                    });
                })
                .catch((error: unknown) => {
                    if (isUnreachableError(error)) {
                        // No answer from the contract: keep the last good
                        // result (see PEEK_STALE_MS) instead of reporting
                        // the price as invalid
                        setUnreachablePeeks((prev) =>
                            prev[address] ? prev : { ...prev, [address]: true }
                        );
                        // An earlier retry's result would otherwise win over
                        // lastGoodPeeks and never expire
                        setDirectRetryResults((prev) => {
                            if (!(address in prev)) return prev;
                            const next = { ...prev };
                            delete next[address];
                            return next;
                        });
                        return;
                    }
                    // Drop any earlier successful retry so a feed that now
                    // reverts (e.g. paused) falls back to onError ([0n, false])
                    // instead of keeping its last [price, true].
                    setDirectRetryResults((prev) => {
                        if (!(address in prev)) return prev;
                        const next = { ...prev };
                        delete next[address];
                        return next;
                    });
                    setDirectRetryFailed((prev) =>
                        prev[address] ? prev : { ...prev, [address]: true }
                    );
                    // The contract answered: no longer just unreachable
                    setUnreachablePeeks((prev) => {
                        if (!prev[address]) return prev;
                        const next = { ...prev };
                        delete next[address];
                        return next;
                    });
                })
                .finally(() => {
                    inFlightRetries.current.delete(address);
                });
        });
        // dataUpdatedAt: retry on every poll even when `results` is structurally
        // shared (unchanged reference), so feed state changes are picked up.
    }, [results, calls, publicClient, dataUpdatedAt]);

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
            const peekAddress =
                calls[i].functionName === "peek" &&
                typeof contract === "object" &&
                "address" in contract
                    ? contract.address.toLowerCase()
                    : undefined;
            // A peek() whose retry couldn't reach the RPC keeps its last
            // good result for a while: unknown is not invalid
            const lastGood =
                item.status !== "success" &&
                directRetryResult === undefined &&
                peekAddress &&
                unreachablePeeks[peekAddress]
                    ? lastGoodPeeks.current[peekAddress]
                    : undefined;
            const useLastGood =
                !!lastGood && Date.now() - lastGood.at <= PEEK_STALE_MS;
            const succeeded =
                item.status === "success" ||
                directRetryResult !== undefined ||
                useLastGood;

            if (succeeded) {
                if (item.status === "success") value = item.result;
                else if (directRetryResult !== undefined)
                    value = directRetryResult;
                else value = lastGood?.value;
                // Stamp with when the multicall READ it (not now: this memo
                // also re-runs on unrelated changes), so PEEK_STALE_MS
                // counts from the read. Direct retries stamp themselves.
                if (
                    peekAddress &&
                    item.status === "success" &&
                    !isPlaceholderData
                ) {
                    const at = dataUpdatedAt || Date.now();
                    const prev = lastGoodPeeks.current[peekAddress];
                    if (!prev || at >= prev.at) {
                        lastGoodPeeks.current[peekAddress] = { value, at };
                    }
                }
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
                        `Multicall failed for keys [${keys.join(".")}] at index ${i}: ${describeError(item.error)}`
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
    }, [
        results,
        calls,
        externalData,
        directRetryResults,
        unreachablePeeks,
        dataUpdatedAt,
        isPlaceholderData,
    ]);

    // True while a failed peek()'s price is unknown: its first direct retry
    // is still in flight, or the RPC is unreachable and no read ever
    // succeeded. Its value is the onError fallback ([0n, false]), which
    // consumers must not treat as an invalid price.
    const isRetryingPeeks = useMemo(() => {
        if (!results) return false;
        return results.some((item, i) => {
            if (item.status === "success") return false;
            const call = calls[i];
            if (
                !call ||
                call.functionName !== "peek" ||
                typeof call.contract !== "object" ||
                !("address" in call.contract)
            )
                return false;
            const address = call.contract.address.toLowerCase();
            if (directRetryResults[address] !== undefined) return false;
            if (directRetryFailed[address]) return false; // contract reverted
            // Unreachable RPC: with a last good value (fresh, or expired
            // past PEEK_STALE_MS) storage has a definite answer. Without one
            // - a cold load - the price is unknown, not invalid, so keep it
            // pending until a read succeeds.
            if (unreachablePeeks[address])
                return lastGoodPeeks.current[address] === undefined;
            return true; // first direct retry still in flight
        });
    }, [
        results,
        calls,
        directRetryResults,
        directRetryFailed,
        unreachablePeeks,
    ]);

    return {
        data: storage,
        isRetryingPeeks,
        isLoading,
        isFetching,
        refetch,
        error,
        queryKey,
    };
}
