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
    getBorrowOperationRiskDelta,
    getBorrowRatio,
    getDepositCollateralRatio,
} from "../operationPreviewAdapter";

interface BorrowOperationProps {
    onBack: () => void;
    card: BorrowCardData;
    onConfirm: (
        card: BorrowCardData,
        borrowAmount: string,
        collateralAmount: string,
        onSuccess?: () => void
    ) => void;
}

const QUICK_ACTIONS = [25, 50, 75, 100];
const EPSILON = 0.001;

type BorrowOperationMetricKind =
    | "liquidation-price"
    | "distance-to-liquidation"
    | "min-required-collateral"
    | "borrow-available"
    | "borrow-usage";

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
        getBorrowRatio(borrowAmountValue, maxAvailableValue) *
        getImpactScore(borrowImpact);
    const collateralContribution =
        getDepositCollateralRatio(
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
    netProgress: number,
    kind: BorrowOperationMetricKind
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
        if (kind === "liquidation-price") {
            nextValue = currentValue + metricDelta * progress;
        }

        if (kind === "distance-to-liquidation") {
            nextValue = Math.max(0, currentValue - metricDelta * progress);
        }

        if (kind === "borrow-available") {
            nextValue = Math.max(0, currentValue - metricDelta * progress);
        }

        if (kind === "borrow-usage") {
            nextValue = currentValue + metricDelta * progress;
        }
    }

    return {
        nextValue:
            kind === "min-required-collateral"
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
    onConfirm,
    onBack,
}: BorrowOperationProps): React.ReactElement {
    const [borrowAmount, setBorrowAmount] = React.useState("");
    const [collateralAmount, setCollateralAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();
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
    const minRequiredCollateralValue = React.useMemo(() => {
        if (!borrowAmountValue.isValid || borrowAmountValue.value <= 0 || !contractProtocolStatus.data) return 0;
        const borrowBigInt = toBigIntPrecision(borrowAmountValue.value);
        const minCA = ConvertAmount(
            contractProtocolStatus,
            card.borrowTokenCode,
            card.collateralTokenCode,
            borrowBigInt,
            card.caIndex
        );
        return Number(minCA) / 1e18;
    }, [borrowAmountValue.isValid, borrowAmountValue.value, card.borrowTokenCode, card.collateralTokenCode, card.caIndex, contractProtocolStatus]);
    const minRequiredCollateral = minRequiredCollateralValue > 0 ? formatAmount(minRequiredCollateralValue, card.collateralTokenDecimals) : null;
    const depositedCollateralAmount = parseAmount(card.depositedCollateral.value).value;
    const totalCollateral = depositedCollateralAmount + (collateralAmountValue.isValid ? collateralAmountValue.value : 0);
    const hasInsufficientCollateral =
        hasBorrowTyped &&
        borrowAmountValue.isValid &&
        borrowAmountValue.value > 0 &&
        minRequiredCollateralValue > 0 &&
        totalCollateral < minRequiredCollateralValue;
    const hasValidationError =
        hasInvalidTypedAmount ||
        hasBorrowLimitError ||
        hasCollateralBalanceError ||
        hasInsufficientCollateral;
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
    const overallRiskDelta = getBorrowOperationRiskDelta(
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

        setBorrowAmount(formatAmount(nextAmount, card.borrowTokenDecimals));
    };

    const handleCollateralQuickAction = (percentage: number) => {
        const maxCollateralValue = parseAmount(
            card.collateralWalletBalance
        ).value;
        const nextAmount =
            percentage === 100
                ? maxCollateralValue
                : maxCollateralValue * (percentage / 100);

        setCollateralAmount(formatAmount(nextAmount, card.collateralTokenDecimals));
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
              liquidationPriceProgress,
              "liquidation-price"
          )
        : null;
    const distanceToLiquidationState = distanceToLiquidationMetric
        ? getBorrowOperationMetricState(
              distanceToLiquidationMetric,
              distanceToLiquidationProgress,
              "distance-to-liquidation"
          )
        : null;
    const borrowAvailableState = borrowAvailableMetric
        ? getBorrowOperationMetricState(
              borrowAvailableMetric,
              borrowAvailableProgress,
              "borrow-available"
          )
        : null;
    const borrowUsageState = borrowUsageMetric
        ? getBorrowOperationMetricState(
              borrowUsageMetric,
              borrowUsageProgress,
              "borrow-usage"
          )
        : null;

    const noticeLines = hasPendingChanges
        ? (() => {
              const riskMessage =
                  overallRiskDelta > 0.001
                      ? t("borrowing.risk.decrease")
                      : overallRiskDelta < -0.001
                        ? t("borrowing.risk.increase")
                        : t("borrowing.risk.neutral");

              return [
                  borrowAmountValue.value > 0
                      ? `${t("borrowing.sectionBorrow.summary.txtBorrowing")}: ${borrowAmount} ${card.borrowTokenTicker}.`
                      : null,
                  collateralAmountValue.value > 0
                      ? `${t("borrowing.sectionBorrow.summary.txtDepositingCollateral")}: ${collateralAmount} ${card.collateralTokenTicker}.`
                      : null,
                  liquidationPriceMetric
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liquidationPriceState?.nextValue} ${liquidationPriceMetric.nextUnit}.`
                      : null,
                  borrowAvailableMetric
                      ? `${t("borrowing.sectionBorrow.summary.txtBorrowAvailableWithDepositedCollateral")}: ${borrowAvailableState?.nextValue} ${borrowAvailableMetric.nextUnit}.`
                      : null,
                  riskMessage,
              ].filter(Boolean);
          })()
        : hasInsufficientCollateral
          ? [
                `${t("borrowing.sectionBorrow.summary.txtMinCollateralNeeded")}: ${minRequiredCollateral ?? "..."} ${card.collateralTokenTicker}.`,
            ]
          : hasBorrowLimitError
            ? [t("borrowing.sectionBorrow.summary.txtBorrowLimit")]
            : hasCollateralBalanceError
              ? [t("borrowing.sectionBorrow.summary.txtCollateralBalance")]
              : [t("borrowing.sectionBorrow.summary.txtEnterAmounts")];

    return (
        <div className="layout-card borrow-operation-view">
            <div className="layout-card-title borrow-operation-title">
                <h1>{t("borrowing.sectionBorrow.cardTitle")}</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="borrow-operation-body">
                <div className="borrow-operation-main">
                    <div className="borrow-operation-header">
                        <div className="borrow-operation-header__spacer"></div>
                        <RateDisplay
                            number={card.borrowApy}
                            title={`${card.borrowTokenTicker}/${card.collateralTokenTicker} ${t("borrowing.sectionBorrow.apy")}`}
                        />
                    </div>

                    <div className="borrow-operation-panels">
                        <div className="borrow-operation-panel">
                            {hasDebtOrCollateral ? (
                                <CompactMetricDisplay
                                    label={t("borrowing.labelCurrentDebt")}
                                    value={card.currentDebt.value}
                                    valueLabel={card.currentDebt.ticker}
                                />
                            ) : null}
                            <TokenAmountInput
                                feedbackMessage={
                                    hasBorrowLimitError
                                        ? t(
                                              "borrowing.sectionBorrow.feedbackBorrowLimit"
                                          )
                                        : undefined
                                }
                                feedbackState="negative"
                                getFiatEquivalent={getBorrowFiatEquivalent}
                                inputValue={borrowAmount}
                                label={t("borrowing.sectionBorrow.labelAmountToBorrow")}
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
                                    label={t("borrowing.labelDepositedCollateral")}
                                    value={card.depositedCollateral.value}
                                    valueLabel={card.depositedCollateral.ticker}
                                />
                            ) : null}
                            <TokenAmountInput
                                balanceLabel={t("tokenAmountInput.labelBalance")}
                                balanceValue={card.collateralWalletBalance}
                                feedbackMessage={
                                    hasCollateralBalanceError
                                        ? t("tokenAmountInput.noEnoughBalance")
                                        : hasInsufficientCollateral
                                          ? `${t("borrowing.sectionBorrow.summary.txtMinCollateralNeeded")}: ${minRequiredCollateral ?? "..."} ${card.collateralTokenTicker}.`
                                          : undefined
                                }
                                feedbackState="negative"
                                getFiatEquivalent={getCollateralFiatEquivalent}
                                inputValue={collateralAmount}
                                label={t("borrowing.sectionBorrow.labelAddToCollateral")}
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
                                validateError={hasCollateralBalanceError || hasInsufficientCollateral}
                            />
                        </div>
                    </div>
                </div>

                <div className="borrow-operation-metrics">
                    <div className="borrow-operation-metrics__row borrow-operation-metrics__row--top">
                        {liquidationPriceMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
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
                                              label: t(
                                                  "beforeAfterCard.before"
                                              ),
                                              unit: liquidationPriceMetric.currentUnit,
                                              value: liquidationPriceMetric.currentValue,
                                          }
                                        : undefined
                                }
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
                                    label: t("beforeAfterCard.after"),
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
                                              label: t(
                                                  "beforeAfterCard.before"
                                              ),
                                              unit: distanceToLiquidationMetric.currentUnit,
                                              value: distanceToLiquidationMetric.currentValue,
                                          }
                                        : undefined
                                }
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
                                    label: t("beforeAfterCard.after"),
                                    unit: hasBorrowTyped && minRequiredCollateralValue > 0
                                        ? card.collateralTokenTicker
                                        : minRequiredCollateralMetric.currentUnit,
                                    value: hasBorrowTyped && minRequiredCollateralValue > 0
                                        ? (minRequiredCollateral ?? minRequiredCollateralMetric.currentValue)
                                        : minRequiredCollateralMetric.currentValue,
                                }}
                                before={
                                    hasDebtOrCollateral
                                        ? {
                                              label: t(
                                                  "beforeAfterCard.before"
                                              ),
                                              unit: minRequiredCollateralMetric.currentUnit,
                                              value: minRequiredCollateralMetric.currentValue,
                                          }
                                        : undefined
                                }
                                title={t(
                                    "borrowing.labelMinRequieredCollateral"
                                )}
                                useBorder
                            />
                        ) : null}
                    </div>
                    <div className="borrow-operation-metrics__row borrow-operation-metrics__row--bottom">
                        {borrowAvailableMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
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
                                              label: t(
                                                  "beforeAfterCard.before"
                                              ),
                                              unit: borrowAvailableMetric.currentUnit,
                                              value: borrowAvailableMetric.currentValue,
                                          }
                                        : undefined
                                }
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
                                    label: t("beforeAfterCard.after"),
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
                                              label: t(
                                                  "beforeAfterCard.before"
                                              ),
                                              unit: borrowUsageMetric.currentUnit,
                                              value: borrowUsageMetric.currentValue,
                                          }
                                        : undefined
                                }
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
                        hasInsufficientCollateral
                            ? t("borrowing.sectionBorrow.summary.titleInsufficientCollateral")
                            : hasBorrowLimitError
                              ? t("borrowing.sectionBorrow.summary.titleBorrowLimit")
                              : hasCollateralBalanceError
                                ? t("borrowing.sectionBorrow.summary.titleNoBalance")
                                : hasPendingChanges
                                  ? t("borrowing.sectionBorrow.summary.titleReady")
                                  : t("borrowing.sectionBorrow.summary.titleNoAmount")
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
                        onClick={() =>
                            onConfirm(card, borrowAmount, collateralAmount, () => {
                                setBorrowAmount("");
                                setCollateralAmount("");
                            })
                        }
                        type="button"
                    >
                        {t("borrowing.cta.confirm")}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
