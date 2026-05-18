import React from "react";
import { formatUnits } from "viem";

import { useWalletContext } from "../../context/Wallet";
import settings from "../../settings/settings.json";
import type { LendingPoolStatus } from "../../types/status";
import type { SettingsTokens } from "../../types/hooks";
import type { BorrowCardData } from "./Borrow/data";
import type { LendCardData } from "./Lend/data";
import { getLendingBorrowingTokenMetadata } from "./tokenMetadata";

const WAD = 10n ** 18n;

interface LendingBorrowingData {
    borrowCards: BorrowCardData[];
    error: Error | null;
    isLoading: boolean;
    lendCards: LendCardData[];
    refetch: () => void;
}

function fmtBigInt(amount: bigint, decimals: number = 18, display: number = 2): string {
    const n = parseFloat(formatUnits(amount, decimals));
    return n.toLocaleString("en-US", {
        minimumFractionDigits: display,
        maximumFractionDigits: display,
    });
}

function fmtWadPct(rate: bigint): string {
    const pct = Number(rate) / 1e16;
    return pct.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mulWad(a: bigint, b: bigint): bigint {
    return a === 0n || b === 0n ? 0n : (a * b) / WAD;
}

export function useLendingBorrowingData(): LendingBorrowingData {
    const {
        contractsAddress,
        contractLendingStatus,
        userLending,
        userBalance,
    } = useWalletContext();

    const tokens = (settings as { tokens?: unknown }).tokens as SettingsTokens | undefined;
    const lmData = contractLendingStatus.data?.lendingmanager;
    // pools is built as numeric-keyed object by useMultiCall; index access works the same
    const pools = lmData?.pools as unknown as Record<number, LendingPoolStatus> | undefined;

    const lendCards: LendCardData[] = React.useMemo((): LendCardData[] => {
        if (!contractsAddress?.TP || !tokens) return [];
        const tpCount = Math.min(contractsAddress.TP.length, tokens.TP?.length ?? 0);

        return Array.from({ length: tpCount }, (_, tpIndex) => {
            const tokenCode = `TP_${tpIndex}`;
            const meta = getLendingBorrowingTokenMetadata(tokenCode);
            const pool = pools?.[tpIndex];

            const priceDepositUnit = pool?.getPriceDepositUnit ?? WAD;
            const depositUnits = userLending.data?.[tpIndex]?.getUserDepositBalance ?? 0n;
            const depositedTp = mulWad(depositUnits, priceDepositUnit);

            const tpBalance = userBalance.data?.TP?.[0]?.[tpIndex]?.balance ?? 0n;

            return {
                id: `lend-tp-${tpIndex}`,
                caIndex: 0,
                tokenCode,
                tokenIconClassName: meta.iconClassName,
                tokenName: meta.name,
                tokenTicker: meta.ticker,
                depositedTicker: meta.ticker,
                supplyApy: fmtWadPct(pool?.getBorrowFee ?? 0n),
                depositedAmount: fmtBigInt(depositedTp),
                depositedAmountUsd: "0",
                availableToWithdrawAmount: fmtBigInt(depositedTp),
                availableToWithdrawAmountUsd: "0",
                walletBalance: fmtBigInt(tpBalance),
            };
        });
    }, [contractsAddress, pools, userLending.data, userBalance.data, tokens]);

    const borrowCards: BorrowCardData[] = React.useMemo((): BorrowCardData[] => {
        if (!contractsAddress?.TP || !contractsAddress?.Moc || !tokens) return [];

        const tpCount = Math.min(contractsAddress.TP.length, tokens.TP?.length ?? 0);
        const caCount = Math.min(contractsAddress.Moc.length, tokens.CA?.length ?? 0);
        const cards: BorrowCardData[] = [];

        for (let tp = 0; tp < tpCount; tp++) {
            for (let ca = 0; ca < caCount; ca++) {
                const borrowTokenCode = `TP_${tp}`;
                const collTokenCode = `CA_${ca}`;
                const borrowMeta = getLendingBorrowingTokenMetadata(borrowTokenCode);
                const collMeta = getLendingBorrowingTokenMetadata(collTokenCode);
                const pool = pools?.[tp];

                const priceCreditUnit = pool?.getPriceCreditUnit ?? WAD;
                const liquidationCov = pool?.getLiquidationCoverage ?? 0n;
                const borrowFee = pool?.getBorrowFee ?? 0n;

                const vault = userLending.data?.[tp]?.[ca];
                const creditUnits = vault?.getUserVaultCreditBalance ?? 0n;
                const acBalance = vault?.getUserVaultACBalance ?? 0n;
                const maxBorrow = vault?.getMaxTPToBorrow ?? 0n;
                const coverage = vault?.getCoverage ?? 0n;
                const liqPrice = vault?.getLiquidationPrice ?? 0n;

                const debtTp = mulWad(creditUnits, priceCreditUnit);
                const caWallet = userBalance.data?.CA?.[ca]?.balance ?? 0n;

                let liqDropPct = 0;
                if (coverage > 0n && coverage > liquidationCov) {
                    liqDropPct = Number((coverage - liquidationCov) * 10000n / coverage) / 100;
                }

                const bTicker = borrowMeta.ticker;
                const cTicker = collMeta.ticker;
                const liqUnit = `${bTicker}/${cTicker}`;
                const liqVal = fmtBigInt(liqPrice);
                const covVal = fmtWadPct(coverage);
                const collVal = fmtBigInt(acBalance);
                const debtVal = fmtBigInt(debtTp);
                const maxBorrowVal = fmtBigInt(maxBorrow);

                const borrowOperationMetrics = [
                    {
                        borrowImpact: "negative" as const,
                        collateralImpact: "positive" as const,
                        currentUnit: liqUnit, currentValue: liqVal,
                        nextUnit: liqUnit, nextValue: liqVal, showTrend: true,
                    },
                    {
                        borrowImpact: "negative" as const,
                        collateralImpact: "positive" as const,
                        currentUnit: "%", currentValue: covVal,
                        nextUnit: "%", nextValue: covVal, showTrend: true,
                    },
                    {
                        borrowImpact: "neutral" as const,
                        collateralImpact: "neutral" as const,
                        currentUnit: cTicker, currentValue: collVal,
                        nextUnit: cTicker, nextValue: collVal,
                    },
                    {
                        borrowImpact: "negative" as const,
                        collateralImpact: "positive" as const,
                        currentUnit: bTicker, currentValue: maxBorrowVal,
                        nextUnit: bTicker, nextValue: "0.00", showTrend: true,
                    },
                    {
                        borrowImpact: "negative" as const,
                        collateralImpact: "positive" as const,
                        currentUnit: "%", currentValue: "0.00",
                        nextUnit: "%", nextValue: "100.00",
                    },
                ];

                const depositCollateralOperationMetrics = [
                    {
                        collateralImpact: "positive" as const,
                        currentUnit: liqUnit, currentValue: liqVal,
                        nextUnit: liqUnit, nextValue: liqVal, showTrend: true,
                    },
                    {
                        collateralImpact: "positive" as const,
                        currentUnit: "%", currentValue: covVal,
                        nextUnit: "%", nextValue: covVal, showTrend: true,
                    },
                    {
                        collateralImpact: "neutral" as const,
                        currentUnit: cTicker, currentValue: collVal,
                        nextUnit: cTicker, nextValue: collVal,
                    },
                    {
                        collateralImpact: "positive" as const,
                        currentUnit: bTicker, currentValue: maxBorrowVal,
                        nextUnit: bTicker, nextValue: maxBorrowVal,
                    },
                    {
                        collateralImpact: "positive" as const,
                        currentUnit: "%", currentValue: "0.00",
                        nextUnit: "%", nextValue: "0.00",
                    },
                ];

                const repayOperationMetrics = [
                    {
                        repayImpact: "positive" as const,
                        currentUnit: liqUnit, currentValue: liqVal,
                        nextUnit: liqUnit, nextValue: liqVal, showTrend: true,
                    },
                    {
                        repayImpact: "positive" as const,
                        currentUnit: "%", currentValue: covVal,
                        nextUnit: "%", nextValue: covVal, showTrend: true,
                    },
                    {
                        repayImpact: "neutral" as const,
                        currentUnit: cTicker, currentValue: collVal,
                        nextUnit: cTicker, nextValue: collVal,
                    },
                    {
                        repayImpact: "positive" as const,
                        currentUnit: bTicker, currentValue: debtVal,
                        nextUnit: bTicker, nextValue: "0.00",
                    },
                    {
                        repayImpact: "positive" as const,
                        currentUnit: "%", currentValue: "0.00",
                        nextUnit: "%", nextValue: "0.00",
                    },
                ];

                const repayWithCollateralOperationMetrics = [
                    {
                        repayWithCollateralImpact: "neutral" as const,
                        currentUnit: liqUnit, currentValue: liqVal,
                        nextUnit: liqUnit, nextValue: liqVal, showTrend: true,
                    },
                    {
                        repayWithCollateralImpact: "neutral" as const,
                        currentUnit: "%", currentValue: covVal,
                        nextUnit: "%", nextValue: covVal, showTrend: true,
                    },
                    {
                        repayWithCollateralImpact: "negative" as const,
                        currentUnit: cTicker, currentValue: collVal,
                        nextUnit: cTicker, nextValue: "0.00",
                    },
                    {
                        repayWithCollateralImpact: "negative" as const,
                        currentUnit: bTicker, currentValue: debtVal,
                        nextUnit: bTicker, nextValue: "0.00",
                    },
                    {
                        repayWithCollateralImpact: "neutral" as const,
                        currentUnit: "%", currentValue: "0.00",
                        nextUnit: "%", nextValue: "0.00",
                    },
                ];

                cards.push({
                    id: `borrow-tp-${tp}-ca-${ca}`,
                    caIndex: ca,
                    borrowTokenCode,
                    borrowTokenIconClassName: borrowMeta.iconClassName,
                    borrowTokenName: borrowMeta.name,
                    borrowTokenTicker: bTicker,
                    collateralTokenCode: collTokenCode,
                    collateralTokenIconClassName: collMeta.iconClassName,
                    collateralTokenName: collMeta.name,
                    collateralTokenTicker: cTicker,
                    borrowApy: fmtWadPct(borrowFee),
                    collateralWalletBalance: fmtBigInt(caWallet),
                    currentDebt: { value: debtVal, ticker: bTicker, valueUsd: "0" },
                    depositedCollateral: { value: collVal, ticker: cTicker, valueUsd: "0" },
                    maxAvailable: { value: maxBorrowVal, ticker: bTicker, valueUsd: "0" },
                    liquidationDropPercentage: liqDropPct,
                    borrowOperationMetrics,
                    depositCollateralOperationMetrics,
                    repayOperationMetrics,
                    repayWithCollateralOperationMetrics,
                    actions: [
                        { id: "borrow", isPrimary: true },
                        { id: "repay" },
                        { id: "repay-with-collateral" },
                        { id: "deposit-collateral" },
                        { id: "withdraw-collateral" },
                    ],
                });
            }
        }
        return cards;
    }, [contractsAddress, pools, userLending.data, userBalance.data, tokens]);

    const refetch = React.useCallback(() => {
        void contractLendingStatus.refetch?.();
        void userLending.refetch?.();
        void userBalance.refetch?.();
    }, [contractLendingStatus, userLending, userBalance]);

    return {
        borrowCards,
        error: null,
        isLoading: contractLendingStatus.isLoading || userLending.isLoading,
        lendCards,
        refetch,
    };
}
