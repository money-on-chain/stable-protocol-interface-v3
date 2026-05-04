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
    parseAmount,
} from "../Borrow/operationUtils";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";
import { getWithdrawCollateralMockRatio } from "../mocks/borrowOperationMockFormulas";

interface BorrowWithdrawCollateralProps {
    card: BorrowCardData;
    onBack: () => void;
}

const QUICK_ACTIONS = [25, 50, 75, 100];
const EPSILON = 0.001;

function getMetricNumber(value: string): number {
    return parseAmount(value).value;
}

function formatMetric(metric: BorrowOperationMetric, value: number): string {
    const pattern = metric.currentValue.includes("- -")
        ? metric.nextValue
        : metric.currentValue;

    return formatMetricValue(pattern, value);
}

function getWorseningLiquidationPriceState(
    metric: BorrowOperationMetric,
    ratio: number
): { nextValue: string; trend?: BorrowMetricTrend } {
    if (ratio <= EPSILON) {
        return {
            nextValue: metric.currentValue,
            trend: metric.showTrend ? "neutral" : undefined,
        };
    }

    const currentValue = getMetricNumber(metric.currentValue);
    const targetValue = getMetricNumber(metric.nextValue);
    const metricDelta = Math.abs(currentValue - targetValue);

    return {
        nextValue: formatMetric(metric, currentValue + metricDelta * ratio),
        trend: metric.showTrend ? "negative" : undefined,
    };
}

function getWorseningDistanceToLiquidationState(
    metric: BorrowOperationMetric,
    ratio: number
): { nextValue: string; trend?: BorrowMetricTrend } {
    if (ratio <= EPSILON) {
        return {
            nextValue: metric.currentValue,
            trend: metric.showTrend ? "neutral" : undefined,
        };
    }

    const currentValue = getMetricNumber(metric.currentValue);
    const targetValue = getMetricNumber(metric.nextValue);
    const metricDelta = Math.abs(currentValue - targetValue);

    return {
        nextValue: formatMetric(
            metric,
            Math.max(0, currentValue - metricDelta * ratio)
        ),
        trend: metric.showTrend ? "negative" : undefined,
    };
}

function getNeutralMetricState(metric: BorrowOperationMetric): {
    nextValue: string;
    trend?: BorrowMetricTrend;
} {
    return {
        nextValue: metric.currentValue,
        trend: metric.showTrend ? "neutral" : undefined,
    };
}

function getWorseningBorrowAvailableState(
    metric: BorrowOperationMetric,
    ratio: number
): { nextValue: string; trend?: BorrowMetricTrend } {
    if (ratio <= EPSILON) {
        return {
            nextValue: metric.currentValue,
            trend: metric.showTrend ? "neutral" : undefined,
        };
    }

    const currentValue = getMetricNumber(metric.currentValue);
    const targetValue = getMetricNumber(metric.nextValue);
    const metricDelta = Math.abs(currentValue - targetValue);

    return {
        nextValue: formatMetric(
            metric,
            Math.max(0, currentValue - metricDelta * ratio)
        ),
        trend: metric.showTrend ? "negative" : undefined,
    };
}

function getWorseningBorrowUsageState(
    metric: BorrowOperationMetric,
    ratio: number
): { nextValue: string; trend?: BorrowMetricTrend } {
    if (ratio <= EPSILON) {
        return {
            nextValue: metric.currentValue,
            trend: metric.showTrend ? "neutral" : undefined,
        };
    }

    const currentValue = getMetricNumber(metric.currentValue);
    const targetValue = getMetricNumber(metric.nextValue);
    const metricDelta = Math.abs(currentValue - targetValue);

    return {
        nextValue: formatMetric(metric, currentValue + metricDelta * ratio),
        trend: metric.showTrend ? "negative" : undefined,
    };
}

