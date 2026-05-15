import { useMemo } from "react";

import settings from "../settings/settings.json";
import type {
    Address,
    DContracts,
    MultiCallInput,
    SettingsTokens,
} from "../types/hooks";
import type { UserLendingResult } from "../types/status";
import { useMultiCall } from "./useMulticall";

export function useUserLending(
    contracts?: DContracts | null,
    userAddress?: Address,
    refetchInterval = 30_000
): UserLendingResult {
    const callsRequests: MultiCallInput[] = useMemo(() => {
        if (!contracts?.LendingManager) return [];
        if (!contracts?.LendingReader) return [];
        if (!userAddress) return [];

        const tokens = (settings as { tokens?: unknown }).tokens as
            | SettingsTokens
            | undefined;
        if (!tokens) return [];

        const lm = contracts.LendingManager;
        const lr = contracts.LendingReader;
        const tpTokens = contracts.TP ?? [];
        const mocBuckets = contracts.Moc ?? [];
        const calls: MultiCallInput[] = [];

        for (let tp = 0; tp < tpTokens.length; tp++) {
            const tpAddress = tpTokens[tp].address;

            // TP allowance for deposit (user must approve LendingManager)
            calls.push({
                contract: tpTokens[tp],
                functionName: "allowance",
                args: [userAddress, lm.address],
                resultType: "uint256",
                keys: [tp, "tpAllowance"],
            });

            // Deposit balance in the lending pool (no mocBucket needed)
            calls.push({
                contract: lm,
                functionName: "getUserDepositBalance",
                args: [userAddress, tpAddress],
                resultType: "uint256",
                keys: [tp, "getUserDepositBalance"],
            });

            // Per-vault calls: one vault per (tpToken, mocBucket)
            for (let ca = 0; ca < mocBuckets.length; ca++) {
                const mocAddress = mocBuckets[ca].address;

                calls.push({
                    contract: lm,
                    functionName: "getUserVaultACBalance",
                    args: [userAddress, tpAddress, mocAddress],
                    resultType: "uint256",
                    keys: [tp, ca, "getUserVaultACBalance"],
                });

                calls.push({
                    contract: lm,
                    functionName: "getUserVaultCreditBalance",
                    args: [userAddress, tpAddress, mocAddress],
                    resultType: "uint256",
                    keys: [tp, ca, "getUserVaultCreditBalance"],
                });

                calls.push({
                    contract: lm,
                    functionName: "isVaultLiquidating",
                    args: [userAddress, tpAddress, mocAddress],
                    resultType: "bool",
                    keys: [tp, ca, "isVaultLiquidating"],
                });

                calls.push({
                    contract: lr,
                    functionName: "getCoverage",
                    args: [userAddress, tpAddress, mocAddress],
                    resultType: "uint256",
                    keys: [tp, ca, "getCoverage"],
                });

                calls.push({
                    contract: lr,
                    functionName: "getLiquidationPrice",
                    args: [userAddress, tpAddress, mocAddress],
                    resultType: "uint256",
                    keys: [tp, ca, "getLiquidationPrice"],
                });

                calls.push({
                    contract: lr,
                    functionName: "getMaxACToRemove",
                    args: [userAddress, tpAddress, mocAddress],
                    resultType: "uint256",
                    keys: [tp, ca, "getMaxACToRemove"],
                });

                calls.push({
                    contract: lr,
                    functionName: "getMaxTPToBorrow",
                    args: [userAddress, tpAddress, mocAddress],
                    resultType: "uint256",
                    keys: [tp, ca, "getMaxTPToBorrow"],
                });

                calls.push({
                    contract: lr,
                    functionName: "isVaultLiquidable",
                    args: [userAddress, tpAddress, mocAddress],
                    resultType: "bool",
                    keys: [tp, ca, "isVaultLiquidable"],
                });
            }
        }

        return calls;
    }, [contracts, userAddress]);

    const multicallState = useMultiCall(callsRequests, {
        refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: ["userLending", userAddress].join(":"),
    });

    return multicallState as unknown as UserLendingResult;
}
