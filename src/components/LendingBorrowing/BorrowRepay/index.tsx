import "./Styles.scss";

import React from "react";

import TokenAmountInput from "../../TokenAmountInput";
import type { BorrowCardData } from "../Borrow/data";
import {
    formatAmount,
    getImpactScore,
    getMetricNextValue,
    getMetricTrend,
    parseAmount,
} from "../Borrow/operationUtils";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";

interface BorrowRepayProps {
    card: BorrowCardData;
    onBack: () => void;
}

const QUICK_ACTIONS = [25, 50, 75, 100];

export default function BorrowRepay({
    card,
    onBack,
}: BorrowRepayProps): React.ReactElement {
    const [repayAmount, setRepayAmount] = React.useState("");

    const currentDebtValue = parseAmount(card.currentDebt.value);
    const repayAmountValue = parseAmount(repayAmount);
    const hasTypedAmount = repayAmount.trim().length > 0;
    const hasDebtLimitError =
        repayAmountValue.isValid && repayAmountValue.value > currentDebtValue.value;
    const hasValidationError = !repayAmountValue.isValid || hasDebtLimitError;
    const hasPendingChanges =
        repayAmountValue.isValid &&
        !hasDebtLimitError &&
        repayAmountValue.value > 0;
    const cappedRepayValue = Math.min(
        repayAmountValue.value,
        currentDebtValue.value
    );
    const repayRatio =
        currentDebtValue.value > 0
            ? Math.max(0, Math.min(1, cappedRepayValue / currentDebtValue.value))
            : 0;

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

    const noticeLines = hasPendingChanges
        ? (() => {
              const liquidationMetric = card.repayOperationMetrics[0];
              const borrowAvailabilityMetric = card.repayOperationMetrics[3];
              const borrowUsageMetric = card.repayOperationMetrics[4];

              return [
                  `Repaying: ${repayAmount} ${card.currentDebt.ticker}.`,
                  liquidationMetric
                      ? `Liquidation Price: ${getMetricNextValue(
                            liquidationMetric,
                            repayRatio * getImpactScore(liquidationMetric.repayImpact)
                        )} ${liquidationMetric.nextUnit}.`
                      : null,
                  borrowAvailabilityMetric
                      ? `Borrow available with collateral: ${getMetricNextValue(
                            borrowAvailabilityMetric,
                            repayRatio *
                                getImpactScore(
                                    borrowAvailabilityMetric.repayImpact
                                )
                        )} ${borrowAvailabilityMetric.nextUnit}.`
                      : null,
                  borrowUsageMetric
                      ? `Borrow usage: ${getMetricNextValue(
                            borrowUsageMetric,
                            repayRatio * getImpactScore(borrowUsageMetric.repayImpact)
                        )} ${borrowUsageMetric.nextUnit}.`
                      : null,
                  "Risk will decrease if you proceed.",
              ].filter(Boolean);
          })()
        : ['Enter an amount to repay or use "Repay in Full".'];

    const topMetrics = card.repayOperationMetrics.slice(0, 3);
    const bottomMetrics = card.repayOperationMetrics.slice(3);

    return (
        <div className="layout-card borrow-repay-view">
            <div className="layout-card-title borrow-repay-title">
                <h1>Repay</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="borrow-repay-body">
                <div className="borrow-repay-main">
                    <div className="borrow-repay-header">
                        <div className="borrow-repay-header__spacer"></div>
                        <div className="borrow-repay-rate">
                            <div className="borrow-repay-rate__value">
                                {card.borrowApy} %
                            </div>
                            <div className="borrow-repay-rate__label">
                                {card.borrowTokenTicker}/
                                {card.collateralTokenTicker} Variable APY
                            </div>
                        </div>
                    </div>

                    <div className="borrow-repay-panel">
                        <CompactMetricDisplay
                            label="Current Debt"
                            value={card.currentDebt.value}
                            valueLabel={card.currentDebt.ticker}
                        />
                        <TokenAmountInput
                            feedbackMessage={
                                hasDebtLimitError
                                    ? "Amount exceeds your current debt"
                                    : undefined
                            }
                            feedbackState="negative"
                            fiatValue="0.00"
                            inputValue={repayAmount}
                            label="Amount to Repay"
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
                        {topMetrics.map((metric, index) => {
                            const riskDelta =
                                repayRatio * getImpactScore(metric.repayImpact);

                            return (
                                <BeforeAfterCard
                                    after={{
                                        isInvalid:
                                            hasTypedAmount &&
                                            !repayAmountValue.isValid,
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
                                    before={{
                                        label: "Current",
                                        unit: metric.currentUnit,
                                        value: metric.currentValue,
                                    }}
                                    key={`${metric.title}-${index}`}
                                    title={metric.title}
                                    trend={
                                        hasPendingChanges && metric.showTrend
                                            ? getMetricTrend(metric, riskDelta)
                                            : undefined
                                    }
                                    useBorder
                                />
                            );
                        })}
                    </div>

                    <div className="borrow-repay-metrics__row borrow-repay-metrics__row--bottom">
                        {bottomMetrics.map((metric, index) => {
                            const riskDelta =
                                repayRatio * getImpactScore(metric.repayImpact);

                            return (
                                <BeforeAfterCard
                                    after={{
                                        isInvalid:
                                            hasTypedAmount &&
                                            !repayAmountValue.isValid,
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
                                    before={{
                                        label: "Current",
                                        unit: metric.currentUnit,
                                        value: metric.currentValue,
                                    }}
                                    key={`${metric.title}-${index + topMetrics.length}`}
                                    title={metric.title}
                                    trend={
                                        hasPendingChanges && metric.showTrend
                                            ? getMetricTrend(metric, riskDelta)
                                            : undefined
                                    }
                                    useBorder
                                />
                            );
                        })}
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasDebtLimitError
                            ? "Repay amount exceeds current debt"
                            : hasPendingChanges
                            ? "Ready to repay"
                            : "Repay amount not specified"
                    }
                >
                    <div className="borrow-repay-notice-lines">
                        {(hasDebtLimitError
                            ? ["The repay amount exceeds your current debt."]
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
                        Repay in Full
                    </button>
                    <button
                        className="button borrow-repay-actions__confirm"
                        disabled={!hasPendingChanges || hasValidationError}
                        type="button"
                    >
                        {hasPendingChanges ? "Repay" : "Enter an Amount"}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