export default function BorrowWithdrawCollateral({
    card,
    onBack,
}: BorrowWithdrawCollateralProps): React.ReactElement {
    const [collateralAmount, setCollateralAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();

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
    const withdrawalRatio = getWithdrawCollateralMockRatio(
        collateralAmountValue.value,
        depositedCollateralValue.value
    );

    const handleQuickAction = (percentage: number) => {
        const nextAmount =
            percentage === 100
                ? depositedCollateralValue.value
                : depositedCollateralValue.value * (percentage / 100);

        setCollateralAmount(formatAmount(nextAmount));
    };

    const handleUseMaxCollateral = () => {
        setCollateralAmount(formatAmount(depositedCollateralValue.value));
    };

    const [
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        minRequiredCollateralMetric,
        borrowAvailableMetric,
        borrowUsageMetric,
    ] = card.depositCollateralOperationMetrics;

    const liquidationPriceState = liquidationPriceMetric
        ? getWorseningLiquidationPriceState(
              liquidationPriceMetric,
              withdrawalRatio
          )
        : null;
    const distanceToLiquidationState = distanceToLiquidationMetric
        ? getWorseningDistanceToLiquidationState(
              distanceToLiquidationMetric,
              withdrawalRatio
          )
        : null;
    const borrowAvailableState = borrowAvailableMetric
        ? getWorseningBorrowAvailableState(
              borrowAvailableMetric,
              withdrawalRatio
          )
        : null;
    const borrowUsageState = borrowUsageMetric
        ? getWorseningBorrowUsageState(borrowUsageMetric, withdrawalRatio)
        : null;

    const noticeLines = hasPendingChanges
        ? (() => {
              return [
                  `${t("borrowing.sectionWithdrawCollateral.summary.txtWithdrawingCollateral")}: ${collateralAmount} ${card.collateralTokenTicker}.`,
                  liquidationPriceMetric
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liquidationPriceState?.nextValue} ${liquidationPriceMetric.nextUnit}.`
                      : null,
                  borrowAvailableMetric
                      ? `${t("borrowing.labelAvailableWithCollateral")}: ${borrowAvailableState?.nextValue} ${borrowAvailableMetric.nextUnit}.`
                      : null,
                  t("borrowing.risk.increase"),
              ].filter(Boolean);
          })()
        : [t("borrowing.sectionWithdrawCollateral.summary.txtEnterAmount")];

    return (
        <div className="layout-card borrow-withdraw-collateral-view">
            <div className="layout-card-title borrow-withdraw-collateral-title">
                <h1>{t("borrowing.sectionWithdrawCollateral.cardTitle")}</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="borrow-withdraw-collateral-body">
                <div className="borrow-withdraw-collateral-main">
                    <div className="borrow-withdraw-collateral-panel">
                        <div className="borrow-withdraw-collateral-panel__columns">
                            <div className="borrow-withdraw-collateral-panel__column borrow-withdraw-collateral-panel__column--secondary">
                                <CompactMetricDisplay
                                    label={t("borrowing.labelCurrentDebt")}
                                    value={card.currentDebt.value}
                                    valueLabel={card.currentDebt.ticker}
                                />
                            </div>

                            <div className="borrow-withdraw-collateral-panel__column borrow-withdraw-collateral-panel__column--primary">
                                <CompactMetricDisplay
                                    label={t("borrowing.labelDepositedCollateral")}
                                    value={card.depositedCollateral.value}
                                    valueLabel={card.depositedCollateral.ticker}
                                />

                                <TokenAmountInput
                                    feedbackMessage={
                                        hasCollateralLimitError
                                            ? t(
                                                  "borrowing.sectionWithdrawCollateral.feedbackCollateralLimit"
                                              )
                                            : undefined
                                    }
                                    feedbackState="negative"
                                    getFiatEquivalent={getFiatEquivalent}
                                    inputValue={collateralAmount}
                                    label={t(
                                        "borrowing.sectionWithdrawCollateral.labelAmountToWithdraw"
                                    )}
                                    onMaxClick={handleUseMaxCollateral}
                                    onQuickActionClick={handleQuickAction}
                                    onValueChange={setCollateralAmount}
                                    quickActions={QUICK_ACTIONS.filter(
                                        (percentage) => percentage !== 100
                                    )}
                                    showMaxShortcut
                                    testId="borrow-withdraw-collateral-input"
                                    tokenIconClassName={
                                        card.collateralTokenIconClassName
                                    }
                                    tokenLabel={card.collateralTokenTicker}
                                    validateError={hasCollateralLimitError}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="borrow-withdraw-collateral-metrics">
                    <div className="borrow-withdraw-collateral-metrics__row borrow-withdraw-collateral-metrics__row--top">
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
                                        ? getNeutralMetricState(
                                              minRequiredCollateralMetric
                                          ).nextValue
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

                    <div className="borrow-withdraw-collateral-metrics__row borrow-withdraw-collateral-metrics__row--bottom">
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
                                  "borrowing.sectionWithdrawCollateral.summary.titleReady"
                              )
                            : t(
                                  "borrowing.sectionWithdrawCollateral.summary.titleNoAmount"
                              )
                    }
                >
                    <div className="borrow-withdraw-collateral-notice-lines">
                        {noticeLines.map((line, index) => (
                            <div key={`${line}-${index}`}>{line}</div>
                        ))}
                    </div>
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button borrow-withdraw-collateral-actions__confirm"
                        disabled={!hasPendingChanges || hasValidationError}
                        type="button"
                    >
                        {t("borrowing.cta.confirm")}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
