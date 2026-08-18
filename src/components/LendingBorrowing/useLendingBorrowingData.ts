import React from "react";
import { formatUnits } from "viem";

import { useWalletContext } from "../../context/Wallet";
import { ConvertAmountLending } from "../../helpers/currencies";
import { useLiquidationHistory } from "../../hooks/useLiquidationHistory";
import settings from "../../settings";
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
        address,
        contractsAddress,
        contractLendingStatus,
        contractProtocolStatus,
        contractProtocolStatusV1,
        userLending,
        userBalance,
        userBaseCoinBalance,
    } = useWalletContext();

    const liquidationHistory = useLiquidationHistory(address);

    const tokens = (settings as { tokens?: unknown }).tokens as SettingsTokens | undefined;
    const lmData = contractLendingStatus.data?.lendingmanager;
    // pools is built as numeric-keyed object by useMultiCall; index access works the same
    const pools = lmData?.pools as unknown as Record<number, LendingPoolStatus> | undefined;

    const toUsd = React.useCallback(
        (tokenCode: string, amount: bigint, caIndex: number): bigint =>
            ConvertAmountLending(
                contractProtocolStatus,
                contractProtocolStatusV1,
                tokenCode,
                "USD",
                amount,
                caIndex
            ),
        [contractProtocolStatus, contractProtocolStatusV1]
    );

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

            const depositedTpUsd = toUsd(tokenCode, depositedTp, 0);

            return {
                id: `lend-tp-${tpIndex}`,
                caIndex: 0,
                tokenCode,
                tokenDecimals: meta.visibleDecimals,
                tokenIconClassName: meta.iconClassName,
                tokenName: meta.name,
                tokenTicker: meta.ticker,
                depositedTicker: meta.ticker,
                supplyApy: fmtWadPct(pool?.getBorrowFee ?? 0n),
                depositedAmount: fmtBigInt(depositedTp, 18, meta.visibleDecimals),
                depositedAmountUsd: fmtBigInt(depositedTpUsd),
                availableToWithdrawAmount: fmtBigInt(depositedTp, 18, meta.visibleDecimals),
                availableToWithdrawAmountUsd: fmtBigInt(depositedTpUsd),
                walletBalance: fmtBigInt(tpBalance, 18, meta.visibleDecimals),
            };
        });
    }, [contractsAddress, toUsd, pools, userLending.data, userBalance.data, tokens]);

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
                const minCov = pool?.getMinCoverage ?? 0n;
                const borrowFee = pool?.getBorrowFee ?? 0n;

                const tpAddress = contractsAddress.TP[tp].address.toLowerCase();
                const mocAddress = contractsAddress.Moc[ca].address.toLowerCase();
                const liqKey = `${tpAddress}-${mocAddress}`;

                const vault = userLending.data?.[tp]?.[ca];
                const creditUnits = vault?.getUserVaultCreditBalance ?? 0n;
                const acBalance = vault?.getUserVaultACBalance ?? 0n;
                const maxBorrow = vault?.getMaxTPToBorrow ?? 0n;
                const coverage = vault?.getCoverage ?? 0n;
                const liqPrice = vault?.getLiquidationPrice ?? 0n;
                const maxACToRemove = vault?.getMaxACToRemove ?? 0n;

                const debtTp = mulWad(creditUnits, priceCreditUnit);
                // Coinbase collateral (e.g. RBTC on moc-v1) has no ERC-20 contract,
                // so useUserBalance never populates `.CA[ca]` for it — the native
                // balance lives in userBaseCoinBalance instead (same source Send/
                // Exchange/Portfolio already use for coinbase balances).
                const isCoinbaseCA = tokens.CA?.[ca]?.collateralType === "coinbase";
                const caWallet = isCoinbaseCA
                    ? (userBaseCoinBalance?.balance ?? 0n)
                    : (userBalance.data?.CA?.[ca]?.balance ?? 0n);
                const tpWallet = userBalance.data?.TP?.[0]?.[tp]?.balance ?? 0n;

                const debtTpUsd = toUsd(borrowTokenCode, debtTp, ca);
                const acBalanceUsd = toUsd(collTokenCode, acBalance, ca);
                const maxBorrowUsd = toUsd(borrowTokenCode, maxBorrow, ca);

                const totalCollateralCA = caWallet + acBalance;
                const maxAvailableTP = ConvertAmountLending(
                    contractProtocolStatus,
                    contractProtocolStatusV1,
                    collTokenCode,
                    borrowTokenCode,
                    totalCollateralCA,
                    ca
                );

                // Use the contract's own reader to get the exact max removable collateral.
                const maxWithdrawableCA = maxACToRemove;
                const maxAvailableUsd = toUsd(borrowTokenCode, maxAvailableTP, ca);

                let liqDropPct = 0;
                if (coverage > 0n && coverage > liquidationCov) {
                    liqDropPct = Number((coverage - liquidationCov) * 10000n / coverage) / 100;
                }

                const bTicker = borrowMeta.ticker;
                const cTicker = collMeta.ticker;
                const liqUnit = `${bTicker}/${cTicker}`;
                const liqVal = fmtBigInt(liqPrice);
                const liqDropVal = liqDropPct.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const collVal = fmtBigInt(acBalance, 18, collMeta.visibleDecimals);
                const debtVal = fmtBigInt(debtTp, 18, borrowMeta.visibleDecimals);
                const maxBorrowVal = fmtBigInt(maxBorrow, 18, borrowMeta.visibleDecimals);
                const totalCapacity = debtTp + maxBorrow;
                const usagePct = totalCapacity > 0n
                    ? ((Number(debtTp) / Number(totalCapacity)) * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "0.00";

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
                        currentUnit: "%", currentValue: liqDropVal,
                        nextUnit: "%", nextValue: liqDropVal, showTrend: true,
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
                        currentUnit: "%", currentValue: usagePct,
                        nextUnit: "%", nextValue: usagePct,
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
                        currentUnit: "%", currentValue: liqDropVal,
                        nextUnit: "%", nextValue: liqDropVal, showTrend: true,
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
                        currentUnit: "%", currentValue: usagePct,
                        nextUnit: "%", nextValue: usagePct,
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
                        currentUnit: "%", currentValue: liqDropVal,
                        nextUnit: "%", nextValue: liqDropVal, showTrend: true,
                    },
                    {
                        repayImpact: "neutral" as const,
                        currentUnit: cTicker, currentValue: collVal,
                        nextUnit: cTicker, nextValue: collVal,
                    },
                    {
                        repayImpact: "positive" as const,
                        currentUnit: bTicker, currentValue: maxBorrowVal,
                        nextUnit: bTicker, nextValue: maxBorrowVal,
                    },
                    {
                        repayImpact: "positive" as const,
                        currentUnit: "%", currentValue: usagePct,
                        nextUnit: "%", nextValue: usagePct,
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
                        currentUnit: "%", currentValue: liqDropVal,
                        nextUnit: "%", nextValue: liqDropVal, showTrend: true,
                    },
                    {
                        repayWithCollateralImpact: "negative" as const,
                        currentUnit: cTicker, currentValue: collVal,
                        nextUnit: cTicker, nextValue: "0.00",
                    },
                    {
                        repayWithCollateralImpact: "negative" as const,
                        currentUnit: bTicker, currentValue: maxBorrowVal,
                        nextUnit: bTicker, nextValue: maxBorrowVal,
                    },
                    {
                        repayWithCollateralImpact: "neutral" as const,
                        currentUnit: "%", currentValue: usagePct,
                        nextUnit: "%", nextValue: usagePct,
                    },
                ];

                // Only show previous liquidation when the vault is currently empty
                // (no collateral, no debt). If the user has restarted a position
                // after a liquidation, the notification should disappear.
                const vaultIsEmpty = acBalance === 0n && creditUnits === 0n;
                const liqRecord = vaultIsEmpty ? liquidationHistory.get(liqKey) : undefined;
                const previousLiquidation = liqRecord
                    ? {
                          amount: fmtBigInt(liqRecord.acSeized, 18, collMeta.visibleDecimals),
                          amountTicker: cTicker,
                          liquidationPrice: liqRecord.acSeized > 0n
                              ? fmtBigInt((liqRecord.tpPaid * WAD) / liqRecord.acSeized)
                              : "0.00",
                      }
                    : undefined;

                cards.push({
                    id: `borrow-tp-${tp}-ca-${ca}`,
                    caIndex: ca,
                    isVaultLiquidating: vault?.isVaultLiquidating ?? false,
                    borrowTokenCode,
                    borrowTokenDecimals: borrowMeta.visibleDecimals,
                    borrowTokenIconClassName: borrowMeta.iconClassName,
                    borrowTokenName: borrowMeta.name,
                    borrowTokenTicker: bTicker,
                    collateralTokenCode: collTokenCode,
                    collateralTokenDecimals: collMeta.visibleDecimals,
                    collateralTokenIconClassName: collMeta.iconClassName,
                    collateralTokenName: collMeta.name,
                    collateralTokenTicker: cTicker,
                    borrowApy: fmtWadPct(borrowFee),
                    borrowTokenWalletBalance: fmtBigInt(tpWallet, 18, borrowMeta.visibleDecimals),
                    collateralWalletBalance: fmtBigInt(caWallet, 18, collMeta.visibleDecimals),
                    currentDebt: { value: debtVal, ticker: bTicker, valueUsd: fmtBigInt(debtTpUsd) },
                    depositedCollateral: { value: collVal, ticker: cTicker, valueUsd: fmtBigInt(acBalanceUsd) },
                    maxAvailable: { value: fmtBigInt(maxAvailableTP, 18, borrowMeta.visibleDecimals), ticker: bTicker, valueUsd: fmtBigInt(maxAvailableUsd) },
                    maxWithdrawableCollateral: fmtBigInt(maxWithdrawableCA, 18, collMeta.visibleDecimals),
                    liquidationCoverage: Number(liquidationCov) / 1e18,
                    minCoverage: Number(minCov) / 1e18,
                    liquidationDropPercentage: liqDropPct,
                    systemMaxBorrow: userLending.data != null
                        ? fmtBigInt(maxBorrow, 18, borrowMeta.visibleDecimals)
                        : null,
                    previousLiquidation,
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
    }, [contractsAddress, toUsd, pools, userLending.data, userBalance.data, userBaseCoinBalance?.balance, tokens, liquidationHistory]);

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
