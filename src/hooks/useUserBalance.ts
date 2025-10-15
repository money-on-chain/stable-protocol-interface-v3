import { useMemo } from "react";

import settings from "../settings/settings.json";
import type {
    Address,
    CallRequest,
    DContracts,
    MultiCallInput,
    SettingsTokens,
} from "../types/hooks";
import type { UserBalanceResult } from "../types/status";
import { useMultiCall } from "./useMulticall";

/**
 * React hook that wraps useMultiCall to fetch contract/user balances and allowances.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useUserBalance(
    contracts?: DContracts | null,
    userAddress?: Address,
    refetchInterval = 30_000
): UserBalanceResult {
    const callsRequests: CallRequest[] = useMemo(() => {
        if (!contracts) return [];
        if (!userAddress) return [];

        // Safely project tokens from settings.json (no `any` involved)
        const tokens = (settings as { tokens?: unknown }).tokens as
            | SettingsTokens
            | undefined;
        if (!tokens) return [];

        const calls: CallRequest[] = [];

        // ---- CA core tokens: CollateralToken / FeeToken / Moc (arrays) ----
        const hasCAArrays =
            Array.isArray(contracts.Moc) &&
            Array.isArray(contracts.CollateralToken) &&
            Array.isArray(contracts.FeeToken);

        if (hasCAArrays) {
            const caLen = tokens.CA.length;
            for (let ca = 0; ca < caLen; ca++) {
                const Moc = contracts.Moc![ca];
                const CollateralToken = contracts.CollateralToken![ca];
                const FeeToken = contracts.FeeToken![ca];
                if (!Moc || !CollateralToken || !FeeToken) continue;

                // CollateralToken balance/allowance
                calls.push({
                    contract: CollateralToken,
                    functionName: "balanceOf",
                    args: [userAddress],
                    resultType: "uint256",
                    keys: [ca, "TC", "balance"],
                });
                calls.push({
                    contract: CollateralToken,
                    functionName: "allowance",
                    args: [userAddress, Moc.address],
                    resultType: "uint256",
                    keys: [ca, "TC", "allowance"],
                });

                // FeeToken balance/allowance
                calls.push({
                    contract: FeeToken,
                    functionName: "balanceOf",
                    args: [userAddress],
                    resultType: "uint256",
                    keys: [ca, "FeeToken", "balance"],
                });
                calls.push({
                    contract: FeeToken,
                    functionName: "allowance",
                    args: [userAddress, Moc.address],
                    resultType: "uint256",
                    keys: [ca, "FeeToken", "allowance"],
                });
            }
        }

        // ---- TP tokens (matriz CA x TP) ----
        const hasTP =
            Array.isArray(contracts.TP) && Array.isArray(contracts.Moc);
        if (hasTP) {
            const caLen = tokens.CA.length;
            const tpLen = tokens.TP.length;
            for (let ca = 0; ca < caLen; ca++) {
                const Moc = contracts.Moc![ca];
                if (!Moc) continue;
                for (let tp = 0; tp < tpLen; tp++) {
                    const TP = contracts.TP![tp];
                    if (!TP) continue;

                    calls.push({
                        contract: TP,
                        functionName: "balanceOf",
                        args: [userAddress],
                        resultType: "uint256",
                        keys: ["TP", ca, tp, "balance"],
                    });
                    calls.push({
                        contract: TP,
                        functionName: "allowance",
                        args: [userAddress, Moc.address],
                        resultType: "uint256",
                        keys: ["TP", ca, tp, "allowance"],
                    });
                }
            }
        }

        // ---- CA (RC-20 only) balance/allowance contra Moc ----
        // settings.tokens.CA[i].type !== 'coinbase' => pertenece al array CA (ERC-20)
        const hasCA =
            Array.isArray(contracts.CA) && Array.isArray(contracts.Moc);
        if (hasCA) {
            let countRC20 = 0;
            const caLen = tokens.CA.length;
            for (let ca = 0; ca < caLen; ca++) {
                const entryType = tokens.CA[ca]?.type;
                if (entryType === "coinbase") {
                    continue;
                }
                const Moc = contracts.Moc![ca];
                const CA = contracts.CA![countRC20];
                if (!Moc || !CA) continue;

                calls.push({
                    contract: CA,
                    functionName: "balanceOf",
                    args: [userAddress],
                    resultType: "uint256",
                    keys: ["CA", ca, "balance"],
                });
                calls.push({
                    contract: CA,
                    functionName: "allowance",
                    args: [userAddress, Moc.address],
                    resultType: "uint256",
                    keys: ["CA", ca, "allowance"],
                });

                countRC20++;
            }
        }

        // ---- Token migrator (tp_legacy + token_migrator) ----
        if (contracts.tp_legacy && contracts.token_migrator) {
            const tpLegacy = contracts.tp_legacy;
            const tokenMigrator = contracts.token_migrator;

            calls.push({
                contract: tpLegacy,
                functionName: "balanceOf",
                args: [userAddress],
                resultType: "uint256",
                keys: ["tpLegacy", "balance"],
            });
            calls.push({
                contract: tpLegacy,
                functionName: "allowance",
                args: [userAddress, tokenMigrator.address],
                resultType: "uint256",
                keys: ["tpLegacy", "allowance"],
            });
        }

        // ---- Voting app special-case (uses the first CollateralToken)
        if (import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "voting") {
            const firstCT = Array.isArray(contracts.CollateralToken)
                ? contracts.CollateralToken[0]
                : undefined;
            const mocAddress = import.meta.env.REACT_APP_CONTRACT_VETO_MOC as
                | Address
                | undefined;
            if (firstCT) {
                calls.push({
                    contract: firstCT,
                    functionName: "balanceOf",
                    args: [userAddress],
                    resultType: "uint256",
                    keys: [0, "TC", "balance"],
                });

                calls.push({
                    contract: firstCT,
                    functionName: "allowance",
                    args: [userAddress, mocAddress],
                    resultType: "uint256",
                    keys: [0, "TC", "allowance"],
                });
            }
        }

        return calls;
    }, [contracts, userAddress]);

    // Pass callsRequests into your multicall hook
    const multicallState = useMultiCall(callsRequests as MultiCallInput[], {
        refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: ["userBalance", userAddress].join(":"),
    });

    return multicallState as unknown as UserBalanceResult;
}
