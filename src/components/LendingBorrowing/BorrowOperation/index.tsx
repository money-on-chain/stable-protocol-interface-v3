import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount, TokenSettings } from "../../../helpers/currencies";
import { toBigIntPrecision } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import TokenAmountInput from "../../TokenAmountInput";
import {
    type BorrowCardData,
    type BorrowOperationMetric,
    parseMetricNumber,
} from "../Borrow/data";
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
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";
import RateDisplay from "../MiniComponents/RateDisplay";
import {
    getBorrowMockRatio,
    getBorrowOperationMockRiskDelta,
    getDepositCollateralMockRatio,
} from "../mocks/borrowOperationMockFormulas";

interface BorrowOperationProps {
    onBack: () => void;
    card: BorrowCardData;
}

const QUICK_ACTIONS = [25, 50, 75, 100];
const EPSILON = 0.001;

function formatMetric(metric: BorrowOperationMetric, value: number): string {
    const pattern = metric.currentValue.includes("- -")
        ? metric.nextValue
        : metric.currentValue;

    return formatMetricValue(pattern, value);
}

function getBorrowOperationProgress(
    borrowImpact: "positive" | "neutral" | "negative" | undefined,
    collateralImpact: "positive" | "neutral" | "negative" | undefined,
    borrowAmountValue: number,
    maxAvailableValue: number,
    collateralAmountValue: number,
    depositedCollateralValue: number,
    collateralWalletBalanceValue: number
): number {
    const borrowContribution =
        getBorrowMockRatio(borrowAmountValue, maxAvailableValue) *
        getImpactScore(borrowImpact);
    const collateralContribution =
        getDepositCollateralMockRatio(
            collateralAmountValue,
            depositedCollateralValue,
            collateralWalletBalanceValue
        ) * getImpactScore(collateralImpact);

    return borrowContribution + collateralContribution;
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

function getBorrowOperationMetricState(
    metric: BorrowOperationMetric,
    netProgress: number
): { nextValue: string; trend?: BorrowMetricTrend } {
    if (Math.abs(netProgress) <= EPSILON) {
        return getNeutralMetricState(metric);
    }

    if (metric.currentValue.includes("- -")) {
        return {
            nextValue: netProgress > 0 ? metric.nextValue : metric.currentValue,
            trend: metric.showTrend
                ? netProgress > 0
                    ? "positive"
                    : "negative"
                : undefined,
        };
    }

    const currentValue = parseAmount(metric.currentValue).value;
    const targetValue = parseAmount(metric.nextValue).value;
    const metricDelta = Math.abs(currentValue - targetValue);
    const progress = Math.abs(netProgress);

    let nextValue = currentValue;

    if (netProgress > 0) {
        nextValue = currentValue + (targetValue - currentValue) * progress;
    } else {
        if (metric.title === "Liquidation Price") {
            nextValue = currentValue + metricDelta * progress;
        }

        if (metric.title === "Distance to Liquidation") {
            nextValue = Math.max(0, currentValue - metricDelta * progress);
        }

        if (metric.title === "Borrow Available W/Collateral") {
            nextValue = Math.max(0, currentValue - metricDelta * progress);
        }

        if (metric.title === "Borrow Usage") {
            nextValue = currentValue + metricDelta * progress;
        }
    }

    return {
        nextValue:
            metric.title === "Min Required Collateral"
                ? metric.currentValue
                : formatMetric(metric, nextValue),
        trend: metric.showTrend
            ? netProgress > 0
                ? "positive"
                : "negative"
            : undefined,
    };
}

export default function BorrowOperation({
    card,
    onBack,
}: BorrowOperationProps): React.ReactElement {
    const [borrowAmount, setBorrowAmount] = React.useState("");
    const [collateralAmount, setCollateralAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { i18n } = useProjectTranslation();
    const hasCurrentDebt = parseMetricNumber(card.currentDebt.value) > 0;
    const hasDepositedCollateral =
        parseMetricNumber(card.depositedCollateral.value) > 0;
    const hasDebtOrCollateral = hasCurrentDebt || hasDepositedCollateral;

    const borrowAmountValue = parseAmount(borrowAmount);
    const collateralAmountValue = parseAmount(collateralAmount);
    const collateralWalletBalanceValue = parseAmount(
        card.collateralWalletBalance
    );
    const maxAvailableValue = parseAmount(card.maxAvailable.value);
    const hasBorrowTyped = borrowAmount.trim().length > 0;
    const hasCollateralTyped = collateralAmount.trim().length > 0;
    const hasInvalidTypedAmount =
        (hasBorrowTyped && !borrowAmountValue.isValid) ||
        (hasCollateralTyped && !collateralAmountValue.isValid);
    const hasBorrowLimitError =
        borrowAmountValue.isValid &&
        borrowAmountValue.value > maxAvailableValue.value;
    const hasCollateralBalanceError =
        collateralAmountValue.isValid &&
        collateralAmountValue.value > collateralWalletBalanceValue.value;
    const hasValidationError =
        hasInvalidTypedAmount ||
        hasBorrowLimitError ||
        hasCollateralBalanceError;
    const hasPendingChanges =
        !hasValidationError &&
        (borrowAmountValue.value > 0 || collateralAmountValue.value > 0);
    const getBorrowFiatEquivalent = React.useCallback(
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
    const getCollateralFiatEquivalent = React.useCallback(
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
    const overallRiskDelta = getBorrowOperationMockRiskDelta(
        borrowAmountValue.value,
        parseAmount(card.maxAvailable.value).value,
        collateralAmountValue.value,
        parseAmount(card.depositedCollateral.value).value,
        parseAmount(card.collateralWalletBalance).value
    );

    const handleBorrowQuickAction = (percentage: number) => {
        const maxBorrowValue = parseAmount(card.maxAvailable.value).value;
        const nextAmount =
            percentage === 100
                ? maxBorrowValue
                : maxBorrowValue * (percentage / 100);

        setBorrowAmount(formatAmount(nextAmount));
    };

    const handleCollateralQuickAction = (percentage: number) => {
        const maxCollateralValue = parseAmount(
            card.collateralWalletBalance
        ).value;
        const nextAmount =
            percentage === 100
                ? maxCollateralValue
                : maxCollateralValue * (percentage / 100);

        setCollateralAmount(formatAmount(nextAmount));
    };

    const [
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        minRequiredCollateralMetric,
        borrowAvailableMetric,
        borrowUsageMetric,
    ] = card.borrowOperationMetrics;

    const liquidationPriceProgress = liquidationPriceMetric
        ? getBorrowOperationProgress(
              liquidationPriceMetric.borrowImpact,
              liquidationPriceMetric.collateralImpact,
              borrowAmountValue.value,
              maxAvailableValue.value,
              collateralAmountValue.value,
              parseAmount(card.depositedCollateral.value).value,
              parseAmount(card.collateralWalletBalance).value
          )
        : 0;
    const distanceToLiquidationProgress = distanceToLiquidationMetric
        ? getBorrowOperationProgress(
              distanceToLiquidationMetric.borrowImpact,
              distanceToLiquidationMetric.collateralImpact,
              borrowAmountValue.value,
              maxAvailableValue.value,
              collateralAmountValue.value,
              parseAmount(card.depositedCollateral.value).value,
              parseAmount(card.collateralWalletBalance).value
          )
        : 0;
    const borrowAvailableProgress = borrowAvailableMetric
        ? getBorrowOperationProgress(
              borrowAvailableMetric.borrowImpact,
              borrowAvailableMetric.collateralImpact,
              borrowAmountValue.value,
              maxAvailableValue.value,
              collateralAmountValue.value,
              parseAmount(card.depositedCollateral.value).value,
              parseAmount(card.collateralWalletBalance).value
          )
        : 0;
    const borrowUsageProgress = borrowUsageMetric
        ? getBorrowOperationProgress(
              borrowUsageMetric.borrowImpact,
              borrowUsageMetric.collateralImpact,
              borrowAmountValue.value,
              maxAvailableValue.value,
              collateralAmountValue.value,
              parseAmount(card.depositedCollateral.value).value,
              parseAmount(card.collateralWalletBalance).value
          )
        : 0;

    const liquidationPriceState = liquidationPriceMetric
        ? getBorrowOperationMetricState(
              liquidationPriceMetric,
              liquidationPriceProgress
          )
        : null;
    const distanceToLiquidationState = distanceToLiquidationMetric
        ? getBorrowOperationMetricState(
              distanceToLiquidationMetric,
              distanceToLiquidationProgress
          )
        : null;
    const borrowAvailableState = borrowAvailableMetric
        ? getBorrowOperationMetricState(
              borrowAvailableMetric,
              borrowAvailableProgress
          )
        : null;
    const borrowUsageState = borrowUsageMetric
        ? getBorrowOperationMetricState(borrowUsageMetric, borrowUsageProgress)
        : null;

    const noticeLines = hasPendingChanges
        ? (() => {
              const riskMessage =
                  overallRiskDelta > 0.001
                      ? "Risk will decrease if you proceed."
                      : overallRiskDelta < -0.001
                        ? "Risk will increase if you proceed."
                        : "Risk will remain neutral if you proceed.";

              return [
                  borrowAmountValue.value > 0
                      ? `Borrowing: ${borrowAmount} ${card.borrowTokenTicker}.`
                      : null,
                  collateralAmountValue.value > 0
                      ? `Depositing collateral: ${collateralAmount} ${card.collateralTokenTicker}.`
                      : null,
                  liquidationPriceMetric
                      ? `Liquidation Price: ${liquidationPriceState?.nextValue} ${liquidationPriceMetric.nextUnit}.`
                      : null,
                  borrowAvailableMetric
                      ? `Borrow available with deposited collateral: ${borrowAvailableState?.nextValue} ${borrowAvailableMetric.nextUnit}.`
                      : null,
                  riskMessage,
              ].filter(Boolean);
          })()
        : hasBorrowLimitError
          ? ["The borrow amount exceeds your available borrow limit."]
          : hasCollateralBalanceError
            ? ["The collateral amount exceeds your wallet balance."]
            : ["Enter borrow and/or collateral amounts to continue."];

    return (
        <div className="layout-card borrow-operation-view">
            <div className="layout-card-title borrow-operation-title">
                <h1>Borrow</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="borrow-operation-body">
                <div className="borrow-operation-main">
                    <div className="borrow-operation-header">
                        <div className="borrow-operation-header__spacer"></div>
                        <RateDisplay
                            number={card.borrowApy}
                            title={`${card.borrowTokenTicker}/${card.collateralTokenTicker} Variable APY`}
                        />
                    </div>

                    <div className="borrow-operation-panels">
                        <div className="borrow-operation-panel">
                            {hasDebtOrCollateral ? (
                                <CompactMetricDisplay
                                    label="Current Debt"
                                    value={card.currentDebt.value}
                                    valueLabel={card.currentDebt.ticker}
                                />
                            ) : null}
                            <TokenAmountInput
                                feedbackMessage={
                                    hasBorrowLimitError
                                        ? "Amount exceeds your available borrow limit"
                                        : undefined
                                }
                                feedbackState="negative"
                                getFiatEquivalent={getBorrowFiatEquivalent}
                                fiatValue="0.00"
                                inputValue={borrowAmount}
                                label="Amount to Borrow"
                                onMaxClick={() => handleBorrowQuickAction(100)}
                                onQuickActionClick={handleBorrowQuickAction}
                                onValueChange={setBorrowAmount}
                                quickActions={QUICK_ACTIONS.filter(
                                    (percentage) => percentage !== 100
                                )}
                                showMaxShortcut
                                testId="borrow-operation-borrow-input"
                                tokenIconClassName={
                                    card.borrowTokenIconClassName
                                }
                                tokenLabel={card.borrowTokenTicker}
                                validateError={hasBorrowLimitError}
                            />
                        </div>

                        <div className="borrow-operation-panel">
                            {hasDebtOrCollateral ? (
                                <CompactMetricDisplay
                                    label="Deposited Collateral"
                                    value={card.depositedCollateral.value}
                                    valueLabel={card.depositedCollateral.ticker}
                                />
                            ) : null}
                            <TokenAmountInput
                                balanceLabel="Balance"
                                balanceValue={card.collateralWalletBalance}
                                feedbackMessage={
                                    hasCollateralBalanceError
                                        ? "Not enough balance in your wallet"
                                        : undefined
                                }
                                feedbackState="negative"
                                getFiatEquivalent={getCollateralFiatEquivalent}
                                fiatValue="0.00"
                                inputValue={collateralAmount}
                                label="Add to Collateral"
                                onMaxClick={() =>
                                    handleCollateralQuickAction(100)
                                }
                                onQuickActionClick={handleCollateralQuickAction}
                                onValueChange={setCollateralAmount}
                                quickActions={QUICK_ACTIONS.filter(
                                    (percentage) => percentage !== 100
                                )}
                                showMaxShortcut
                                testId="borrow-operation-collateral-input"
                                tokenIconClassName={
                                    card.collateralTokenIconClassName
                                }
                                tokenLabel={card.collateralTokenTicker}
                                validateError={hasCollateralBalanceError}
                            />
                        </div>
                    </div>
                </div>

                <div className="borrow-operation-metrics">
                    <div className="borrow-operation-metrics__row borrow-operation-metrics__row--top">
                        {liquidationPriceMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? liquidationPriceMetric.nextUnit
                                        : liquidationPriceMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? (liquidationPriceState?.nextValue ??
                                          liquidationPriceMetric.currentValue)
                                        : liquidationPriceMetric.currentValue,
                                }}
                                before={
                                    hasDebtOrCollateral
                                        ? {
                                              label: "Current",
                                              unit: liquidationPriceMetric.currentUnit,
                                              value: liquidationPriceMetric.currentValue,
                                          }
                                        : undefined
                                }
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
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? distanceToLiquidationMetric.nextUnit
                                        : distanceToLiquidationMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? (distanceToLiquidationState?.nextValue ??
                                          distanceToLiquidationMetric.currentValue)
                                        : distanceToLiquidationMetric.currentValue,
                                }}
                                before={
                                    hasDebtOrCollateral
                                        ? {
                                              label: "Current",
                                              unit: distanceToLiquidationMetric.currentUnit,
                                              value: distanceToLiquidationMetric.currentValue,
                                          }
                                        : undefined
                                }
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
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? minRequiredCollateralMetric.nextUnit
                                        : minRequiredCollateralMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? getNeutralMetricState(
                                              minRequiredCollateralMetric
                                          ).nextValue
                                        : minRequiredCollateralMetric.currentValue,
                                }}
                                before={
                                    hasDebtOrCollateral
                                        ? {
                                              label: "Current",
                                              unit: minRequiredCollateralMetric.currentUnit,
                                              value: minRequiredCollateralMetric.currentValue,
                                          }
                                        : undefined
                                }
                                title={minRequiredCollateralMetric.title}
                                useBorder
                            />
                        ) : null}
                    </div>
                    <div className="borrow-operation-metrics__row borrow-operation-metrics__row--bottom">
                        {borrowAvailableMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? borrowAvailableMetric.nextUnit
                                        : borrowAvailableMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? (borrowAvailableState?.nextValue ??
                                          borrowAvailableMetric.currentValue)
                                        : borrowAvailableMetric.currentValue,
                                }}
                                before={
                                    hasDebtOrCollateral
                                        ? {
                                              label: "Current",
                                              unit: borrowAvailableMetric.currentUnit,
                                              value: borrowAvailableMetric.currentValue,
                                          }
                                        : undefined
                                }
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
                                    label: "Next",
                                    unit: hasPendingChanges
                                        ? borrowUsageMetric.nextUnit
                                        : borrowUsageMetric.currentUnit,
                                    value: hasPendingChanges
                                        ? (borrowUsageState?.nextValue ??
                                          borrowUsageMetric.currentValue)
                                        : borrowUsageMetric.currentValue,
                                }}
                                before={
                                    hasDebtOrCollateral
                                        ? {
                                              label: "Current",
                                              unit: borrowUsageMetric.currentUnit,
                                              value: borrowUsageMetric.currentValue,
                                          }
                                        : undefined
                                }
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
                        hasBorrowLimitError
                            ? "Borrow amount exceeds limit"
                            : hasCollateralBalanceError
                              ? "Not enough balance"
                              : hasPendingChanges
                                ? "Ready to continue"
                                : "No amount selected"
                    }
                >
                    <div className="borrow-operation-notice-lines">
                        {noticeLines.map((line) => (
                            <div key={line}>{line}</div>
                        ))}
                    </div>
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button borrow-operation-actions__confirm"
                        disabled={!hasPendingChanges}
                        type="button"
                    >
                        Confirm
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
