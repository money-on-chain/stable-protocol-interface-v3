import { useMemo } from "react";

import type {
    ContractInfo,
    DContracts,
    MultiCallErrorResult,
    MultiCallInput,
} from "../types/hooks";
import type { OnchainPricesResult } from "../types/status";
import { useMultiCall } from "./useMulticall";
import settings from "../settings/settings.json";
import { normalizeToBigInt } from "../helpers/precision";



/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useOnchainPrices(
    contracts?: DContracts,
    refetchInterval = 30_000
): OnchainPricesResult {
    const callsRequests = useMemo(() => {
        if (!contracts) return [];

        const callRequest: MultiCallInput[] = [];

        let PP_TP: ContractInfo | undefined;
        let PP_CA: ContractInfo | undefined;
        let PP_FeeToken: ContractInfo | undefined;

        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {

            // CA prices
            PP_CA = contracts.PP_CA?.[ca];
            if (!PP_CA) continue;
            PP_FeeToken = contracts.PP_FeeToken?.[ca];
            if (!PP_FeeToken) continue;

            callRequest.push({
                contract: PP_CA,
                functionName: "peek",
                args: [],
                resultType: [
                    {
                        internalType: "bytes32",
                        name: "",
                        type: "bytes32",
                    },
                    {
                        internalType: "bool",
                        name: "",
                        type: "bool",
                    },
                ],
                keys: [ca, "CA"],
                transform: (result: unknown) => {
                    const tuple = result as [bigint, boolean];
                    return [normalizeToBigInt(tuple[0]), tuple[1]];
                },
            });

            // TP prices
            let tpAddress: string;
            for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                const tpContract = contracts.TP?.[tp];
                const ppTpContract = contracts.PP_TP?.[ca]?.[tp];
                if (!tpContract || !ppTpContract) continue;

                tpAddress = tpContract.address;
                PP_TP = ppTpContract;

                callRequest.push({
                    contract: PP_TP,
                    functionName: "peek",
                    args: [],
                    resultType: [
                        {
                            internalType: "bytes32",
                            name: "",
                            type: "bytes32",
                        },
                        {
                            internalType: "bool",
                            name: "",
                            type: "bool",
                        },
                    ],
                    keys: [ca, "TP", tp],
                    transform: (result: unknown) => {
                        const tuple = result as [string, boolean];
                        return [normalizeToBigInt(tuple[0]), tuple[1]];
                    },
                });
            }

            // TF prices
            callRequest.push({
                contract: PP_FeeToken,
                functionName: "peek",
                args: [],
                resultType: [
                    {
                        internalType: "bytes32",
                        name: "",
                        type: "bytes32",
                    },
                    {
                        internalType: "bool",
                        name: "",
                        type: "bool",
                    },
                ],
                keys: [ca, "TF"],
                transform: (result: unknown) => {
                    const tuple = result as [string, boolean];
                    return [normalizeToBigInt(tuple[0]), tuple[1]];
                },
            });

            if (contracts.PP_COINBASE) {
                callRequest.push({
                    contract: contracts.PP_COINBASE,
                    functionName: "peek",
                    args: [],
                    resultType: [
                        {
                            internalType: "bytes32",
                            name: "",
                            type: "bytes32",
                        },
                        {
                            internalType: "bool",
                            name: "",
                            type: "bool",
                        },
                    ],
                    keys: [ca, "COINBASE"],
                    transform: (result: unknown) => {
                        const tuple = result as [string, boolean];
                        return [normalizeToBigInt(tuple[0]), tuple[1]];
                    },
                });
            }




        }

        return callRequest;
    }, [contracts]);

    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
        refetchInterval: refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: ["onChainPrices"].join(":"),
    });

    return multicallState as unknown as OnchainPricesResult;
}
