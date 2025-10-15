//import { readContracts, type PublicClient } from 'viem'
//import { readContracts } from 'viem/actions'
import type { Abi, PublicClient } from "viem";

import type { SyncMulticallInput } from "../types/hooks";

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

/**
 * Runs a synchronous-style multicall using viem, returning nested storage.
 */
export async function runMulticallSync(
    publicClient: PublicClient,
    calls: SyncMulticallInput[]
): Promise<{
    data: Record<string | number, unknown> | undefined;
    canOperate: boolean;
}> {
    const contracts = calls.map(({ contract, functionName, args }) => ({
        address: contract.address,
        abi: contract.abi as Abi,
        functionName,
        args,
    }));

    const results = await publicClient.multicall({
        contracts,
        allowFailure: true,
    });

    const storage: Record<string | number, unknown> = {};
    let canOperate = true;

    results.forEach((item, i) => {
        const { resultType, keys, transform, onError } = calls[i];
        let value;

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
                console.warn(`Multicall failed for keys [${keys.join(".")}]`);
            }
        }

        assignNestedValue(storage, keys, value);
    });

    let finalStorage: Record<string | number, unknown> | undefined;

    if (results && results.length > 0) {
        storage["canOperate"] = canOperate;
        finalStorage = storage;
    } else {
        finalStorage = undefined;
    }

    return { data: finalStorage, canOperate };
}
