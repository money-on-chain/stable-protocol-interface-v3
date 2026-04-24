import "./Styles.scss";

import React from "react";

import TokenAmountInput from "../../TokenAmountInput";
import {
    parseMetricNumber,
    type BorrowCardData,
    type BorrowOperationMetric,
} from "../Borrow/data";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";

interface BorrowOperationProps {
    onBack: () => void;
    card: BorrowCardData;
}

const QUICK_ACTIONS = [25, 50, 75, 100];

type BeforeAfterTrend = "positive" | "negative" | "neutral";

function parseAmount(rawAmount: string): { isValid: boolean; value: number } {
    const normalizedAmount = rawAmount.replace(/,/g, "");

    if (!normalizedAmount.trim()) {
        return {
            isValid: true,
            value: 0,
        };
    }

    const parsedAmount = Number(normalizedAmount);

    if (Number.isNaN(parsedAmount)) {
        return {
            isValid: false,
            value: 0,
        };
    }

    return {
        isValid: true,
        value: parsedAmount,
    };
}

function formatAmount(value: number): string {
    return value.toLocaleString("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });
}

function formatMetricValue(rawValue: string, value: number): string {
    const decimalMatch = rawValue.match(/\.(\d+)/);
    const minimumFractionDigits = decimalMatch ? decimalMatch[1].length : 0;

    return value.toLocaleString("en-US", {
        maximumFractionDigits: minimumFractionDigits,
        minimumFractionDigits,
    });
}

function getImpactScore(effect?: "improves" | "neutral" | "worsens"): number {
    if (effect === "improves") {
        return 1;
    }

    if (effect === "worsens") {
        return -1;
    }

    return 0;
}

function clampRiskDelta(value: number): number {
    return Math.max(-1, Math.min(1, value));
}

function getMetricTrend(
    metric: BorrowOperationMetric,
    riskDelta: number
): BeforeAfterTrend | undefined {
    if (Math.abs(riskDelta) < 0.001) {
        return "neutral";
    }

    const currentValue = parseMetricNumber(metric.currentValue);
    const targetValue = parseMetricNumber(metric.nextValue);

    if (currentValue === targetValue) {
        return "neutral";
    }

    return riskDelta > 0 ? "positive" : "negative";
}

function getMetricNextValue(
    metric: BorrowOperationMetric,
    riskDelta: number
): string {
    const currentValue = parseMetricNumber(metric.currentValue);
    const targetValue = parseMetricNumber(metric.nextValue);

    if (metric.currentValue.includes("- -")) {
        return riskDelta > 0 ? metric.nextValue : metric.currentValue;
    }

    if (currentValue === targetValue || Math.abs(riskDelta) < 0.001) {
        return metric.currentValue;
    }

    const interpolatedValue =
        riskDelta > 0
            ? currentValue + (targetValue - currentValue) * riskDelta
            : currentValue - (targetValue - currentValue) * Math.abs(riskDelta);

    return formatMetricValue(metric.currentValue, interpolatedValue);
}

export default function BorrowOperation({
    card,
    onBack,
}: BorrowOperationProps): React.ReactElement {
    const [borrowAmount, setBorrowAmount] = React.useState("");
    const [collateralAmount, setCollateralAmount] = React.useState("");
    const hasCurrentDebt = parseMetricNumber(card.currentDebt.value) > 0;
    const hasDepositedCollateral =
        parseMetricNumber(card.depositedCollateral.value) > 0;
    const hasDebtOrCollateral = hasCurrentDebt || hasDepositedCollateral;

    const borrowAmountValue = parseAmount(borrowAmount);
    const collateralAmountValue = parseAmount(collateralAmount);
    const hasBorrowTyped = borrowAmount.trim().length > 0;
    const hasCollateralTyped = collateralAmount.trim().length > 0;
    const hasInvalidTypedAmount =
        (hasBorrowTyped && !borrowAmountValue.isValid) ||
        (hasCollateralTyped && !collateralAmountValue.isValid);
    const hasPendingChanges =
        !hasInvalidTypedAmount &&
        (borrowAmountValue.value > 0 || collateralAmountValue.value > 0);
    const borrowRatio =
        card.maxAvailable.value.trim() && parseAmount(card.maxAvailable.value).value > 0
            ? borrowAmountValue.value / parseAmount(card.maxAvailable.value).value
            : 0;
    const collateralRatio =
        card.collateralWalletBalance.trim() &&
        parseAmount(card.collateralWalletBalance).value > 0
            ? collateralAmountValue.value /
              parseAmount(card.collateralWalletBalance).value
            : 0;

    const handleBorrowQuickAction = (percentage: number) => {
        const maxBorrowValue = parseAmount(card.maxAvailable.value).value;
        const nextAmount =
            percentage === 100
                ? maxBorrowValue
                : maxBorrowValue * (percentage / 100);

        setBorrowAmount(formatAmount(nextAmount));
    };

    const handleCollateralQuickAction = (percentage: number) => {
        const maxCollateralValue = parseAmount(card.collateralWalletBalance).value;
        const nextAmount =
            percentage === 100
                ? maxCollateralValue
                : maxCollateralValue * (percentage / 100);

        setCollateralAmount(formatAmount(nextAmount));
    };

    const noticeLines = hasPendingChanges
        ? (() => {
              const overallRiskDelta = clampRiskDelta(
                  collateralRatio - borrowRatio
              );
              const liquidationMetric = card.borrowOperationMetrics[0];
              const borrowAvailabilityMetric = card.borrowOperationMetrics[3];
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
                  liquidationMetric
                      ? `Liquidation Price: ${getMetricNextValue(liquidationMetric, overallRiskDelta)} ${liquidationMetric.nextUnit}.`
                      : null,
                  borrowAvailabilityMetric
                      ? `Borrow available with deposited collateral: ${getMetricNextValue(
                            borrowAvailabilityMetric,
                            overallRiskDelta
                        )} ${borrowAvailabilityMetric.nextUnit}.`
                      : null,
                  riskMessage,
              ].filter(Boolean);
          })()
        : ["Enter borrow and/or collateral amounts to continue."];

    const topMetrics = card.borrowOperationMetrics.slice(0, 3);
    const bottomMetrics = card.borrowOperationMetrics.slice(3);

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
                        <div className="borrow-operation-rate">
                            <div className="borrow-operation-rate__value">
                                {card.borrowApy} %
                            </div>
                            <div className="borrow-operation-rate__label">
                                {card.borrowTokenTicker}/
                                {card.collateralTokenTicker} Variable APY
                            </div>
                        </div>
                    </div>

                    <div className="borrow-operation-panels">
                        <div className="borrow-operation-panel">
                            <h2 className="borrow-operation-panel__title">
                                Borrow
                            </h2>
                            {hasDebtOrCollateral ? (
                                <CompactMetricDisplay
                                    label="Current Debt"
                                    value={card.currentDebt.value}
                                    valueLabel={card.currentDebt.ticker}
                                />
                            ) : null}
                            <TokenAmountInput
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
                                tokenIconClassName={card.borrowTokenIconClassName}
                                tokenLabel={card.borrowTokenTicker}
                            />
                        </div>

                        <div className="borrow-operation-panel">
                            <h2 className="borrow-operation-panel__title">
                                Collateral
                            </h2>
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
                            />
                        </div>
                    </div>
                </div>

                <div className="borrow-operation-metrics">
                    <div className="borrow-operation-metrics__row borrow-operation-metrics__row--top">
                        {topMetrics.map((metric, index) => (
                            (() => {
                                const riskDelta = clampRiskDelta(
                                    borrowRatio *
                                        getImpactScore(metric.borrowImpact) +
                                        collateralRatio *
                                            getImpactScore(
                                                metric.collateralImpact
                                            )
                                );

                                return (
                                    <BeforeAfterCard
                                        after={{
                                            label: "Next",
                                            unit: hasPendingChanges
                                                ? metric.nextUnit
                                                : metric.currentUnit,
                                            value: hasPendingChanges
                                                ? getMetricNextValue(
                                                      metric,
                                                      riskDelta
                                                  )
                                                : metric.currentValue,
                                        }}
                                        before={
                                            hasDebtOrCollateral
                                                ? {
                                                      label: "Current",
                                                      unit: metric.currentUnit,
                                                      value: metric.currentValue,
                                                  }
                                                : undefined
                                        }
                                        key={`${metric.title}-${index}`}
                                        title={metric.title}
                                        trend={
                                            hasPendingChanges &&
                                            metric.showTrend
                                                ? getMetricTrend(
                                                      metric,
                                                      riskDelta
                                                  )
                                                : undefined
                                        }
                                        useBorder
                                    />
                                );
                            })()
                        ))}
                    </div>
                    <div className="borrow-operation-metrics__row borrow-operation-metrics__row--bottom">
                        {bottomMetrics.map((metric, index) => (
                            (() => {
                                const riskDelta = clampRiskDelta(
                                    borrowRatio *
                                        getImpactScore(metric.borrowImpact) +
                                        collateralRatio *
                                            getImpactScore(
                                                metric.collateralImpact
                                            )
                                );

                                return (
                                    <BeforeAfterCard
                                        after={{
                                            label: "Next",
                                            unit: hasPendingChanges
                                                ? metric.nextUnit
                                                : metric.currentUnit,
                                            value: hasPendingChanges
                                                ? getMetricNextValue(
                                                      metric,
                                                      riskDelta
                                                  )
                                                : metric.currentValue,
                                        }}
                                        before={
                                            hasDebtOrCollateral
                                                ? {
                                                      label: "Current",
                                                      unit: metric.currentUnit,
                                                      value: metric.currentValue,
                                                  }
                                                : undefined
                                        }
                                        key={`${metric.title}-${index + topMetrics.length}`}
                                        title={metric.title}
                                        trend={
                                            hasPendingChanges &&
                                            metric.showTrend
                                                ? getMetricTrend(
                                                      metric,
                                                      riskDelta
                                                  )
                                                : undefined
                                        }
                                        useBorder
                                    />
                                );
                            })()
                        ))}
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasPendingChanges
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
