import { useMemo } from "react";
import { checksumAddress } from "viem";

import { normalizeToBigInt } from "../helpers/precision";
import settings from "../settings/settings.json";
import type {
    ContractInfo,
    DContracts,
    ExternalData,
    MultiCallErrorResult,
    MultiCallInput,
    ParsedPrices,
} from "../types/hooks";
import type { ContractProtocolStatusResult } from "../types/status";
import { useMultiCall } from "./useMulticall";

const onErrorGetPTCac = (): MultiCallErrorResult => {
    return { value: 0n };
};

/**
 * Checks if parsedPrices is empty (either empty array or empty object)
 */
const isEmptyParsedPrices = (
    parsedPrices: ParsedPrices[] | undefined
): boolean => {
    if (!parsedPrices) return true;
    if (Array.isArray(parsedPrices)) {
        return parsedPrices.length === 0;
    }
    // Check if it's an empty object (but not null, which is also typeof 'object')
    if (typeof parsedPrices === "object" && parsedPrices !== null) {
        return Object.keys(parsedPrices).length === 0;
    }
    return true;
};

/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useContractProtocolStatus(
    contracts?: DContracts,
    currentBlockNumber?: number,
    offChainPrices?: ParsedPrices[],
    onChainPrices?: ParsedPrices[],
    refetchInterval = 30_000
): ContractProtocolStatusResult {
    // Memoize external data to prevent unnecessary refetches
    const externalData: ExternalData = useMemo(() => {
        let parsedPrices: ParsedPrices[] = [];
        if (offChainPrices) {
            parsedPrices = offChainPrices;
        } else if (onChainPrices) {
            parsedPrices = onChainPrices;
        }

        if (isEmptyParsedPrices(parsedPrices)) return {} as ExternalData;

        const data: ExternalData = {};
        if (parsedPrices && !isEmptyParsedPrices(parsedPrices)) {
            for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                data[ca] = {
                    PP_CA: parsedPrices[ca].CA,
                    PP_TP: {},
                };
                for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                    data[ca].PP_TP[tp] = parsedPrices[ca].TP[tp];
                }
            }
        }
        return data;
    }, [offChainPrices, onChainPrices]);

    const callsRequests = useMemo(() => {
        if (!contracts) return [];

        if (!currentBlockNumber) return [];

        let parsedPrices: ParsedPrices[] = [];
        if (offChainPrices) {
            parsedPrices = offChainPrices;
        } else if (onChainPrices) {
            parsedPrices = onChainPrices;
            console.warn("Using onChainPrices ...")
        }

        if (isEmptyParsedPrices(parsedPrices)) return [];

        /*if (
            typeof import.meta.env.REACT_APP_PRICE_OFFCHAIN_API !==
                "undefined" &&
            !parsedPrices
        )
            return [];*/

        if (
            typeof import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD ===
            "undefined"
        )
            return [];

        const callRequest: MultiCallInput[] = [];
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
                keys: ["PP_COINBASE"],
                transform: (result: unknown) => {
                    const tuple = result as [bigint, boolean];
                    return [normalizeToBigInt(tuple[0]), tuple[1]];
                },
            });
        }

        const vendorAddress = checksumAddress(
            import.meta.env
                .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS as `0x${string}`
        );
        let contractMocType: string | undefined;
        let Moc: ContractInfo | undefined;
        let MocVendors: ContractInfo | undefined;
        let MocQueue: ContractInfo | undefined;
        let PP_FeeToken: ContractInfo | undefined;
        let FC_MAX_ABSOLUTE_OP_PROVIDER: ContractInfo | undefined;
        let FC_MAX_OP_DIFFERENCE_PROVIDER: ContractInfo | undefined;
        let PP_TP: ContractInfo | undefined;

        let priceOfflineTPs: bigint[] | undefined;
        const bucketsPACtps: bigint[][] = [];
        const tpAddresses: string[] = [];
        if (parsedPrices && !isEmptyParsedPrices(parsedPrices)) {
            for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                priceOfflineTPs = parsedPrices[ca].TP.map((tp) => tp[0]);
                bucketsPACtps.push(priceOfflineTPs);
            }

            for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                const tpAddress = contracts.TP?.[tp];
                if (tpAddress) {
                    tpAddresses.push(tpAddress.address);
                }
            }
        }

        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            const caToken = settings.tokens.CA[ca] as {
                collateralType: string;
            };
            contractMocType = caToken.collateralType;
            Moc = contracts.Moc?.[ca];
            MocVendors = contracts.MocVendors?.[ca];
            MocQueue = contracts.MocQueue?.[ca];
            PP_FeeToken = contracts.PP_FeeToken?.[ca];
            FC_MAX_ABSOLUTE_OP_PROVIDER =
                contracts.FC_MAX_ABSOLUTE_OP_PROVIDER?.[ca];
            FC_MAX_OP_DIFFERENCE_PROVIDER =
                contracts.FC_MAX_OP_DIFFERENCE_PROVIDER?.[ca];
            priceOfflineTPs = parsedPrices?.[ca]?.TP.map((tp) => tp[0]);

            if (
                !Moc ||
                !MocVendors ||
                !MocQueue ||
                !PP_FeeToken ||
                !FC_MAX_ABSOLUTE_OP_PROVIDER ||
                !FC_MAX_OP_DIFFERENCE_PROVIDER /*||
                !priceOfflineTPs*/
            ) {
                continue;
            }

            callRequest.push({
                contract: Moc,
                functionName: "protThrld",
                args: [],
                resultType: "uint256",
                keys: [ca, "protThrld"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "liqThrld",
                args: [],
                resultType: "uint256",
                keys: [ca, "liqThrld"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "liquidated",
                args: [],
                resultType: "bool",
                keys: [ca, "liquidated"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "nACcb",
                args: [],
                resultType: "uint256",
                keys: [ca, "nACcb"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "nTCcb",
                args: [],
                resultType: "uint256",
                keys: [ca, "nTCcb"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "tcMintFee",
                args: [],
                resultType: "uint256",
                keys: [ca, "tcMintFee"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "tcMintFee",
                args: [],
                resultType: "uint256",
                keys: [ca, "tcMintFee"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "tcRedeemFee",
                args: [],
                resultType: "uint256",
                keys: [ca, "tcRedeemFee"],
            });

            callRequest.push({
                contract: Moc,
                functionName: parsedPrices ? "calcPTCac" : "getPTCac",
                args: parsedPrices ? [priceOfflineTPs] : [],
                resultType: "int256",
                keys: [ca, "getPTCac"],
                onError: onErrorGetPTCac,
            });

            callRequest.push({
                contract: Moc,
                functionName: parsedPrices ? "calcCglb" : "getCglb",
                args: parsedPrices ? [priceOfflineTPs] : [],
                resultType: "uint256",
                keys: [ca, "getCglb"],
            });

            callRequest.push({
                contract: Moc,
                functionName: parsedPrices ? "calcLckAC" : "getLckAC",
                args: parsedPrices ? [priceOfflineTPs] : [],
                resultType: "uint256",
                keys: [ca, "getLckAC"],
            });

            callRequest.push({
                contract: Moc,
                functionName: parsedPrices
                    ? "calcTCAvailableToRedeem"
                    : "getTCAvailableToRedeem",
                args: parsedPrices ? [priceOfflineTPs] : [],
                resultType: "uint256",
                keys: [ca, "getTCAvailableToRedeem"],
            });

            callRequest.push({
                contract: Moc,
                functionName: parsedPrices ? "nACcb" : "getTotalACavailable",
                args: [],
                resultType: "uint256",
                keys: [ca, "getTotalACavailable"],
            });

            callRequest.push({
                contract: Moc,
                functionName: parsedPrices ? "calcCtargemaCA" : "getCtargemaCA",
                args: parsedPrices ? [priceOfflineTPs] : [],
                resultType: "uint256",
                keys: [ca, "getCtargemaCA"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "feeTokenPct",
                args: [],
                resultType: "uint256",
                keys: [ca, "feeTokenPct"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "feeToken",
                args: [],
                resultType: "address",
                keys: [ca, "feeToken"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "feeToken",
                args: [],
                resultType: "address",
                keys: [ca, "feeToken"],
            });

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
                keys: [ca, "PP_FeeToken"],
                transform: (result: unknown) => {
                    const tuple = result as [bigint, boolean];
                    return [normalizeToBigInt(tuple[0]), tuple[1]];
                },
            });

            callRequest.push({
                contract: MocVendors,
                functionName: "vendorMarkup",
                args: [vendorAddress],
                resultType: "uint256",
                keys: [ca, "vendorMarkup"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [1],
                resultType: "uint256",
                keys: [ca, "tcMintExecCost"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [2],
                resultType: "uint256",
                keys: [ca, "tcRedeemExecCost"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [3],
                resultType: "uint256",
                keys: [ca, "tpMintExecCost"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [4],
                resultType: "uint256",
                keys: [ca, "tpRedeemExecCost"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [9],
                resultType: "uint256",
                keys: [ca, "swapTPforTPExecCost"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [8],
                resultType: "uint256",
                keys: [ca, "swapTPforTCExecCost"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [7],
                resultType: "uint256",
                keys: [ca, "swapTCforTPExecCost"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [6],
                resultType: "uint256",
                keys: [ca, "redeemTCandTPExecCost"],
            });

            callRequest.push({
                contract: MocQueue,
                functionName: "execCost",
                args: [5],
                resultType: "uint256",
                keys: [ca, "mintTCandTPExecCost"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "maxQACToMintTP",
                args: [currentBlockNumber],
                resultType: "uint256",
                keys: [ca, "maxQACToMintTP"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "maxQACToRedeemTP",
                args: [currentBlockNumber],
                resultType: "uint256",
                keys: [ca, "maxQACToRedeemTP"],
            });

            callRequest.push({
                contract: Moc,
                functionName: "paused",
                args: [],
                resultType: "bool",
                keys: [ca, "paused"],
            });

            if (contracts.MocMultiCollateralGuard) {
                callRequest.push({
                    contract: contracts.MocMultiCollateralGuard,
                    functionName: parsedPrices
                        ? "calcRealTCAvailableToRedeemWithPrices"
                        : "getRealTCAvailableToRedeem",
                    args: parsedPrices
                        ? [Moc.address, bucketsPACtps]
                        : [Moc.address],
                    resultType: "uint256",
                    keys: [ca, "getRealTCAvailableToRedeem"],
                });
            }

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
                    keys: [ca, "PP_TP", tp],
                    transform: (result: unknown) => {
                        const tuple = result as [bigint, boolean];
                        return [normalizeToBigInt(tuple[0]), tuple[1]];
                    },
                });

                callRequest.push({
                    contract: Moc,
                    functionName: "tpMintFees",
                    args: [tpAddress],
                    resultType: "uint256",
                    keys: [ca, "tpMintFees", tp],
                });

                callRequest.push({
                    contract: Moc,
                    functionName: "tpRedeemFees",
                    args: [tpAddress],
                    resultType: "uint256",
                    keys: [ca, "tpRedeemFees", tp],
                });

                callRequest.push({
                    contract: Moc,
                    functionName: "tpCtarg",
                    args: [tp],
                    resultType: "uint256",
                    keys: [ca, "tpCtarg", tp],
                });

                callRequest.push({
                    contract: Moc,
                    functionName: "pegContainer",
                    args: [tp],
                    resultType: "uint256",
                    keys: [ca, "pegContainer", tp],
                });

                callRequest.push({
                    contract: Moc,
                    functionName: parsedPrices
                        ? "calcTPAvailableToMint"
                        : "getTPAvailableToMint",
                    args: parsedPrices
                        ? [tpAddresses[tp], priceOfflineTPs]
                        : [tpAddress],
                    resultType: "int256",
                    keys: [ca, "getTPAvailableToMint", tp],
                });

                callRequest.push({
                    contract: Moc,
                    functionName: "tpEma",
                    args: [tp],
                    resultType: "uint256",
                    keys: [ca, "tpEma", tp],
                });

                if (contracts.MocMultiCollateralGuard) {
                    callRequest.push({
                        contract: contracts.MocMultiCollateralGuard,
                        functionName: parsedPrices
                            ? "calcRealTPAvailableToMintWithPrices"
                            : "getRealTPAvailableToMint",
                        args: parsedPrices
                            ? [Moc.address, tpAddresses[tp], bucketsPACtps]
                            : [Moc.address, tpAddress],
                        resultType: "uint256",
                        keys: [ca, "getRealTPAvailableToMint", tp],
                    });
                }
            }
        }

        if (contracts.MocMultiCollateralGuard) {
            callRequest.push({
                contract: contracts.MocMultiCollateralGuard,
                functionName: parsedPrices
                    ? "calcCombinedCglbWithPrices"
                    : "getCombinedCglb",
                args: parsedPrices ? [bucketsPACtps] : [],
                resultType: "uint256",
                keys: ["getCombinedCglb"],
            });

            callRequest.push({
                contract: contracts.MocMultiCollateralGuard,
                functionName: parsedPrices
                    ? "calcCombinedCtargemaCAWithPrices"
                    : "getCombinedCtargemaCA",
                args: parsedPrices ? [bucketsPACtps] : [],
                resultType: "uint256",
                keys: ["getCombinedCtargemaCA"],
            });

            callRequest.push({
                contract: contracts.MocMultiCollateralGuard,
                functionName: parsedPrices
                    ? "calcNormalizationFactorsWithPrices"
                    : "getNormalizationFactors",
                args: parsedPrices ? [bucketsPACtps] : [],
                resultType: "uint256[]",
                keys: ["getNormalizationFactors"],
            });
        }

        let PP_CA: ContractInfo | undefined;
        let CA: ContractInfo | undefined;
        let countRC20 = 0;
        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            PP_CA = contracts.PP_CA?.[ca];
            Moc = contracts.Moc?.[ca];
            contractMocType = (
                settings.tokens.CA[ca] as { collateralType: string }
            ).collateralType;

            if (!PP_CA || !Moc) continue;

            if (contractMocType === "coinbase") {
                callRequest.push({
                    contract: Moc,
                    functionName: "getBalance",
                    args: [Moc.address],
                    resultType: "uint256",
                    keys: [ca, "getACBalance"],
                });
            } else {
                CA = contracts.CA?.[countRC20];
                if (CA) {
                    callRequest.push({
                        contract: CA,
                        functionName: "balanceOf",
                        args: [Moc.address],
                        resultType: "uint256",
                        keys: [ca, "getACBalance"],
                    });
                    countRC20++;
                }
            }
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
                keys: [ca, "PP_CA"],
                transform: (result: unknown) => {
                    const tuple = result as [bigint, boolean];
                    return [normalizeToBigInt(tuple[0]), tuple[1]];
                },
            });
        }

        return callRequest;
    }, [contracts, currentBlockNumber, offChainPrices, onChainPrices]);

    // Pass calls into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
        refetchInterval: refetchInterval,
        enabled: callsRequests.length > 0,
        externalData: externalData,
        scopeKey: ["contractProtocolStatus"].join(":"),
    });

    return multicallState as unknown as ContractProtocolStatusResult;
}
