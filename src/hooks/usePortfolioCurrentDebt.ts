import type { Abi } from "viem";
import { useReadContract } from "wagmi";

import type { Address, DContracts } from "../types/hooks";

const WAD = 10n ** 18n;
const DOC_VISIBLE_UNIT = 10n ** 16n;

export function usePortfolioCurrentDebt(
    contracts?: DContracts | null,
    userAddress?: Address,
    refetchInterval = 30_000
) {
    const lendingManager = contracts?.LendingManager;
    const tpToken = contracts?.TP?.[0];
    const mocBucket = contracts?.Moc?.[0];
    const enabled =
        lendingManager != null &&
        tpToken != null &&
        mocBucket != null &&
        userAddress != null;

    const creditBalanceQuery = useReadContract({
        address: lendingManager?.address,
        abi: lendingManager?.abi as Abi | undefined,
        functionName: "getUserVaultCreditBalance",
        args: enabled
            ? [userAddress, tpToken.address, mocBucket.address]
            : undefined,
        query: {
            enabled,
            refetchInterval,
            refetchOnMount: "always",
            staleTime: 0,
        },
    });

    const priceCreditUnitQuery = useReadContract({
        address: lendingManager?.address,
        abi: lendingManager?.abi as Abi | undefined,
        functionName: "getPriceCreditUnit",
        args: enabled ? [tpToken.address] : undefined,
        query: {
            enabled,
            refetchInterval,
            refetchOnMount: "always",
            staleTime: 0,
        },
    });

    const creditBalance =
        typeof creditBalanceQuery.data === "bigint"
            ? creditBalanceQuery.data
            : undefined;
    const priceCreditUnit =
        typeof priceCreditUnitQuery.data === "bigint"
            ? priceCreditUnitQuery.data
            : undefined;
    const currentDebt =
        creditBalance === undefined || priceCreditUnit === undefined
            ? undefined
            : (creditBalance * priceCreditUnit) / WAD;

    // L&R presents DOC debt with two decimals and considers 0.00 to be no
    // current debt. Compare against half of the smallest visible unit so this
    // hook follows the same rounding criterion without changing L&R itself.
    const hasCurrentDebt =
        currentDebt === undefined
            ? undefined
            : currentDebt >= DOC_VISIBLE_UNIT / 2n;

    return {
        creditBalanceQuery,
        priceCreditUnitQuery,
        creditBalance,
        currentDebt,
        hasCurrentDebt,
    };
}
