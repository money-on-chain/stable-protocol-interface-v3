import { useMemo } from "react";

import type { DContracts, MultiCallInput } from "../types/hooks";
import type { ContractStatusLendingResult } from "../types/status";
import { useMultiCall } from "./useMulticall";

export function useContractLendingStatus(
    contracts?: DContracts,
    refetchInterval = 30_000
): ContractStatusLendingResult {
    const callsRequests = useMemo(() => {
        if (!contracts?.LendingManager) return [];
        if (!contracts?.LendingReader) return [];

        const lm = contracts.LendingManager;
        const lr = contracts.LendingReader;
        const callRequest: MultiCallInput[] = [];

        // Global state
        callRequest.push({
            contract: lm,
            functionName: "paused",
            args: [],
            resultType: "bool",
            keys: ["lendingmanager", "paused"],
        });

        callRequest.push({
            contract: lm,
            functionName: "useQueue",
            args: [],
            resultType: "bool",
            keys: ["lendingmanager", "useQueue"],
        });

        callRequest.push({
            contract: lm,
            functionName: "isEmpty",
            args: [],
            resultType: "bool",
            keys: ["lendingmanager", "isEmpty"],
        });

        callRequest.push({
            contract: lm,
            functionName: "getPendingOperationsCount",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "getPendingOperationsCount"],
        });

        callRequest.push({
            contract: lm,
            functionName: "getPoolsCount",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "getPoolsCount"],
        });

        callRequest.push({
            contract: lm,
            functionName: "firstOperId",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "firstOperId"],
        });

        callRequest.push({
            contract: lm,
            functionName: "operIdCount",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "operIdCount"],
        });

        callRequest.push({
            contract: lm,
            functionName: "maxOperWaitingBlk",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "maxOperWaitingBlk"],
        });

        callRequest.push({
            contract: lm,
            functionName: "minOperWaitingBlk",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "minOperWaitingBlk"],
        });

        callRequest.push({
            contract: lm,
            functionName: "maxOperationPerBatch",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "maxOperationPerBatch"],
        });

        callRequest.push({
            contract: lm,
            functionName: "maxSlippage",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "maxSlippage"],
        });

        callRequest.push({
            contract: lm,
            functionName: "coinbaseForPayExecutions",
            args: [],
            resultType: "uint256",
            keys: ["lendingmanager", "coinbaseForPayExecutions"],
        });

        // Per-pool calls — one entry per TP token
        const tpTokens = contracts.TP ?? [];
        for (let i = 0; i < tpTokens.length; i++) {
            const tpAddress = tpTokens[i].address;

            callRequest.push({
                contract: lm,
                functionName: "getPoolCreditSupply",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getPoolCreditSupply"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getPoolDepositSupply",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getPoolDepositSupply"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getPoolLiquidity",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getPoolLiquidity"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getPoolReserve",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getPoolReserve"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getPriceCreditUnit",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getPriceCreditUnit"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getPriceDepositUnit",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getPriceDepositUnit"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getBorrowFee",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getBorrowFee"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getMinCoverage",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getMinCoverage"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getLiquidationCoverage",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getLiquidationCoverage"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getInjectionRate",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getInjectionRate"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getDeltaPCU",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getDeltaPCU"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getFeeAccrued",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getFeeAccrued"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getNextInjectionTime",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getNextInjectionTime"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getLastUpdateTime",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getLastUpdateTime"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getUKinkPoint",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getUKinkPoint"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getUSoftSlope",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getUSoftSlope"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getUMaxSlope",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getUMaxSlope"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getInjectionTimeSpan",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getInjectionTimeSpan"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getInjectionBaseFactor",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getInjectionBaseFactor"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getBrakeFirstKink",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getBrakeFirstKink"],
            });

            callRequest.push({
                contract: lm,
                functionName: "getBrakeSecondKink",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getBrakeSecondKink"],
            });

            callRequest.push({
                contract: lr,
                functionName: "getUtilizationRate",
                args: [tpAddress],
                resultType: "uint256",
                keys: ["lendingmanager", "pools", i, "getUtilizationRate"],
            });
        }

        return callRequest;
    }, [contracts]);

    const multicallState = useMultiCall(callsRequests, {
        refetchInterval: refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: ["contractLendingStatus"].join(":"),
    });

    return multicallState as unknown as ContractStatusLendingResult;
}
