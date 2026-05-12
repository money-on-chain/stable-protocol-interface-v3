import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount, TokenSettings } from "../../../helpers/currencies";
import { toBigIntPrecision } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import TokenAmountInput from "../../TokenAmountInput";
import { type LendCardData } from "../Lend/data";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import OperationActions from "../MiniComponents/OperationActions";
import OperationCardHeader from "../MiniComponents/OperationCardHeader";
import OperationNotice from "../MiniComponents/OperationNotice";
import RateDisplay from "../MiniComponents/RateDisplay";

interface LendEarnProps {
    onConfirm: (token: LendCardData, amount: string) => void;
    onBack: () => void;
    token: LendCardData;
}

const QUICK_ACTIONS = [25, 50, 75, 100];

function formatAmount(value: number): string {
    return value.toLocaleString("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });
}

function parseAmount(rawAmount: string): {
    isValid: boolean;
    value: number;
} {
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

export default function LendEarn({
    onConfirm,
    onBack,
    token,
}: LendEarnProps): React.ReactElement {
    const [amount, setAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { i18n, t } = useProjectTranslation();
    const { isValid: isAmountValid, value: amountValue } = parseAmount(amount);
    const walletBalanceValue = parseAmount(token.walletBalance);
    const hasTypedAmount = amount.trim().length > 0;
    const hasBalanceError =
        isAmountValid && amountValue > walletBalanceValue.value;
    const hasValidationError = !isAmountValid || hasBalanceError;
    const hasSelectedAmount =
        isAmountValid && !hasBalanceError && amountValue > 0;
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
                token.tokenCode,
                "USD",
                amountBigInt,
                token.caIndex
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
        [contractProtocolStatus, i18n, token.caIndex, token.tokenCode]
    );

    const handleQuickAmountSelection = (percentage: number) => {
        const nextAmount =
            percentage === 100
                ? walletBalanceValue.value
                : walletBalanceValue.value * (percentage / 100);

        setAmount(formatAmount(nextAmount));
    };

    return (
        <div className="layout-card lend-earn-view">
            <OperationCardHeader
                aside={
                    <RateDisplay
                        number={token.supplyApy}
                        title={`${token.tokenTicker} ${t(
                            "lending.sectionEarn.apy"
                        )}`}
                    />
                }
                onBack={onBack}
                title={t("lending.sectionEarn.cardTitle")}
            />

            <div className="lend-earn-body">
                <div className="lend-earn-main">
                    <div className="lend-earn-content">
                        <TokenAmountInput
                            balanceLabel={t("tokenAmountInput.labelBalance")}
                            balanceValue={token.walletBalance}
                            feedbackMessage={
                                hasBalanceError
                                    ? t("tokenAmountInput.noEnoughBalance")
                                    : undefined
                            }
                            feedbackState="negative"
                            getFiatEquivalent={getFiatEquivalent}
                            inputValue={amount}
                            label={t("lending.sectionEarn.labelAmountToLend")}
                            onMaxClick={() => handleQuickAmountSelection(100)}
                            onQuickActionClick={handleQuickAmountSelection}
                            onValueChange={setAmount}
                            quickActions={QUICK_ACTIONS.filter(
                                (percentage) => percentage !== 100
                            )}
                            showMaxShortcut
                            testId="lend-earn-input"
                            tokenIconClassName={token.tokenIconClassName}
                            tokenLabel={token.tokenTicker}
                            validateError={hasBalanceError}
                        />

                        <div className="lend-earn-summary-column">
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !isAmountValid,
                                    label: t("beforeAfterCard.after"),
                                    unit: token.depositedTicker,
                                    value: hasSelectedAmount ? amount : "0.00",
                                }}
                                title={t("lending.labelDeposits")}
                                useBorder
                            />
                        </div>
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasBalanceError
                            ? t("lending.sectionEarn.summary.titleBalanceError")
                            : hasSelectedAmount
                              ? t("lending.sectionEarn.summary.titleAmountOK")
                              : t("lending.sectionEarn.summary.titleNoAmount")
                    }
                >
                    {hasBalanceError
                        ? t("lending.sectionEarn.summary.txtExceedsBalance")
                        : hasSelectedAmount
                          ? `${t("lending.sectionEarn.summary.txtAboutToLend")}: ${amount} ${token.tokenTicker}.`
                          : t("lending.sectionEarn.summary.txtEnterAmount")}
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button"
                        disabled={!hasSelectedAmount || hasValidationError}
                        onClick={() => onConfirm(token, amount)}
                        type="button"
                    >
                        {hasSelectedAmount
                            ? t("lending.sectionEarn.cta.ok")
                            : t("lending.sectionEarn.cta.noAmount")}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
