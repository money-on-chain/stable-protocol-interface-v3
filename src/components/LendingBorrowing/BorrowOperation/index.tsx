import "./Styles.scss";

import React from "react";

import TokenAmountInput from "../../TokenAmountInput";
import {
    parseMetricNumber,
    type BorrowCardData,
} from "../Borrow/data";
import {
    clampRiskDelta,
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

interface BorrowOperationProps {
    onBack: () => void;
    card: BorrowCardData;
}

const QUICK_ACTIONS = [25, 50, 75, 100];

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
        borrowAmountValue.isValid && borrowAmountValue.value > maxAvailableValue.value;
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
        : hasBorrowLimitError
          ? ["The borrow amount exceeds your available borrow limit."]
          : hasCollateralBalanceError
          ? ["The collateral amount exceeds your wallet balance."]
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
                                feedbackMessage={
                                    hasBorrowLimitError
                                        ? "Amount exceeds your available borrow limit"
                                        : undefined
                                }
                                feedbackState="negative"
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
                                validateError={hasBorrowLimitError}
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
                                feedbackMessage={
                                    hasCollateralBalanceError
                                        ? "Not enough balance in your wallet"
                                        : undefined
                                }
                                feedbackState="negative"
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
