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
    formatAmount,
    formatMetricValue,
    getImpactScore,
    parseAmount,
    type BorrowMetricTrend,
} from "../Borrow/operationUtils";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";
import { getRepayWithCollateralMockRatio } from "../mocks/borrowOperationMockFormulas";

interface BorrowRepayWithCollateralProps {
    card: BorrowCardData;
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
            trend: metric.showTrend
                ? impact ?? "neutral"
                : undefined,
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
    onBack,
}: BorrowRepayWithCollateralProps): React.ReactElement {
    const [collateralAmount, setCollateralAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { i18n } = useProjectTranslation();

    const depositedCollateralValue = parseAmount(card.depositedCollateral.value);
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
    const repayWithCollateralRatio = getRepayWithCollateralMockRatio(
        cappedCollateralValue,
        depositedCollateralValue.value
    );
    const collateralAfterRepayment = Math.max(
        0,
        depositedCollateralValue.value - cappedCollateralValue
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
                  `Using collateral for repay: ${collateralAmount} ${card.depositedCollateral.ticker}.`,
                  `Deposited collateral after repayment: ${collateralAfterLabel}`,
                  liquidationPriceMetric
                      ? `Liquidation Price: ${liquidationPriceState?.nextValue} ${liquidationPriceMetric.nextUnit}.`
                      : null,
                  distanceToLiquidationMetric
                      ? `Distance to liquidation: ${distanceToLiquidationState?.nextValue} ${distanceToLiquidationMetric.nextUnit}.`
                      : null,
                  "Risk will stay neutral if you proceed.",
              ].filter(Boolean);
          })()
        : ['Enter an amount to repay with collateral or use "MAX".'];

    return (
        <div className="layout-card borrow-repay-with-collateral-view">
            <div className="layout-card-title borrow-repay-with-collateral-title">
                <h1>Repay with Collateral</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="borrow-repay-with-collateral-body">
                <div className="borrow-repay-with-collateral-main">
                    <div className="borrow-repay-with-collateral-panel">
                        <CompactMetricDisplay
                            label="Current Debt"
                            value={card.currentDebt.value}
                            valueLabel={card.currentDebt.ticker}
                        />
                        <TokenAmountInput
                            feedbackMessage={
                                hasCollateralLimitError
                                    ? "Amount exceeds your deposited collateral"
                                    : undefined
                            }
                            feedbackState="negative"
                            getFiatEquivalent={getFiatEquivalent}
                            fiatValue="0.00"
                            inputValue={collateralAmount}
                            label="Collateral for Repay"
                            onMaxClick={handleUseMaxCollateral}
                            onQuickActionClick={handleQuickAction}
                            onValueChange={setCollateralAmount}
                            quickActions={QUICK_ACTIONS.filter(
                                (percentage) => percentage !== 100
                            )}
                            showMaxShortcut
                            testId="borrow-repay-with-collateral-input"
                            tokenIconClassName={
                                card.collateralTokenIconClassName
                            }
                            tokenLabel={card.collateralTokenTicker}
                            validateError={hasCollateralLimitError}
                        />
                        <CompactMetricDisplay
                            label="Deposited Collateral After Repayment"
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
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? liquidationPriceMetric.nextUnit
                                        : liquidationPriceMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? liquidationPriceState?.nextValue ??
                                          liquidationPriceMetric.currentValue
                                        : liquidationPriceMetric.currentValue,
                                }}
                                before={{
                                    label: "Current",
                                    unit: liquidationPriceMetric.currentUnit,
                                    value: liquidationPriceMetric.currentValue,
                                }}
                                title={liquidationPriceMetric.title}
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
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? distanceToLiquidationMetric.nextUnit
                                        : distanceToLiquidationMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? distanceToLiquidationState?.nextValue ??
                                          distanceToLiquidationMetric.currentValue
                                        : distanceToLiquidationMetric.currentValue,
                                }}
                                before={{
                                    label: "Current",
                                    unit: distanceToLiquidationMetric.currentUnit,
                                    value: distanceToLiquidationMetric.currentValue,
                                }}
                                title={distanceToLiquidationMetric.title}
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
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? minRequiredCollateralMetric.nextUnit
                                        : minRequiredCollateralMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? minRequiredCollateralMetric.nextValue
                                        : minRequiredCollateralMetric.currentValue,
                                }}
                                before={{
                                    label: "Current",
                                    unit: minRequiredCollateralMetric.currentUnit,
                                    value: minRequiredCollateralMetric.currentValue,
                                }}
                                title={minRequiredCollateralMetric.title}
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
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? borrowAvailableMetric.nextUnit
                                        : borrowAvailableMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? borrowAvailableState?.nextValue ??
                                          borrowAvailableMetric.currentValue
                                        : borrowAvailableMetric.currentValue,
                                }}
                                before={{
                                    label: "Current",
                                    unit: borrowAvailableMetric.currentUnit,
                                    value: borrowAvailableMetric.currentValue,
                                }}
                                title={borrowAvailableMetric.title}
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
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? borrowUsageMetric.nextUnit
                                        : borrowUsageMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? borrowUsageState?.nextValue ??
                                          borrowUsageMetric.currentValue
                                        : borrowUsageMetric.currentValue,
                                }}
                                before={{
                                    label: "Current",
                                    unit: borrowUsageMetric.currentUnit,
                                    value: borrowUsageMetric.currentValue,
                                }}
                                title={borrowUsageMetric.title}
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
                            ? "Ready to continue"
                            : "Repay with collateral amount not specified"
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
                        type="button"
                    >
                        Confirm
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
