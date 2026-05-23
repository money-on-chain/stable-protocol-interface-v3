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
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";

interface BorrowRepayProps {
    card: BorrowCardData;
    onConfirm: (card: BorrowCardData, repayAmount: string, onSuccess?: () => void) => void;
    onBack: () => void;
}

const QUICK_ACTIONS = [25, 50, 75, 100];
const EPSILON = 0.001;

export default function BorrowRepay({
    card,
    onConfirm,
    onBack,
}: BorrowRepayProps): React.ReactElement {
    const [repayAmount, setRepayAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();

    const currentDebtValue = parseAmount(card.currentDebt.value);
    const walletBalanceValue = parseAmount(card.borrowTokenWalletBalance);
    const repayAmountValue = parseAmount(repayAmount);
    const hasTypedAmount = repayAmount.trim().length > 0;
    const hasDebtLimitError =
        repayAmountValue.isValid &&
        repayAmountValue.value > currentDebtValue.value;
    // The action approves tpAmount * 1.01 to cover PCU drift between read and TX.
    // The contract may transfer up to tpAmount * 1.01 from the wallet, so we need
    // walletBalance >= repayAmount * 1.01.
    const maxRepayableFromWallet = walletBalanceValue.isValid
        ? walletBalanceValue.value / 1.01
        : Infinity;
    const hasWalletBalanceError =
        repayAmountValue.isValid &&
        walletBalanceValue.isValid &&
        repayAmountValue.value > maxRepayableFromWallet;
    const hasValidationError = !repayAmountValue.isValid || hasDebtLimitError || hasWalletBalanceError;
    const hasPendingChanges =
        repayAmountValue.isValid &&
        !hasDebtLimitError &&
        !hasWalletBalanceError &&
        repayAmountValue.value > 0;

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

    const [
        liquidationPriceMetric,
        distanceToLiquidationMetric,
        minRequiredCollateralMetric,
        borrowAvailableMetric,
        borrowUsageMetric,
    ] = card.repayOperationMetrics;

    const existingDebt = currentDebtValue.value;
    const existingCA = parseAmount(card.depositedCollateral.value).value;
    const repayValue = repayAmountValue.isValid ? repayAmountValue.value : 0;
    const newDebt = Math.max(0, existingDebt - repayValue);
    const currentMaxBorrow = parseAmount(borrowAvailableMetric?.currentValue ?? "0").value;

    const {
        liqPriceAfter, liqPriceAfterTrend,
        liqDistanceAfter, liqDistanceAfterTrend,
        borrowAvailableAfter, borrowAvailableAfterTrend,
        borrowUsageAfter, borrowUsageAfterTrend,
    } = React.useMemo(() => {
        if (repayValue <= 0) return {};

        const currentLiqPrice = parseAmount(liquidationPriceMetric?.currentValue ?? "0").value;
        const currentLiqDrop = parseAmount(distanceToLiquidationMetric?.currentValue ?? "0").value;
        const currentBorrowUsage = parseAmount(borrowUsageMetric?.currentValue ?? "0").value;

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

        // Liq price and distance — need market price for distance computation
        if (existingCA > 0 && card.liquidationCoverage > 0 && contractProtocolStatus.data) {
            const marketPriceTP = Number(ConvertAmount(
                contractProtocolStatus,
                card.collateralTokenCode,
                card.borrowTokenCode,
                toBigIntPrecision(1),
                card.caIndex
            )) / 1e18;

            if (marketPriceTP > 0) {
                if (newDebt <= 0) {
                    // Fully repaid — no liquidation risk
                    result.liqPriceAfter = formatAmount(0, 2);
                    result.liqPriceAfterTrend = "positive";
                    result.liqDistanceAfter = formatAmount(100, 2);
                    result.liqDistanceAfterTrend = "positive";
                } else {
                    const newLiqPrice = (card.liquidationCoverage * newDebt) / existingCA;
                    const newLiqDrop = Math.max(0, (1 - newLiqPrice / marketPriceTP) * 100);
                    result.liqPriceAfter = formatAmount(newLiqPrice, 2);
                    result.liqPriceAfterTrend = (newLiqPrice < currentLiqPrice - EPSILON ? "positive"
                        : newLiqPrice > currentLiqPrice + EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
                    result.liqDistanceAfter = formatAmount(newLiqDrop, 2);
                    result.liqDistanceAfterTrend = (newLiqDrop > currentLiqDrop + EPSILON ? "positive"
                        : newLiqDrop < currentLiqDrop - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
                }
            }
        }

        // Borrow available increases by the amount repaid (exact, no oracle needed)
        const newMaxBorrow = currentMaxBorrow + repayValue;
        result.borrowAvailableAfter = formatAmount(newMaxBorrow, card.borrowTokenDecimals);
        result.borrowAvailableAfterTrend = (newMaxBorrow > currentMaxBorrow + EPSILON ? "positive"
            : newMaxBorrow < currentMaxBorrow - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;

        // Usage = newDebt / (newDebt + newMaxBorrow) * 100
        const totalCapacity = newDebt + newMaxBorrow;
        const newUsage = totalCapacity > 0 ? Math.min(100, (newDebt / totalCapacity) * 100) : 0;
        result.borrowUsageAfter = formatAmount(newUsage, 2);
        result.borrowUsageAfterTrend = (newUsage < currentBorrowUsage - EPSILON ? "positive"
            : newUsage > currentBorrowUsage + EPSILON ? "negative" : "neutral") as BorrowMetricTrend;

        return result;
    }, [
        repayValue, newDebt, existingCA, existingDebt, currentMaxBorrow,
        card.liquidationCoverage, card.collateralTokenCode, card.borrowTokenCode,
        card.caIndex, card.borrowTokenDecimals,
        liquidationPriceMetric, distanceToLiquidationMetric,
        borrowUsageMetric, contractProtocolStatus,
    ]);

    const handleQuickAction = (percentage: number) => {
        const rawAmount = currentDebtValue.value * (percentage / 100);
        setRepayAmount(formatAmount(Math.min(rawAmount, maxRepayableFromWallet), card.borrowTokenDecimals));
    };

    const handleRepayInFull = () => {
        const maxRepayable = Math.min(currentDebtValue.value, maxRepayableFromWallet);
        setRepayAmount(formatAmount(maxRepayable, card.borrowTokenDecimals));
    };

    const noticeLines = hasPendingChanges
        ? (() => {
              return [
                  `${t("borrowing.sectionRepay.summary.txtRepaying")}: ${repayAmount} ${card.currentDebt.ticker}.`,
                  liqPriceAfter !== undefined
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liqPriceAfter} ${card.borrowTokenTicker}/${card.collateralTokenTicker}.`
                      : null,
                  borrowAvailableAfter !== undefined
                      ? `${t("borrowing.labelAvailableWithCollateral")}: ${borrowAvailableAfter} ${card.borrowTokenTicker}.`
                      : null,
                  borrowUsageAfter !== undefined
                      ? `${t("borrowing.labelBorrowUsage")}: ${borrowUsageAfter}%.`
                      : null,
                  t("borrowing.risk.decrease"),
              ].filter(Boolean);
          })()
        : [t("borrowing.sectionRepay.summary.txtEnterAmount")];

    return (
        <div className="layout-card borrow-repay-view">
            <div className="layout-card-title borrow-repay-title">
                <h1>{t("borrowing.sectionRepay.cardTitle")}</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="borrow-repay-body">
                <div className="borrow-repay-main">
                    <div className="borrow-repay-panel">
                        <CompactMetricDisplay
                            label={t("borrowing.labelCurrentDebt")}
                            value={card.currentDebt.value}
                            valueLabel={card.currentDebt.ticker}
                        />
                        <TokenAmountInput
                            feedbackMessage={
                                hasDebtLimitError
                                    ? t("borrowing.sectionRepay.feedbackDebtLimit")
                                    : hasWalletBalanceError
                                      ? t("borrowing.sectionRepay.feedbackWalletBalance")
                                      : undefined
                            }
                            feedbackState="negative"
                            getFiatEquivalent={getFiatEquivalent}
                            inputValue={repayAmount}
                            label={t("borrowing.sectionRepay.labelAmountToRepay")}
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
                            validateError={hasDebtLimitError || hasWalletBalanceError}
                        />
                    </div>
                </div>

                <div className="borrow-repay-metrics">
                    <div className="borrow-repay-metrics__row borrow-repay-metrics__row--top">
                        {liquidationPriceMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !repayAmountValue.isValid,
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
                                    isInvalid: hasTypedAmount && !repayAmountValue.isValid,
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
                                    isInvalid: hasTypedAmount && !repayAmountValue.isValid,
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

                    <div className="borrow-repay-metrics__row borrow-repay-metrics__row--bottom">
                        {borrowAvailableMetric ? (
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !repayAmountValue.isValid,
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
                                    isInvalid: hasTypedAmount && !repayAmountValue.isValid,
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
                        hasDebtLimitError
                            ? t("borrowing.sectionRepay.summary.titleDebtLimit")
                            : hasWalletBalanceError
                              ? t("borrowing.sectionRepay.summary.titleWalletBalance")
                              : hasPendingChanges
                                ? t("borrowing.sectionRepay.summary.titleReady")
                                : t("borrowing.sectionRepay.summary.titleNoAmount")
                    }
                >
                    <div className="borrow-repay-notice-lines">
                        {(hasDebtLimitError
                            ? [t("borrowing.sectionRepay.summary.txtDebtLimit")]
                            : hasWalletBalanceError
                              ? [t("borrowing.sectionRepay.summary.txtWalletBalance")]
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
                        {t("borrowing.sectionRepay.cta.repayInFull")}
                    </button>
                    <button
                        className="button borrow-repay-actions__confirm"
                        disabled={!hasPendingChanges || hasValidationError}
                        onClick={() => onConfirm(card, repayAmount, () => setRepayAmount(""))}
                        type="button"
                    >
                        {hasPendingChanges
                            ? t("borrowing.sectionRepay.cta.ok")
                            : t("borrowing.sectionRepay.cta.noAmount")}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
