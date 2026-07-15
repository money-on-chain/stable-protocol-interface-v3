import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount, TokenSettings } from "../../../helpers/currencies";
import { toBigIntPrecision } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import TokenAmountInput from "../../TokenAmountInput";
import type { BorrowCardData } from "../Borrow/data";
import {
    type BorrowMetricTrend,
    formatAmount,
    parseAmount,
} from "../Borrow/operationUtils";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationCardHeader from "../MiniComponents/OperationCardHeader";
import OperationNotice from "../MiniComponents/OperationNotice";

interface BorrowRepayWithCollateralProps {
    card: BorrowCardData;
    onConfirm: (card: BorrowCardData, collateralAmount: string) => void;
    onBack: () => void;
}

const EPSILON = 0.001;

export default function BorrowRepayWithCollateral({
    card,
    onConfirm,
    onBack,
}: BorrowRepayWithCollateralProps): React.ReactElement {
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();

    // Auto-compute collateral needed to repay the full debt
    const collateralAmount = React.useMemo(() => {
        const debtValue = parseAmount(card.currentDebt.value).value;
        if (debtValue <= 0 || !contractProtocolStatus.data) return "0.00";
        const debtBigInt = toBigIntPrecision(debtValue);
        const collateralBigInt = ConvertAmount(
            contractProtocolStatus,
            card.borrowTokenCode,
            card.collateralTokenCode,
            debtBigInt,
            card.caIndex
        );
        return formatAmount(Number(collateralBigInt) / 1e18, card.collateralTokenDecimals);
    }, [card, contractProtocolStatus]);

    const depositedCollateralValue = parseAmount(card.depositedCollateral.value);
    const collateralAmountValue = parseAmount(collateralAmount);
    const hasCollateralLimitError =
        collateralAmountValue.isValid &&
        collateralAmountValue.value > depositedCollateralValue.value;
    const hasValidationError =
        !collateralAmountValue.isValid || hasCollateralLimitError;
    const hasPendingChanges =
        collateralAmountValue.isValid &&
        !hasCollateralLimitError &&
        collateralAmountValue.value > 0;

    const getFiatEquivalent = React.useCallback(
        (value: number) => {
            const amountBigInt = toBigIntPrecision(value);

            if (amountBigInt < 0n || !contractProtocolStatus.data) {
                return PrecisionNumbers({
                    amount: 0n,
                    token: TokenSettings("CA_0"),
                    decimals: 2,
                    i18n,
                    isUSD: true,
                    compact: true,
                });
            }

            const amountUSD = ConvertAmount(
                contractProtocolStatus,
                card.collateralTokenCode,
                "USD",
                amountBigInt,
                card.caIndex
            );

            return PrecisionNumbers({
                amount: amountUSD,
                token: TokenSettings("CA_0"),
                decimals: 2,
                i18n,
                isUSD: true,
                compact: true,
            });
        },
        [card.caIndex, card.collateralTokenCode, contractProtocolStatus, i18n]
    );

    const [
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        minRequiredCollateralMetric,
        borrowAvailableMetric,
        borrowUsageMetric,
    ] = card.repayWithCollateralOperationMetrics;

    const existingCA = depositedCollateralValue.value;
    const collateralNeeded = collateralAmountValue.isValid ? collateralAmountValue.value : 0;
    const remainingCA = Math.max(0, existingCA - collateralNeeded);
    const currentMaxBorrow = parseAmount(borrowAvailableMetric?.currentValue ?? "0").value;
    const currentBorrowUsage = parseAmount(borrowUsageMetric?.currentValue ?? "0").value;
    const currentLiqPrice = parseAmount(liquidationPriceMetric?.currentValue ?? "0").value;
    const currentLiqDrop = parseAmount(distanceToLiquidationMetric?.currentValue ?? "0").value;

    // After repaying with collateral: debt = 0, remainingCA = existingCA - collateralNeeded
    const {
        liqPriceAfter, liqPriceAfterTrend,
        liqDistanceAfter, liqDistanceAfterTrend,
        borrowAvailableAfter, borrowAvailableAfterTrend,
        borrowUsageAfter, borrowUsageAfterTrend,
        collateralAfter,
    } = React.useMemo(() => {
        if (!hasPendingChanges) return {};

        const result: {
            liqPriceAfter?: string;
            liqPriceAfterTrend?: BorrowMetricTrend;
            liqDistanceAfter?: string;
            liqDistanceAfterTrend?: BorrowMetricTrend;
            borrowAvailableAfter?: string;
            borrowAvailableAfterTrend?: BorrowMetricTrend;
            borrowUsageAfter?: string;
            borrowUsageAfterTrend?: BorrowMetricTrend;
            collateralAfter?: string;
        } = {};

        // Debt becomes 0 — no liquidation risk
        result.liqPriceAfter = formatAmount(0, 2);
        result.liqPriceAfterTrend = currentLiqPrice > EPSILON ? "positive" : "neutral";
        result.liqDistanceAfter = formatAmount(100, 2);
        result.liqDistanceAfterTrend = currentLiqDrop < 100 - EPSILON ? "positive" : "neutral";

        // Remaining collateral after repay
        result.collateralAfter = formatAmount(remainingCA, card.collateralTokenDecimals);

        // Borrow available on remaining collateral (formula-based, debt = 0)
        if (remainingCA > 0 && card.liquidationCoverage > 0 && contractProtocolStatus.data) {
            const remainingTP = Number(ConvertAmount(
                contractProtocolStatus,
                card.collateralTokenCode,
                card.borrowTokenCode,
                toBigIntPrecision(remainingCA),
                card.caIndex
            )) / 1e18;
            const newMaxBorrow = remainingTP / card.liquidationCoverage;
            result.borrowAvailableAfter = formatAmount(newMaxBorrow, card.borrowTokenDecimals);
            result.borrowAvailableAfterTrend = (newMaxBorrow > currentMaxBorrow + EPSILON ? "positive"
                : newMaxBorrow < currentMaxBorrow - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
        } else {
            result.borrowAvailableAfter = formatAmount(0, card.borrowTokenDecimals);
            result.borrowAvailableAfterTrend = currentMaxBorrow > EPSILON ? "negative" : "neutral";
        }

        // Usage = 0 (debt is 0)
        result.borrowUsageAfter = formatAmount(0, 2);
        result.borrowUsageAfterTrend = currentBorrowUsage > EPSILON ? "positive" : "neutral";

        return result;
    }, [
        hasPendingChanges, remainingCA, existingCA,
        card.liquidationCoverage, card.collateralTokenCode, card.borrowTokenCode,
        card.caIndex, card.borrowTokenDecimals, card.collateralTokenDecimals,
        currentLiqPrice, currentLiqDrop, currentMaxBorrow, currentBorrowUsage,
        contractProtocolStatus,
    ]);

    const collateralAfterRepayment = remainingCA;

    const noticeLines = hasPendingChanges
        ? (() => {
              return [
                  `${t("borrowing.sectionRepayCollateral.summary.txtUsingCollateral")}: ${collateralAmount} ${card.depositedCollateral.ticker}.`,
                  `${t("borrowing.sectionRepayCollateral.summary.txtDepositedCollateralAfterRepayment")}: ${formatAmount(collateralAfterRepayment, card.collateralTokenDecimals)} ${card.depositedCollateral.ticker}.`,
                  liqPriceAfter !== undefined
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liqPriceAfter} ${card.borrowTokenTicker}/${card.collateralTokenTicker}.`
                      : null,
                  liqDistanceAfter !== undefined
                      ? `${t("borrowing.labelDistanceToLiquidation")}: ${liqDistanceAfter}%.`
                      : null,
                  t("borrowing.risk.neutral"),
              ].filter(Boolean);
          })()
        : [t("borrowing.sectionRepayCollateral.summary.txtEnterAmount")];

    return (
        <div className="layout-card borrow-repay-with-collateral-view">
            <OperationCardHeader
                onBack={onBack}
                title={t("borrowing.sectionRepayCollateral.cardTitle")}
            />

            <div className="borrow-repay-with-collateral-body">
                <div className="borrow-repay-with-collateral-main">
                    <div className="borrow-repay-with-collateral-panel">
                        <CompactMetricDisplay
                            label={t("borrowing.labelCurrentDebt")}
                            value={card.currentDebt.value}
                            valueLabel={card.currentDebt.ticker}
                        />
                        <TokenAmountInput
                            feedbackMessage={
                                hasCollateralLimitError
                                    ? t("borrowing.sectionRepayCollateral.feedbackCollateralLimit")
                                    : undefined
                            }
                            feedbackState="negative"
                            getFiatEquivalent={getFiatEquivalent}
                            inputValue={collateralAmount}
                            label={t("borrowing.sectionRepayCollateral.labelCollateralForRepay")}
                            displayOnly
                            showMaxShortcut={false}
                            testId="borrow-repay-with-collateral-input"
                            tokenIconClassName={card.collateralTokenIconClassName}
                            tokenLabel={card.collateralTokenTicker}
                            validateError={hasCollateralLimitError}
                        />
                        <CompactMetricDisplay
                            label={t("borrowing.sectionRepayCollateral.labelDepositedCollateralAfterRepayment")}
                            value={formatAmount(collateralAfterRepayment, card.collateralTokenDecimals)}
                            valueLabel={card.depositedCollateral.ticker}
                        />
                    </div>
                </div>

                <div className="borrow-repay-with-collateral-metrics">
                    <div className="borrow-repay-with-collateral-metrics__row borrow-repay-with-collateral-metrics__row--top">
                        {liquidationPriceMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
                                    unit: liquidationPriceMetric.currentUnit,
                                    value: hasPendingChanges && liqPriceAfter !== undefined
                                        ? liqPriceAfter
                                        : liquidationPriceMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: liquidationPriceMetric.currentUnit,
                                    value: liquidationPriceMetric.currentValue,
                                }}
                                title={t("borrowing.labelLiquidationPrice")}
                                trend={hasPendingChanges && liquidationPriceMetric.showTrend && liqPriceAfterTrend !== undefined
                                    ? liqPriceAfterTrend
                                    : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {distanceToLiquidationMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
                                    unit: distanceToLiquidationMetric.currentUnit,
                                    value: hasPendingChanges && liqDistanceAfter !== undefined
                                        ? liqDistanceAfter
                                        : distanceToLiquidationMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: distanceToLiquidationMetric.currentUnit,
                                    value: distanceToLiquidationMetric.currentValue,
                                }}
                                title={t("borrowing.labelDistanceToLiquidation")}
                                trend={hasPendingChanges && distanceToLiquidationMetric.showTrend && liqDistanceAfterTrend !== undefined
                                    ? liqDistanceAfterTrend
                                    : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {minRequiredCollateralMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
                                    unit: minRequiredCollateralMetric.currentUnit,
                                    value: hasPendingChanges && collateralAfter !== undefined
                                        ? collateralAfter
                                        : minRequiredCollateralMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: minRequiredCollateralMetric.currentUnit,
                                    value: minRequiredCollateralMetric.currentValue,
                                }}
                                title={t("borrowing.labelMinRequieredCollateral")}
                                trend={hasPendingChanges && collateralAfter !== undefined
                                    ? (remainingCA < existingCA - EPSILON ? "negative" : "neutral")
                                    : undefined
                                }
                                useBorder
                            />
                        ) : null}
                    </div>

                    <div className="borrow-repay-with-collateral-metrics__row borrow-repay-with-collateral-metrics__row--bottom">
                        {borrowAvailableMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
                                    unit: borrowAvailableMetric.currentUnit,
                                    value: hasPendingChanges && borrowAvailableAfter !== undefined
                                        ? borrowAvailableAfter
                                        : borrowAvailableMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: borrowAvailableMetric.currentUnit,
                                    value: borrowAvailableMetric.currentValue,
                                }}
                                title={t("borrowing.labelAvailableWithCollateral")}
                                trend={hasPendingChanges && borrowAvailableMetric.showTrend && borrowAvailableAfterTrend !== undefined
                                    ? borrowAvailableAfterTrend
                                    : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {borrowUsageMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
                                    unit: borrowUsageMetric.currentUnit,
                                    value: hasPendingChanges && borrowUsageAfter !== undefined
                                        ? borrowUsageAfter
                                        : borrowUsageMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: borrowUsageMetric.currentUnit,
                                    value: borrowUsageMetric.currentValue,
                                }}
                                title={t("borrowing.labelBorrowUsage")}
                                trend={hasPendingChanges && borrowUsageMetric.showTrend && borrowUsageAfterTrend !== undefined
                                    ? borrowUsageAfterTrend
                                    : undefined
                                }
                                useBorder
                            />
                        ) : null}
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasPendingChanges
                            ? t("borrowing.sectionRepayCollateral.summary.titleReady")
                            : t("borrowing.sectionRepayCollateral.summary.titleNoAmount")
                    }
                >
                    <div className="borrow-repay-with-collateral-notice-lines">
                        {noticeLines.map((line, index) => (
                            <div key={`${line}-${index}`}>{line}</div>
                        ))}
                    </div>
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button borrow-repay-with-collateral-actions__confirm"
                        disabled={!hasPendingChanges || hasValidationError}
                        onClick={() => onConfirm(card, collateralAmount)}
                        type="button"
                    >
                        {t("borrowing.cta.confirm")}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
