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
import { getRepayWithCollateralRatio } from "../operationPreviewAdapter";

interface BorrowRepayWithCollateralProps {
    card: BorrowCardData;
    onConfirm: (card: BorrowCardData, collateralAmount: string) => void;
    onBack: () => void;
}

const EPSILON = 0.001;

function formatMetric(metric: BorrowOperationMetric, value: number): string {
    const pattern = metric.currentValue.includes("- -")
        ? metric.nextValue
        : metric.currentValue;

    return formatMetricValue(pattern, value);
}

function getCollateralAmountNeededForFullRepay(card: BorrowCardData): string {
    // TODO(api): Replace this mock fallback with the contract/API quote for the
    // exact collateral amount required to fully repay the current debt.
    return formatAmount(parseAmount(card.currentDebt.valueUsd).value);
}

function getRepayWithCollateralMetricState(
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

export default function BorrowRepayWithCollateral({
    card,
    onConfirm,
    onBack,
}: BorrowRepayWithCollateralProps): React.ReactElement {
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();
    const collateralAmount = getCollateralAmountNeededForFullRepay(card);

    const depositedCollateralValue = parseAmount(
        card.depositedCollateral.value
    );
    const collateralAmountValue = parseAmount(collateralAmount);
    const hasTypedAmount = collateralAmount.trim().length > 0;
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
    const cappedCollateralValue = Math.min(
        collateralAmountValue.value,
        depositedCollateralValue.value
    );
    const repayWithCollateralRatio = hasPendingChanges
        ? getRepayWithCollateralRatio(1, 1)
        : getRepayWithCollateralRatio(0, 1);
    const collateralAfterRepayment = Math.max(
        0,
        depositedCollateralValue.value - cappedCollateralValue
    );

    const [
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        minRequiredCollateralMetric,
        borrowAvailableMetric,
        borrowUsageMetric,
    ] = card.repayWithCollateralOperationMetrics;

    const liquidationPriceState = liquidationPriceMetric
        ? getRepayWithCollateralMetricState(
              liquidationPriceMetric,
              repayWithCollateralRatio,
              liquidationPriceMetric.repayWithCollateralImpact
          )
        : null;
    const distanceToLiquidationState = distanceToLiquidationMetric
        ? getRepayWithCollateralMetricState(
              distanceToLiquidationMetric,
              repayWithCollateralRatio,
              distanceToLiquidationMetric.repayWithCollateralImpact
          )
        : null;
    const borrowAvailableState = borrowAvailableMetric
        ? getRepayWithCollateralMetricState(
              borrowAvailableMetric,
              repayWithCollateralRatio,
              borrowAvailableMetric.repayWithCollateralImpact
          )
        : null;
    const borrowUsageState = borrowUsageMetric
        ? getRepayWithCollateralMetricState(
              borrowUsageMetric,
              repayWithCollateralRatio,
              borrowUsageMetric.repayWithCollateralImpact
          )
        : null;

    const noticeLines = hasPendingChanges
        ? (() => {
              const collateralAfterLabel = `${formatAmount(
                  collateralAfterRepayment
              )} ${card.depositedCollateral.ticker}.`;

              return [
                  `${t("borrowing.sectionRepayCollateral.summary.txtUsingCollateral")}: ${collateralAmount} ${card.depositedCollateral.ticker}.`,
                  `${t("borrowing.sectionRepayCollateral.summary.txtDepositedCollateralAfterRepayment")}: ${collateralAfterLabel}`,
                  liquidationPriceMetric
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liquidationPriceState?.nextValue} ${liquidationPriceMetric.nextUnit}.`
                      : null,
                  distanceToLiquidationMetric
                      ? `${t("borrowing.labelDistanceToLiquidation")}: ${distanceToLiquidationState?.nextValue} ${distanceToLiquidationMetric.nextUnit}.`
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
                                    ? t(
                                          "borrowing.sectionRepayCollateral.feedbackCollateralLimit"
                                      )
                                    : undefined
                            }
                            feedbackState="negative"
                            getFiatEquivalent={getFiatEquivalent}
                            inputValue={collateralAmount}
                            label={t(
                                "borrowing.sectionRepayCollateral.labelCollateralForRepay"
                            )}
                            displayOnly
                            showMaxShortcut={false}
                            testId="borrow-repay-with-collateral-input"
                            tokenIconClassName={
                                card.collateralTokenIconClassName
                            }
                            tokenLabel={card.collateralTokenTicker}
                            validateError={hasCollateralLimitError}
                        />
                        <CompactMetricDisplay
                            label={t(
                                "borrowing.sectionRepayCollateral.labelDepositedCollateralAfterRepayment"
                            )}
                            value={formatAmount(collateralAfterRepayment)}
                            valueLabel={card.depositedCollateral.ticker}
                        />
                    </div>
                </div>

                <div className="borrow-repay-with-collateral-metrics">
                    <div className="borrow-repay-with-collateral-metrics__row borrow-repay-with-collateral-metrics__row--top">
                        {liquidationPriceMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid:
                                        hasTypedAmount &&
                                        !collateralAmountValue.isValid,
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
                                        !collateralAmountValue.isValid,
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
                                        !collateralAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: hasPendingChanges
                                        ? minRequiredCollateralMetric.nextUnit
                                        : minRequiredCollateralMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? minRequiredCollateralMetric.nextValue
                                        : minRequiredCollateralMetric.currentValue,
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

                    <div className="borrow-repay-with-collateral-metrics__row borrow-repay-with-collateral-metrics__row--bottom">
                        {borrowAvailableMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid:
                                        hasTypedAmount &&
                                        !collateralAmountValue.isValid,
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
                                        !collateralAmountValue.isValid,
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
                        hasPendingChanges
                            ? t(
                                  "borrowing.sectionRepayCollateral.summary.titleReady"
                              )
                            : t(
                                  "borrowing.sectionRepayCollateral.summary.titleNoAmount"
                              )
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
