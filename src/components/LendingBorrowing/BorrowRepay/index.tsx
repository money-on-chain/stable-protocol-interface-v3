import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount, TokenSettings } from "../../../helpers/currencies";
import { toBigIntPrecision } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import TokenAmountInput from "../../TokenAmountInput";
import type { BorrowCardData, BorrowOperationMetric } from "../Borrow/data";
import {
    type BorrowMetricTrend,
    formatAmount,
    formatMetricValue,
    getImpactScore,
    parseAmount,
} from "../Borrow/operationUtils";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationCardHeader from "../MiniComponents/OperationCardHeader";
import OperationNotice from "../MiniComponents/OperationNotice";
import { getRepayRatio } from "../operationPreviewAdapter";

interface BorrowRepayProps {
    card: BorrowCardData;
    onConfirm: (card: BorrowCardData, repayAmount: string) => void;
    onBack: () => void;
}

const QUICK_ACTIONS = [25, 50, 75, 100];
const EPSILON = 0.001;

function formatMetric(metric: BorrowOperationMetric, value: number): string {
    const pattern = metric.currentValue.includes("- -")
        ? metric.nextValue
        : metric.currentValue;

    return formatMetricValue(pattern, value);
}

function getRepayMetricState(
    metric: BorrowOperationMetric,
    ratio: number,
    impact?: "positive" | "neutral" | "negative"
): { nextValue: string; trend?: BorrowMetricTrend } {
    if (ratio <= EPSILON) {
        return {
            nextValue: metric.currentValue,
            trend: metric.showTrend ? "neutral" : undefined,
        };
    }

    if (
        metric.currentValue.includes("- -") ||
        metric.nextValue.includes("- -")
    ) {
        return {
            nextValue: metric.nextValue,
            trend: metric.showTrend ? (impact ?? "neutral") : undefined,
        };
    }

    const currentValue = parseAmount(metric.currentValue).value;
    const targetValue = parseAmount(metric.nextValue).value;
    const nextValue = currentValue + (targetValue - currentValue) * ratio;

    return {
        nextValue:
            currentValue === targetValue
                ? metric.currentValue
                : formatMetric(metric, nextValue),
        trend: metric.showTrend
            ? impact === "neutral" || !impact
                ? "neutral"
                : getImpactScore(impact) > 0
                  ? "positive"
                  : "negative"
            : undefined,
    };
}

