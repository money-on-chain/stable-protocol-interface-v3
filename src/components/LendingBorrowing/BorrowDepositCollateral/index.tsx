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
import { getDepositCollateralRatio } from "../operationPreviewAdapter";

interface BorrowDepositCollateralProps {
    card: BorrowCardData;
    onConfirm: (card: BorrowCardData, collateralAmount: string, onSuccess?: () => void) => void;
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

function getPositiveMetricState(
    metric: BorrowOperationMetric,
    ratio: number
): { nextValue: string; trend?: BorrowMetricTrend } {
    if (ratio <= EPSILON) {
        return {
            nextValue: metric.currentValue,
            trend: metric.showTrend ? "neutral" : undefined,
        };
    }

    if (metric.currentValue.includes("- -")) {
        return {
            nextValue: metric.nextValue,
            trend: metric.showTrend ? "positive" : undefined,
        };
    }

    const currentValue = getMetricNumber(metric.currentValue);
    const targetValue = getMetricNumber(metric.nextValue);
    const nextValue = currentValue + (targetValue - currentValue) * ratio;

    return {
        nextValue: formatMetric(metric, nextValue),
        trend: metric.showTrend ? "positive" : undefined,
    };
}

export default function BorrowDepositCollateral({
    card,
    onConfirm,
    onBack,
}: BorrowDepositCollateralProps): React.ReactElement {
    const [collateralAmount, setCollateralAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();

    const depositedCollateralValue = parseAmount(
        card.depositedCollateral.value
    );
    const collateralWalletBalanceValue = parseAmount(
        card.collateralWalletBalance
    );
    const collateralAmountValue = parseAmount(collateralAmount);
    const hasTypedAmount = collateralAmount.trim().length > 0;
    const hasCollateralBalanceError =
        collateralAmountValue.isValid &&
        collateralAmountValue.value > collateralWalletBalanceValue.value;
    const hasValidationError =
        !collateralAmountValue.isValid || hasCollateralBalanceError;
    const hasPendingChanges =
        collateralAmountValue.isValid &&
        !hasCollateralBalanceError &&
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
    const collateralRatio = getDepositCollateralRatio(
        collateralAmountValue.value,
        depositedCollateralValue.value,
        collateralWalletBalanceValue.value
    );

    const handleQuickAction = (percentage: number) => {
        const nextAmount =
            percentage === 100
                ? collateralWalletBalanceValue.value
                : collateralWalletBalanceValue.value * (percentage / 100);

        setCollateralAmount(formatAmount(nextAmount));
    };

    const handleUseMaxCollateral = () => {
        setCollateralAmount(formatAmount(collateralWalletBalanceValue.value));
    };

    const [
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        minRequiredCollateralMetric,
        borrowAvailableMetric,
        borrowUsageMetric,
    ] = card.depositCollateralOperationMetrics;

    const liquidationPriceState = liquidationPriceMetric
        ? getPositiveMetricState(liquidationPriceMetric, collateralRatio)
        : null;
    const distanceToLiquidationState = distanceToLiquidationMetric
        ? getPositiveMetricState(distanceToLiquidationMetric, collateralRatio)
        : null;
    const borrowAvailableState = borrowAvailableMetric
        ? getPositiveMetricState(borrowAvailableMetric, collateralRatio)
        : null;
    const borrowUsageState = borrowUsageMetric
        ? getPositiveMetricState(borrowUsageMetric, collateralRatio)
        : null;

    const noticeLines = hasPendingChanges
        ? (() => {
              return [
                  `${t("borrowing.sectionDepositCollateral.summary.txtDepositingCollateral")}: ${collateralAmount} ${card.collateralTokenTicker}.`,
                  liquidationPriceMetric
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liquidationPriceState?.nextValue} ${liquidationPriceMetric.nextUnit}.`
                      : null,
                  borrowAvailableMetric
                      ? `${t("borrowing.labelAvailableWithCollateral")}: ${borrowAvailableState?.nextValue} ${borrowAvailableMetric.nextUnit}.`
                      : null,
                  t("borrowing.risk.decrease"),
              ].filter(Boolean);
          })()
        : [t("borrowing.sectionDepositCollateral.summary.txtEnterAmount")];

    return (
        <div className="layout-card borrow-deposit-collateral-view">
            <div className="layout-card-title borrow-deposit-collateral-title">
                <h1>{t("borrowing.sectionDepositCollateral.cardTitle")}</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="borrow-deposit-collateral-body">
                <div className="borrow-deposit-collateral-main">
                    <div className="borrow-deposit-collateral-panel">
                        <div className="borrow-deposit-collateral-panel__columns">
                            <div className="borrow-deposit-collateral-panel__column borrow-deposit-collateral-panel__column--secondary">
                                <CompactMetricDisplay
                                    label={t("borrowing.labelCurrentDebt")}
                                    value={card.currentDebt.value}
                                    valueLabel={card.currentDebt.ticker}
                                />
                            </div>
                            <div className="borrow-deposit-collateral-panel__column borrow-deposit-collateral-panel__column--primary">
                                <CompactMetricDisplay
                                    label={t("borrowing.labelDepositedCollateral")}
                                    value={card.depositedCollateral.value}
                                    valueLabel={card.depositedCollateral.ticker}
                                />

                                <TokenAmountInput
                                    feedbackMessage={
                                        hasCollateralBalanceError
                                            ? t("tokenAmountInput.noEnoughBalance")
                                            : undefined
                                    }
                                    feedbackState="negative"
                                    getFiatEquivalent={getFiatEquivalent}
                                    inputValue={collateralAmount}
                                    label={t(
                                        "borrowing.sectionDepositCollateral.labelAmountToDeposit"
                                    )}
                                    onMaxClick={handleUseMaxCollateral}
                                    onQuickActionClick={handleQuickAction}
                                    onValueChange={setCollateralAmount}
                                    quickActions={QUICK_ACTIONS.filter(
                                        (percentage) => percentage !== 100
                                    )}
                                    showMaxShortcut
                                    testId="borrow-deposit-collateral-input"
                                    tokenIconClassName={
                                        card.collateralTokenIconClassName
                                    }
                                    tokenLabel={card.collateralTokenTicker}
                                    validateError={hasCollateralBalanceError}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="borrow-deposit-collateral-metrics">
                    <div className="borrow-deposit-collateral-metrics__row borrow-deposit-collateral-metrics__row--top">
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

                    <div className="borrow-deposit-collateral-metrics__row borrow-deposit-collateral-metrics__row--bottom">
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
                                  "borrowing.sectionDepositCollateral.summary.titleReady"
                              )
                            : t(
                                  "borrowing.sectionDepositCollateral.summary.titleNoAmount"
                              )
                    }
                >
                    <div className="borrow-deposit-collateral-notice-lines">
                        {noticeLines.map((line, index) => (
                            <div key={`${line}-${index}`}>{line}</div>
                        ))}
                    </div>
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button borrow-deposit-collateral-actions__confirm"
                        disabled={!hasPendingChanges || hasValidationError}
                        onClick={() => onConfirm(card, collateralAmount, () => setCollateralAmount(""))}
                        type="button"
                    >
                        {t("borrowing.cta.confirm")}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
