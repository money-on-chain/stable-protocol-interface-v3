import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount, TokenSettings } from "../../../helpers/currencies";
import { toBigIntPrecision } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import TokenAmountInput from "../../TokenAmountInput";
import type { BorrowCardData } from "../Borrow/data";
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

interface BorrowWithdrawCollateralProps {
    card: BorrowCardData;
    onConfirm: (card: BorrowCardData, collateralAmount: string, onSuccess?: () => void) => void;
    onBack: () => void;
}

const QUICK_ACTIONS = [25, 50, 75, 100];
const EPSILON = 0.001;

export default function BorrowWithdrawCollateral({
    card,
    onConfirm,
    onBack,
}: BorrowWithdrawCollateralProps): React.ReactElement {
    const [collateralAmount, setCollateralAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();

    const depositedCollateralValue = parseAmount(card.depositedCollateral.value);
    const maxWithdrawableValue = parseAmount(card.maxWithdrawableCollateral);
    const collateralAmountValue = parseAmount(collateralAmount);
    const hasTypedAmount = collateralAmount.trim().length > 0;
    const hasCollateralLimitError =
        collateralAmountValue.isValid &&
        collateralAmountValue.value > depositedCollateralValue.value;
    const hasWithdrawLimitError =
        !hasCollateralLimitError &&
        collateralAmountValue.isValid &&
        maxWithdrawableValue.isValid &&
        collateralAmountValue.value > maxWithdrawableValue.value;
    const hasValidationError =
        !collateralAmountValue.isValid || hasCollateralLimitError || hasWithdrawLimitError;
    const hasPendingChanges =
        collateralAmountValue.isValid &&
        !hasCollateralLimitError &&
        !hasWithdrawLimitError &&
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

    const [
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        minRequiredCollateralMetric,
        borrowAvailableMetric,
        borrowUsageMetric,
    ] = card.depositCollateralOperationMetrics;

    const existingDebt = parseAmount(card.currentDebt.value).value;
    const existingCA = depositedCollateralValue.value;
    const withdrawAmount = collateralAmountValue.isValid ? collateralAmountValue.value : 0;
    const remainingCA = Math.max(0, existingCA - withdrawAmount);

    const {
        liqPriceAfter, liqPriceAfterTrend,
        liqDistanceAfter, liqDistanceAfterTrend,
        borrowAvailableAfter, borrowAvailableAfterTrend,
        borrowUsageAfter, borrowUsageAfterTrend,
    } = React.useMemo(() => {
        if (!contractProtocolStatus.data || withdrawAmount <= 0 || card.liquidationCoverage <= 0) return {};

        const marketPriceTP = Number(ConvertAmount(
            contractProtocolStatus,
            card.collateralTokenCode,
            card.borrowTokenCode,
            toBigIntPrecision(1),
            card.caIndex
        )) / 1e18;
        if (marketPriceTP <= 0) return {};

        const result: {
            liqPriceAfter?: string;
            liqPriceAfterTrend?: BorrowMetricTrend;
            liqDistanceAfter?: string;
            liqDistanceAfterTrend?: BorrowMetricTrend;
            borrowAvailableAfter?: string;
            borrowAvailableAfterTrend?: BorrowMetricTrend;
            borrowUsageAfter?: string;
            borrowUsageAfterTrend?: BorrowMetricTrend;
        } = {};

        const currentLiqPrice = parseAmount(liquidationPriceMetric?.currentValue ?? "0").value;
        const currentLiqDrop = parseAmount(distanceToLiquidationMetric?.currentValue ?? "0").value;
        const currentBorrowAvailable = parseAmount(borrowAvailableMetric?.currentValue ?? "0").value;
        const currentBorrowUsage = parseAmount(borrowUsageMetric?.currentValue ?? "0").value;

        if (existingDebt > 0 && remainingCA > 0) {
            const newLiqPrice = (card.liquidationCoverage * existingDebt) / remainingCA;
            const newLiqDrop = Math.max(0, (1 - newLiqPrice / marketPriceTP) * 100);
            result.liqPriceAfter = formatAmount(newLiqPrice, 2);
            result.liqPriceAfterTrend = (newLiqPrice < currentLiqPrice - EPSILON ? "positive"
                : newLiqPrice > currentLiqPrice + EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
            result.liqDistanceAfter = formatAmount(newLiqDrop, 2);
            result.liqDistanceAfterTrend = (newLiqDrop > currentLiqDrop + EPSILON ? "positive"
                : newLiqDrop < currentLiqDrop - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
        } else if (existingDebt > 0 && remainingCA <= 0) {
            // All collateral withdrawn with active debt — show zero distance
            result.liqPriceAfter = formatAmount(0, 2);
            result.liqPriceAfterTrend = "negative";
            result.liqDistanceAfter = formatAmount(0, 2);
            result.liqDistanceAfterTrend = "negative";
        }

        if (remainingCA > 0) {
            const remainingTP = Number(ConvertAmount(
                contractProtocolStatus,
                card.collateralTokenCode,
                card.borrowTokenCode,
                toBigIntPrecision(remainingCA),
                card.caIndex
            )) / 1e18;
            const effectiveTP = remainingTP / card.liquidationCoverage;
            const newBorrowAvailable = Math.max(0, effectiveTP - existingDebt);
            const totalCapacity = existingDebt + newBorrowAvailable;
            const newUsage = totalCapacity > 0 ? Math.min(100, (existingDebt / totalCapacity) * 100) : 0;

            result.borrowAvailableAfter = formatAmount(newBorrowAvailable, card.borrowTokenDecimals);
            result.borrowAvailableAfterTrend = (newBorrowAvailable > currentBorrowAvailable + EPSILON ? "positive"
                : newBorrowAvailable < currentBorrowAvailable - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
            result.borrowUsageAfter = formatAmount(newUsage, 2);
            result.borrowUsageAfterTrend = (newUsage < currentBorrowUsage - EPSILON ? "positive"
                : newUsage > currentBorrowUsage + EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
        } else {
            result.borrowAvailableAfter = formatAmount(0, card.borrowTokenDecimals);
            result.borrowAvailableAfterTrend = "negative";
            result.borrowUsageAfter = formatAmount(existingDebt > 0 ? 100 : 0, 2);
            result.borrowUsageAfterTrend = existingDebt > 0 ? "negative" : "neutral";
        }

        return result;
    }, [
        withdrawAmount, remainingCA, existingDebt,
        card.liquidationCoverage, card.collateralTokenCode, card.borrowTokenCode,
        card.caIndex, card.borrowTokenDecimals,
        liquidationPriceMetric, distanceToLiquidationMetric,
        borrowAvailableMetric, borrowUsageMetric,
        contractProtocolStatus,
    ]);

    const maxWithdrawable = maxWithdrawableValue.isValid
        ? Math.min(maxWithdrawableValue.value, depositedCollateralValue.value)
        : depositedCollateralValue.value;

    const handleQuickAction = (percentage: number) => {
        const rawAmount = depositedCollateralValue.value * (percentage / 100);
        setCollateralAmount(formatAmount(Math.min(rawAmount, maxWithdrawable), card.collateralTokenDecimals));
    };

    const handleUseMaxCollateral = () => {
        setCollateralAmount(formatAmount(maxWithdrawable, card.collateralTokenDecimals));
    };

    const noticeLines = hasPendingChanges
        ? (() => {
              return [
                  `${t("borrowing.sectionWithdrawCollateral.summary.txtWithdrawingCollateral")}: ${collateralAmount} ${card.collateralTokenTicker}.`,
                  liqPriceAfter !== undefined
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liqPriceAfter} ${card.borrowTokenTicker}/${card.collateralTokenTicker}.`
                      : null,
                  borrowAvailableAfter !== undefined
                      ? `${t("borrowing.labelAvailableWithCollateral")}: ${borrowAvailableAfter} ${card.borrowTokenTicker}.`
                      : null,
                  t("borrowing.risk.increase"),
              ].filter(Boolean);
          })()
        : [t("borrowing.sectionWithdrawCollateral.summary.txtEnterAmount")];

    return (
        <div className="layout-card borrow-withdraw-collateral-view">
            <OperationCardHeader
                onBack={onBack}
                title={t("borrowing.sectionWithdrawCollateral.cardTitle")}
            />

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
                                    label={t(
                                        "borrowing.labelDepositedCollateral"
                                    )}
                                    value={card.depositedCollateral.value}
                                    valueLabel={card.depositedCollateral.ticker}
                                />

                                <TokenAmountInput
                                    feedbackMessage={
                                        hasCollateralLimitError
                                            ? t("borrowing.sectionWithdrawCollateral.feedbackCollateralLimit")
                                            : hasWithdrawLimitError
                                                ? t("borrowing.sectionWithdrawCollateral.feedbackWithdrawLimit")
                                                : undefined
                                    }
                                    feedbackState="negative"
                                    getFiatEquivalent={getFiatEquivalent}
                                    inputValue={collateralAmount}
                                    label={t("borrowing.sectionWithdrawCollateral.labelAmountToWithdraw")}
                                    onMaxClick={handleUseMaxCollateral}
                                    onQuickActionClick={handleQuickAction}
                                    onValueChange={setCollateralAmount}
                                    quickActions={QUICK_ACTIONS.filter(
                                        (percentage) => percentage !== 100
                                    )}
                                    showMaxShortcut
                                    testId="borrow-withdraw-collateral-input"
                                    tokenIconClassName={card.collateralTokenIconClassName}
                                    tokenLabel={card.collateralTokenTicker}
                                    validateError={hasCollateralLimitError || hasWithdrawLimitError}
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
                                    isInvalid: hasTypedAmount && !collateralAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: liquidationPriceMetric.currentUnit,
                                    value: hasPendingChanges && liqPriceAfter !== undefined
                                        ? liqPriceAfter
                                        : liquidationPriceMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: liquidationPriceMetric.currentUnit,
                                    value: liquidationPriceMetric.currentValue,
                                }}
                                title={t("borrowing.labelLiquidationPrice")}
                                trend={hasPendingChanges && liquidationPriceMetric.showTrend && liqPriceAfterTrend !== undefined
                                    ? liqPriceAfterTrend
                                    : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {distanceToLiquidationMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !collateralAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: distanceToLiquidationMetric.currentUnit,
                                    value: hasPendingChanges && liqDistanceAfter !== undefined
                                        ? liqDistanceAfter
                                        : distanceToLiquidationMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: distanceToLiquidationMetric.currentUnit,
                                    value: distanceToLiquidationMetric.currentValue,
                                }}
                                title={t("borrowing.labelDistanceToLiquidation")}
                                trend={hasPendingChanges && distanceToLiquidationMetric.showTrend && liqDistanceAfterTrend !== undefined
                                    ? liqDistanceAfterTrend
                                    : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {minRequiredCollateralMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !collateralAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: minRequiredCollateralMetric.currentUnit,
                                    value: minRequiredCollateralMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: minRequiredCollateralMetric.currentUnit,
                                    value: minRequiredCollateralMetric.currentValue,
                                }}
                                title={t("borrowing.labelMinRequieredCollateral")}
                                useBorder
                            />
                        ) : null}
                    </div>

                    <div className="borrow-withdraw-collateral-metrics__row borrow-withdraw-collateral-metrics__row--bottom">
                        {borrowAvailableMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !collateralAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: borrowAvailableMetric.currentUnit,
                                    value: hasPendingChanges && borrowAvailableAfter !== undefined
                                        ? borrowAvailableAfter
                                        : borrowAvailableMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: borrowAvailableMetric.currentUnit,
                                    value: borrowAvailableMetric.currentValue,
                                }}
                                title={t("borrowing.labelAvailableWithCollateral")}
                                trend={hasPendingChanges && borrowAvailableMetric.showTrend && borrowAvailableAfterTrend !== undefined
                                    ? borrowAvailableAfterTrend
                                    : undefined
                                }
                                useBorder
                            />
                        ) : null}
                        {borrowUsageMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !collateralAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: borrowUsageMetric.currentUnit,
                                    value: hasPendingChanges && borrowUsageAfter !== undefined
                                        ? borrowUsageAfter
                                        : borrowUsageMetric.currentValue,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: borrowUsageMetric.currentUnit,
                                    value: borrowUsageMetric.currentValue,
                                }}
                                title={t("borrowing.labelBorrowUsage")}
                                trend={hasPendingChanges && borrowUsageMetric.showTrend && borrowUsageAfterTrend !== undefined
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
                        hasPendingChanges
                            ? t("borrowing.sectionWithdrawCollateral.summary.titleReady")
                            : t("borrowing.sectionWithdrawCollateral.summary.titleNoAmount")
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
