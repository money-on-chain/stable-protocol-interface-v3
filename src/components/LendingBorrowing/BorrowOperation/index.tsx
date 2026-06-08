import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount, TokenSettings } from "../../../helpers/currencies";
import { toBigIntPrecision } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import TokenAmountInput from "../../TokenAmountInput";
import { type BorrowCardData, parseMetricNumber } from "../Borrow/data";
import {
    type BorrowMetricTrend,
    formatAmount,
    parseAmount,
} from "../Borrow/operationUtils";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationCardHeader from "../MiniComponents/OperationCardHeader";
import OperationNotice from "../MiniComponents/OperationNotice";
import RateDisplay from "../MiniComponents/RateDisplay";
import { getBorrowOperationRiskDelta } from "../operationPreviewAdapter";

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
    const isMaxBorrowLoaded = card.systemMaxBorrow !== null;
    const systemMaxBorrowNum = card.systemMaxBorrow !== null ? parseAmount(card.systemMaxBorrow).value : null;
    const depositedCollateralAmount = parseAmount(card.depositedCollateral.value).value;
    const hasBorrowTyped = borrowAmount.trim().length > 0;
    const hasCollateralTyped = collateralAmount.trim().length > 0;
    const hasInvalidTypedAmount =
        (hasBorrowTyped && !borrowAmountValue.isValid) ||
        (hasCollateralTyped && !collateralAmountValue.isValid);
    // When user is also depositing collateral in the same TX, compute the
    // effective borrow limit from (existing deposited + new collateral).
    // The contract uses minCoverage (borrow constraint) not liquidationCoverage (liquidation
    // threshold) — using the wrong constant causes a ~10% overestimate in the UI.
    // When no new collateral, use the chain-reported max directly.
    const effectiveMaxBorrowNum = React.useMemo(() => {
        if (!isMaxBorrowLoaded || systemMaxBorrowNum === null) return null;
        const addingCollateral = collateralAmountValue.isValid && collateralAmountValue.value > 0;
        if (!addingCollateral) return systemMaxBorrowNum;
        if (!contractProtocolStatus.data || card.minCoverage <= 0) return systemMaxBorrowNum;
        const totalCA = depositedCollateralAmount + collateralAmountValue.value;
        if (totalCA <= 0) return systemMaxBorrowNum;
        const totalTP = Number(ConvertAmount(
            contractProtocolStatus,
            card.collateralTokenCode,
            card.borrowTokenCode,
            toBigIntPrecision(totalCA),
            card.caIndex
        )) / 1e18;
        const existingDebt = parseAmount(card.currentDebt.value).value;
        return Math.max(0, totalTP / card.minCoverage - existingDebt);
    }, [
        isMaxBorrowLoaded, systemMaxBorrowNum,
        collateralAmountValue.isValid, collateralAmountValue.value,
        depositedCollateralAmount, card.minCoverage,
        card.collateralTokenCode, card.borrowTokenCode, card.caIndex,
        card.currentDebt.value, contractProtocolStatus,
    ]);
    const maxBorrowForCalc = effectiveMaxBorrowNum ?? parseAmount(card.maxAvailable.value).value;
    const hasBorrowLimitError =
        effectiveMaxBorrowNum !== null &&
        borrowAmountValue.isValid &&
        borrowAmountValue.value > effectiveMaxBorrowNum;
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
        maxBorrowForCalc,
        collateralAmountValue.value,
        parseAmount(card.depositedCollateral.value).value,
        parseAmount(card.collateralWalletBalance).value
    );

    const handleBorrowQuickAction = (percentage: number) => {
        const nextAmount =
            percentage === 100
                ? maxBorrowForCalc
                : maxBorrowForCalc * (percentage / 100);

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

    const {
        borrowAvailableAfter, borrowAvailableAfterTrend,
        borrowUsageAfter, borrowUsageAfterTrend,
        liqPriceAfter, liqPriceAfterTrend,
        liqDistanceAfter, liqDistanceAfterTrend,
    } = React.useMemo(() => {
        if (!contractProtocolStatus.data) return {};

        const marketPriceTP = Number(ConvertAmount(
            contractProtocolStatus,
            card.collateralTokenCode,
            card.borrowTokenCode,
            toBigIntPrecision(1),
            card.caIndex
        )) / 1e18;
        if (marketPriceTP <= 0) return {};

        const totalCA = depositedCollateralAmount + (collateralAmountValue.isValid ? collateralAmountValue.value : 0);
        const existingDebt = parseAmount(card.currentDebt.value).value;
        const newDebt = existingDebt + (borrowAmountValue.isValid ? borrowAmountValue.value : 0);

        const result: {
            borrowAvailableAfter?: string;
            borrowAvailableAfterTrend?: BorrowMetricTrend;
            borrowUsageAfter?: string;
            borrowUsageAfterTrend?: BorrowMetricTrend;
            liqPriceAfter?: string;
            liqPriceAfterTrend?: BorrowMetricTrend;
            liqDistanceAfter?: string;
            liqDistanceAfterTrend?: BorrowMetricTrend;
        } = {};

        const addingCollateral = collateralAmountValue.isValid && collateralAmountValue.value > 0;
        if (totalCA > 0) {
            const currentMaxBorrow = parseAmount(borrowAvailableMetric?.currentValue ?? "0").value;
            const availableCurrentNum = currentMaxBorrow;
            const usageCurrentNum = parseAmount(borrowUsageMetric?.currentValue ?? "0").value;
            let availableNum: number | undefined;
            let usageNum: number | undefined;

            if (!addingCollateral) {
                // No new collateral: subtract new borrow from chain-accurate max to avoid oracle discrepancy.
                const newBorrowAmount = borrowAmountValue.isValid ? borrowAmountValue.value : 0;
                availableNum = Math.max(0, currentMaxBorrow - newBorrowAmount);
                const totalCapacity = existingDebt + currentMaxBorrow;
                usageNum = totalCapacity > 0 ? Math.min(100, (newDebt / totalCapacity) * 100) : 0;
            } else {
                // Adding collateral: formula-based with minCoverage (same constraint the contract uses).
                const totalTP = Number(ConvertAmount(
                    contractProtocolStatus,
                    card.collateralTokenCode,
                    card.borrowTokenCode,
                    toBigIntPrecision(totalCA),
                    card.caIndex
                )) / 1e18;
                if (totalTP > 0 && card.minCoverage > 0) {
                    const effectiveTP = totalTP / card.minCoverage;
                    availableNum = Math.max(0, effectiveTP - newDebt);
                    usageNum = effectiveTP > 0 ? Math.min(100, (newDebt / effectiveTP) * 100) : 0;
                }
            }

            if (availableNum !== undefined) {
                result.borrowAvailableAfter = formatAmount(availableNum, card.borrowTokenDecimals);
                result.borrowAvailableAfterTrend = (availableNum > availableCurrentNum + EPSILON ? "positive"
                    : availableNum < availableCurrentNum - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
            }
            if (usageNum !== undefined) {
                result.borrowUsageAfter = formatAmount(usageNum, 2);
                result.borrowUsageAfterTrend = (usageNum < usageCurrentNum - EPSILON ? "positive"
                    : usageNum > usageCurrentNum + EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
            }
        }

        if (totalCA > 0 && newDebt > 0 && card.liquidationCoverage > 0) {
            const newLiqPrice = (card.liquidationCoverage * newDebt) / totalCA;
            const newLiqDrop = Math.max(0, (1 - newLiqPrice / marketPriceTP) * 100);
            const currentLiqPrice = parseAmount(liquidationPriceMetric?.currentValue ?? "0").value;
            const currentLiqDrop = parseAmount(distanceToLiquidationMetric?.currentValue ?? "0").value;
            result.liqPriceAfter = formatAmount(newLiqPrice, 2);
            result.liqPriceAfterTrend = (newLiqPrice < currentLiqPrice - EPSILON ? "positive"
                : newLiqPrice > currentLiqPrice + EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
            result.liqDistanceAfter = formatAmount(newLiqDrop, 2);
            result.liqDistanceAfterTrend = (newLiqDrop > currentLiqDrop + EPSILON ? "positive"
                : newLiqDrop < currentLiqDrop - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
        }

        return result;
    }, [
        depositedCollateralAmount,
        collateralAmountValue.isValid,
        collateralAmountValue.value,
        borrowAmountValue.isValid,
        borrowAmountValue.value,
        card.collateralTokenCode,
        card.borrowTokenCode,
        card.caIndex,
        card.borrowTokenDecimals,
        card.currentDebt.value,
        card.liquidationCoverage,
        card.minCoverage,
        borrowAvailableMetric,
        borrowUsageMetric,
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        contractProtocolStatus,
    ]);

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
                  liquidationPriceMetric && liqPriceAfter !== undefined
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liqPriceAfter} ${card.borrowTokenTicker}/${card.collateralTokenTicker}.`
                      : null,
                  borrowAvailableMetric && borrowAvailableAfter !== undefined
                      ? `${t("borrowing.sectionBorrow.summary.txtBorrowAvailableWithDepositedCollateral")}: ${borrowAvailableAfter} ${card.borrowTokenTicker}.`
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
            <OperationCardHeader
                aside={
                    <RateDisplay
                        number={card.borrowApy}
                        title={`${card.borrowTokenTicker}/${card.collateralTokenTicker} ${t("borrowing.sectionBorrow.apy")}`}
                    />
                }
                onBack={onBack}
                title={t("borrowing.sectionBorrow.cardTitle")}
            />

            <div className="borrow-operation-body">
                <div className="borrow-operation-main">
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
                                label={t(
                                    "borrowing.sectionBorrow.labelAmountToBorrow"
                                )}
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
                                    label={t(
                                        "borrowing.labelDepositedCollateral"
                                    )}
                                    value={card.depositedCollateral.value}
                                    valueLabel={card.depositedCollateral.ticker}
                                />
                            ) : null}
                            <TokenAmountInput
                                balanceLabel={t(
                                    "tokenAmountInput.labelBalance"
                                )}
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
                                label={t(
                                    "borrowing.sectionBorrow.labelAddToCollateral"
                                )}
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
                                    unit: (hasBorrowTyped || hasCollateralTyped) && liqPriceAfter !== undefined
                                        ? `${card.borrowTokenTicker}/${card.collateralTokenTicker}`
                                        : liquidationPriceMetric.currentUnit,
                                    value: (hasBorrowTyped || hasCollateralTyped) && liqPriceAfter !== undefined
                                        ? liqPriceAfter
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
                                    (hasBorrowTyped || hasCollateralTyped) &&
                                    liquidationPriceMetric.showTrend &&
                                    liqPriceAfterTrend !== undefined
                                        ? liqPriceAfterTrend
                                        : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {distanceToLiquidationMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
                                    unit: (hasBorrowTyped || hasCollateralTyped) && liqDistanceAfter !== undefined
                                        ? "%"
                                        : distanceToLiquidationMetric.currentUnit,
                                    value: (hasBorrowTyped || hasCollateralTyped) && liqDistanceAfter !== undefined
                                        ? liqDistanceAfter
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
                                    (hasBorrowTyped || hasCollateralTyped) &&
                                    distanceToLiquidationMetric.showTrend &&
                                    liqDistanceAfterTrend !== undefined
                                        ? liqDistanceAfterTrend
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
                                    unit: (hasBorrowTyped || hasCollateralTyped) && borrowAvailableAfter !== undefined
                                        ? card.borrowTokenTicker
                                        : borrowAvailableMetric.currentUnit,
                                    value: (hasBorrowTyped || hasCollateralTyped) && borrowAvailableAfter !== undefined
                                        ? borrowAvailableAfter
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
                                    (hasBorrowTyped || hasCollateralTyped) &&
                                    borrowAvailableMetric.showTrend &&
                                    borrowAvailableAfterTrend !== undefined
                                        ? borrowAvailableAfterTrend
                                        : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {borrowUsageMetric ? (
                            <BeforeAfterCard
                                after={{
                                    label: t("beforeAfterCard.after"),
                                    unit: (hasBorrowTyped || hasCollateralTyped) && borrowUsageAfter !== undefined
                                        ? "%"
                                        : borrowUsageMetric.currentUnit,
                                    value: (hasBorrowTyped || hasCollateralTyped) && borrowUsageAfter !== undefined
                                        ? borrowUsageAfter
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
                                    (hasBorrowTyped || hasCollateralTyped) &&
                                    borrowUsageMetric.showTrend &&
                                    borrowUsageAfterTrend !== undefined
                                        ? borrowUsageAfterTrend
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