export default function BorrowRepay({
    card,
    onConfirm,
    onBack,
}: BorrowRepayProps): React.ReactElement {
    const [repayAmount, setRepayAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();

    const currentDebtValue = parseAmount(card.currentDebt.value);
    const repayAmountValue = parseAmount(repayAmount);
    const hasTypedAmount = repayAmount.trim().length > 0;
    const hasDebtLimitError =
        repayAmountValue.isValid &&
        repayAmountValue.value > currentDebtValue.value;
    const hasValidationError = !repayAmountValue.isValid || hasDebtLimitError;
    const hasPendingChanges =
        repayAmountValue.isValid &&
        !hasDebtLimitError &&
        repayAmountValue.value > 0;
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
                card.borrowTokenCode,
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
        [card.borrowTokenCode, card.caIndex, contractProtocolStatus, i18n]
    );
    const cappedRepayValue = Math.min(
        repayAmountValue.value,
        currentDebtValue.value
    );
    const repayRatio = getRepayRatio(cappedRepayValue, currentDebtValue.value);

    const handleQuickAction = (percentage: number) => {
        const nextAmount =
            percentage === 100
                ? currentDebtValue.value
                : currentDebtValue.value * (percentage / 100);

        setRepayAmount(formatAmount(nextAmount));
    };

    const handleRepayInFull = () => {
        setRepayAmount(formatAmount(currentDebtValue.value));
    };

    const [
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        minRequiredCollateralMetric,
        borrowAvailableMetric,
        borrowUsageMetric,
    ] = card.repayOperationMetrics;

    const liquidationPriceState = liquidationPriceMetric
        ? getRepayMetricState(
              liquidationPriceMetric,
              repayRatio,
              liquidationPriceMetric.repayImpact
          )
        : null;
    const distanceToLiquidationState = distanceToLiquidationMetric
        ? getRepayMetricState(
              distanceToLiquidationMetric,
              repayRatio,
              distanceToLiquidationMetric.repayImpact
          )
        : null;
    const borrowAvailableState = borrowAvailableMetric
        ? getRepayMetricState(
              borrowAvailableMetric,
              repayRatio,
              borrowAvailableMetric.repayImpact
          )
        : null;
    const borrowUsageState = borrowUsageMetric
        ? getRepayMetricState(
              borrowUsageMetric,
              repayRatio,
              borrowUsageMetric.repayImpact
          )
        : null;

    const noticeLines = hasPendingChanges
        ? (() => {
              return [
                  `${t("borrowing.sectionRepay.summary.txtRepaying")}: ${repayAmount} ${card.currentDebt.ticker}.`,
                  liquidationPriceMetric
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liquidationPriceState?.nextValue} ${liquidationPriceMetric.nextUnit}.`
                      : null,
                  borrowAvailableMetric
                      ? `${t("borrowing.labelAvailableWithCollateral")}: ${borrowAvailableState?.nextValue} ${borrowAvailableMetric.nextUnit}.`
                      : null,
                  borrowUsageMetric
                      ? `${t("borrowing.labelBorrowUsage")}: ${borrowUsageState?.nextValue} ${borrowUsageMetric.nextUnit}.`
                      : null,
                  t("borrowing.risk.decrease"),
              ].filter(Boolean);
          })()
        : [t("borrowing.sectionRepay.summary.txtEnterAmount")];

    return (
        <div className="layout-card borrow-repay-view">
            <OperationCardHeader
                onBack={onBack}
                title={t("borrowing.sectionRepay.cardTitle")}
            />

            <div className="borrow-repay-body">
                <div className="borrow-repay-main">
                    <div className="borrow-repay-panel">
                        <CompactMetricDisplay
                            label={t("borrowing.labelCurrentDebt")}
                            value={card.currentDebt.value}
                            valueLabel={card.currentDebt.ticker}
                        />
                        <TokenAmountInput
                            feedbackMessage={
                                hasDebtLimitError
                                    ? t(
                                          "borrowing.sectionRepay.feedbackDebtLimit"
                                      )
                                    : undefined
                            }
                            feedbackState="negative"
                            getFiatEquivalent={getFiatEquivalent}
                            inputValue={repayAmount}
                            label={t(
                                "borrowing.sectionRepay.labelAmountToRepay"
                            )}
                            onMaxClick={handleRepayInFull}
                            onQuickActionClick={handleQuickAction}
                            onValueChange={setRepayAmount}
                            quickActions={QUICK_ACTIONS.filter(
                                (percentage) => percentage !== 100
                            )}
                            showMaxShortcut
                            testId="borrow-repay-input"
                            tokenIconClassName={card.borrowTokenIconClassName}
                            tokenLabel={card.borrowTokenTicker}
                            validateError={hasDebtLimitError}
                        />
                    </div>
                </div>

                <div className="borrow-repay-metrics">
                    <div className="borrow-repay-metrics__row borrow-repay-metrics__row--top">
                        {liquidationPriceMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid:
                                        hasTypedAmount &&
                                        !repayAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: hasPendingChanges
                                        ? liquidationPriceMetric.nextUnit
                                        : liquidationPriceMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? (liquidationPriceState?.nextValue ??
                                          liquidationPriceMetric.currentValue)
                                        : liquidationPriceMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: liquidationPriceMetric.currentUnit,
                                    value: liquidationPriceMetric.currentValue,
                                }}
                                title={t("borrowing.labelLiquidationPrice")}
                                trend={
                                    hasPendingChanges &&
                                    liquidationPriceMetric.showTrend
                                        ? liquidationPriceState?.trend
                                        : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {distanceToLiquidationMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid:
                                        hasTypedAmount &&
                                        !repayAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: hasPendingChanges
                                        ? distanceToLiquidationMetric.nextUnit
                                        : distanceToLiquidationMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? (distanceToLiquidationState?.nextValue ??
                                          distanceToLiquidationMetric.currentValue)
                                        : distanceToLiquidationMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: distanceToLiquidationMetric.currentUnit,
                                    value: distanceToLiquidationMetric.currentValue,
                                }}
                                title={t(
                                    "borrowing.labelDistanceToLiquidation"
                                )}
                                trend={
                                    hasPendingChanges &&
                                    distanceToLiquidationMetric.showTrend
                                        ? distanceToLiquidationState?.trend
                                        : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {minRequiredCollateralMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid:
                                        hasTypedAmount &&
                                        !repayAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: hasPendingChanges
                                        ? minRequiredCollateralMetric.nextUnit
                                        : minRequiredCollateralMetric.currentUnit,
                                    value: minRequiredCollateralMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: minRequiredCollateralMetric.currentUnit,
                                    value: minRequiredCollateralMetric.currentValue,
                                }}
                                title={t(
                                    "borrowing.labelMinRequieredCollateral"
                                )}
                                useBorder
                            />
                        ) : null}
                    </div>

                    <div className="borrow-repay-metrics__row borrow-repay-metrics__row--bottom">
                        {borrowAvailableMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid:
                                        hasTypedAmount &&
                                        !repayAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: hasPendingChanges
                                        ? borrowAvailableMetric.nextUnit
                                        : borrowAvailableMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? (borrowAvailableState?.nextValue ??
                                          borrowAvailableMetric.currentValue)
                                        : borrowAvailableMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: borrowAvailableMetric.currentUnit,
                                    value: borrowAvailableMetric.currentValue,
                                }}
                                title={t(
                                    "borrowing.labelAvailableWithCollateral"
                                )}
                                trend={
                                    hasPendingChanges &&
                                    borrowAvailableMetric.showTrend
                                        ? borrowAvailableState?.trend
                                        : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {borrowUsageMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid:
                                        hasTypedAmount &&
                                        !repayAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: hasPendingChanges
                                        ? borrowUsageMetric.nextUnit
                                        : borrowUsageMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? (borrowUsageState?.nextValue ??
                                          borrowUsageMetric.currentValue)
                                        : borrowUsageMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: borrowUsageMetric.currentUnit,
                                    value: borrowUsageMetric.currentValue,
                                }}
                                title={t("borrowing.labelBorrowUsage")}
                                trend={
                                    hasPendingChanges &&
                                    borrowUsageMetric.showTrend
                                        ? borrowUsageState?.trend
                                        : undefined
                                }
                                useBorder
                            />
                        ) : null}
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasDebtLimitError
                            ? t("borrowing.sectionRepay.summary.titleDebtLimit")
                            : hasPendingChanges
                              ? t("borrowing.sectionRepay.summary.titleReady")
                              : t(
                                    "borrowing.sectionRepay.summary.titleNoAmount"
                                )
                    }
                >
                    <div className="borrow-repay-notice-lines">
                        {(hasDebtLimitError
                            ? [t("borrowing.sectionRepay.summary.txtDebtLimit")]
                            : noticeLines
                        ).map((line) => (
                            <div key={line}>{line}</div>
                        ))}
                    </div>
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button secondary"
                        onClick={handleRepayInFull}
                        type="button"
                    >
                        {t("borrowing.sectionRepay.cta.repayInFull")}
                    </button>
                    <button
                        className="button borrow-repay-actions__confirm"
                        disabled={!hasPendingChanges || hasValidationError}
                        onClick={() => onConfirm(card, repayAmount)}
                        type="button"
                    >
                        {hasPendingChanges
                            ? t("borrowing.sectionRepay.cta.ok")
                            : t("borrowing.sectionRepay.cta.noAmount")}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
