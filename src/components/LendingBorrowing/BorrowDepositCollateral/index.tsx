import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmountLending, TokenSettings } from "../../../helpers/currencies";
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

interface BorrowDepositCollateralProps {
    card: BorrowCardData;
    onConfirm: (card: BorrowCardData, collateralAmount: string, onSuccess?: () => void) => void;
    onBack: () => void;
}

const QUICK_ACTIONS = [25, 50, 75, 100];
const EPSILON = 0.001;

const IS_MOC_V1 =
    import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "moc-v1";

export default function BorrowDepositCollateral({
    card,
    onConfirm,
    onBack,
}: BorrowDepositCollateralProps): React.ReactElement {
    const [collateralAmount, setCollateralAmount] = React.useState("");
    const { contractProtocolStatus, contractProtocolStatusV1 } = useWalletContext();
    // contractProtocolStatus (v3) is never populated for moc-v1 — price data
    // comes from contractProtocolStatusV1 there instead (see ConvertAmountLending).
    const hasPriceData = IS_MOC_V1
        ? !!contractProtocolStatusV1.data
        : !!contractProtocolStatus.data;
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

            if (amountBigInt < 0n || !hasPriceData) {
                return PrecisionNumbers({
                    amount: 0n,
                    token: TokenSettings("CA_0"),
                    decimals: 2,
                    i18n,
                    isUSD: true,
                    compact: true,
                });
            }

            const amountUSD = ConvertAmountLending(
                contractProtocolStatus,
                contractProtocolStatusV1,
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
        [card.caIndex, card.collateralTokenCode, contractProtocolStatus, contractProtocolStatusV1, hasPriceData, i18n]
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
    const newCollateral = collateralAmountValue.isValid ? collateralAmountValue.value : 0;
    const totalCA = existingCA + newCollateral;

    const {
        liqPriceAfter, liqPriceAfterTrend,
        liqDistanceAfter, liqDistanceAfterTrend,
        borrowAvailableAfter, borrowAvailableAfterTrend,
        borrowUsageAfter, borrowUsageAfterTrend,
    } = React.useMemo(() => {
        if (!hasPriceData || newCollateral <= 0 || totalCA <= 0 || card.liquidationCoverage <= 0) return {};

        const marketPriceTP = Number(ConvertAmountLending(
            contractProtocolStatus,
            contractProtocolStatusV1,
            card.collateralTokenCode,
            card.borrowTokenCode,
            toBigIntPrecision(1),
            card.caIndex
        )) / 1e18;
        if (marketPriceTP <= 0) return {};

        const totalTP = Number(ConvertAmountLending(
            contractProtocolStatus,
            contractProtocolStatusV1,
            card.collateralTokenCode,
            card.borrowTokenCode,
            toBigIntPrecision(totalCA),
            card.caIndex
        )) / 1e18;
        if (totalTP <= 0) return {};

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

        if (existingDebt > 0) {
            const newLiqPrice = (card.liquidationCoverage * existingDebt) / totalCA;
            const newLiqDrop = Math.max(0, (1 - newLiqPrice / marketPriceTP) * 100);
            result.liqPriceAfter = formatAmount(newLiqPrice, 2);
            result.liqPriceAfterTrend = (newLiqPrice < currentLiqPrice - EPSILON ? "positive"
                : newLiqPrice > currentLiqPrice + EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
            result.liqDistanceAfter = formatAmount(newLiqDrop, 2);
            result.liqDistanceAfterTrend = (newLiqDrop > currentLiqDrop + EPSILON ? "positive"
                : newLiqDrop < currentLiqDrop - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
        }

        const effectiveTP = totalTP / card.liquidationCoverage;
        const newBorrowAvailable = Math.max(0, effectiveTP - existingDebt);
        const totalCapacity = existingDebt + newBorrowAvailable;
        const newUsage = totalCapacity > 0 ? Math.min(100, (existingDebt / totalCapacity) * 100) : 0;

        result.borrowAvailableAfter = formatAmount(newBorrowAvailable, card.borrowTokenDecimals);
        result.borrowAvailableAfterTrend = (newBorrowAvailable > currentBorrowAvailable + EPSILON ? "positive"
            : newBorrowAvailable < currentBorrowAvailable - EPSILON ? "negative" : "neutral") as BorrowMetricTrend;
        result.borrowUsageAfter = formatAmount(newUsage, 2);
        result.borrowUsageAfterTrend = (newUsage < currentBorrowUsage - EPSILON ? "positive"
            : newUsage > currentBorrowUsage + EPSILON ? "negative" : "neutral") as BorrowMetricTrend;

        return result;
    }, [
        newCollateral, totalCA, existingDebt, existingCA,
        card.liquidationCoverage, card.collateralTokenCode, card.borrowTokenCode,
        card.caIndex, card.borrowTokenDecimals,
        liquidationPriceMetric, distanceToLiquidationMetric,
        borrowAvailableMetric, borrowUsageMetric,
        contractProtocolStatus, contractProtocolStatusV1, hasPriceData,
    ]);

    const handleQuickAction = (percentage: number) => {
        const nextAmount =
            percentage === 100
                ? collateralWalletBalanceValue.value
                : collateralWalletBalanceValue.value * (percentage / 100);

        setCollateralAmount(formatAmount(nextAmount, card.collateralTokenDecimals));
    };

    const handleUseMaxCollateral = () => {
        setCollateralAmount(formatAmount(collateralWalletBalanceValue.value, card.collateralTokenDecimals));
    };

    const noticeLines = hasPendingChanges
        ? (() => {
              return [
                  `${t("borrowing.sectionDepositCollateral.summary.txtDepositingCollateral")}: ${collateralAmount} ${card.collateralTokenTicker}.`,
                  liqPriceAfter !== undefined
                      ? `${t("borrowing.labelLiquidationPrice")}: ${liqPriceAfter} ${card.borrowTokenTicker}/${card.collateralTokenTicker}.`
                      : null,
                  borrowAvailableAfter !== undefined
                      ? `${t("borrowing.labelAvailableWithCollateral")}: ${borrowAvailableAfter} ${card.borrowTokenTicker}.`
                      : null,
                  t("borrowing.risk.decrease"),
              ].filter(Boolean);
          })()
        : [t("borrowing.sectionDepositCollateral.summary.txtEnterAmount")];

    return (
        <div className="layout-card borrow-deposit-collateral-view">
            <OperationCardHeader
                onBack={onBack}
                title={t("borrowing.sectionDepositCollateral.cardTitle")}
            />

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
                                    label={t(
                                        "borrowing.labelDepositedCollateral"
                                    )}
                                    value={card.depositedCollateral.value}
                                    valueLabel={card.depositedCollateral.ticker}
                                />

                                <TokenAmountInput
                                    feedbackMessage={
                                        hasCollateralBalanceError
                                            ? t(
                                                  "tokenAmountInput.noEnoughBalance"
                                              )
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
                                    isInvalid: hasTypedAmount && !collateralAmountValue.isValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: hasPendingChanges && liqPriceAfter !== undefined
                                        ? liquidationPriceMetric.currentUnit
                                        : liquidationPriceMetric.currentUnit,
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
