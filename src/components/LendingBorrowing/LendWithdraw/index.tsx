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
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";
import RateDisplay from "../MiniComponents/RateDisplay";

interface LendWithdrawProps {
    onBack: () => void;
    token: LendCardData;
}

const QUICK_ACTIONS = [25, 50, 75, 100];

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

function formatAmount(value: number): string {
    return value.toLocaleString("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });
}

export default function LendWithdraw({
    onBack,
    token,
}: LendWithdrawProps): React.ReactElement {
    const [amount, setAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { i18n } = useProjectTranslation();

    const availableValue = parseAmount(token.availableToWithdrawAmount);
    const { isValid: isAmountValid, value: amountValue } = parseAmount(amount);
    const hasTypedAmount = amount.trim().length > 0;
    const hasAvailableBalanceError =
        isAmountValid && amountValue > availableValue.value;
    const hasValidationError = !isAmountValid || hasAvailableBalanceError;
    const hasSelectedAmount =
        isAmountValid && !hasAvailableBalanceError && amountValue > 0;
    const cappedWithdrawValue = Math.min(amountValue, availableValue.value);
    const nextDepositValue = Math.max(
        availableValue.value - cappedWithdrawValue,
        0
    );
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
                ? availableValue.value
                : availableValue.value * (percentage / 100);

        setAmount(formatAmount(nextAmount));
    };

    const handleWithdrawAll = () => {
        setAmount(formatAmount(availableValue.value));
    };

    return (
        <div className="layout-card lend-withdraw-view">
            <div className="layout-card-title lend-withdraw-title">
                <h1>Withdraw</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="lend-withdraw-body">
                <div className="lend-withdraw-main">
                    <div className="lend-withdraw-header">
                        <div className="lend-withdraw-header__spacer"></div>
                        <RateDisplay
                            number={token.supplyApy}
                            title={`${token.tokenTicker}/DOC Variable APY`}
                        />
                    </div>

                    <div className="lend-withdraw-content">
                        <div className="lend-withdraw-inputs">
                            {/* <TokenAmountInput
                            displayOnly
                            fiatValue={token.availableToWithdrawAmountUsd}
                            inputValue={token.availableToWithdrawAmount}
                            label="Deposits + Earnings"
                            showMaxShortcut={false}
                            testId="lend-withdraw-available"
                            tokenIconClassName={token.tokenIconClassName}
                            tokenLabel={token.tokenTicker}
                        /> */}

                            <CompactMetricDisplay
                                label="Deposits + Earnings"
                                value={token.availableToWithdrawAmount}
                                valueLabel={token.tokenTicker}
                            />

                            <TokenAmountInput
                                feedbackMessage={
                                    hasAvailableBalanceError
                                        ? "Amount exceeds your available withdraw balance"
                                        : undefined
                                }
                                feedbackState="negative"
                                getFiatEquivalent={getFiatEquivalent}
                                fiatValue="0.00"
                                inputValue={amount}
                                label="Amount to Withdraw"
                                onMaxClick={handleWithdrawAll}
                                onQuickActionClick={handleQuickAmountSelection}
                                onValueChange={setAmount}
                                quickActions={QUICK_ACTIONS.filter(
                                    (percentage) => percentage !== 100
                                )}
                                showMaxShortcut
                                testId="lend-withdraw-input"
                                tokenIconClassName={token.tokenIconClassName}
                                tokenLabel={token.tokenTicker}
                                validateError={hasAvailableBalanceError}
                            />
                        </div>

                        <div className="lend-withdraw-summary-column">
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !isAmountValid,
                                    label: "Next",
                                    unit: token.depositedTicker,
                                    value: hasSelectedAmount
                                        ? formatAmount(nextDepositValue)
                                        : token.availableToWithdrawAmount,
                                }}
                                before={{
                                    label: "Current",
                                    unit: token.depositedTicker,
                                    value: token.availableToWithdrawAmount,
                                }}
                                title="Your Deposit + Earnings"
                                useBorder
                            />
                        </div>
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasAvailableBalanceError
                            ? "Amount exceeds available balance"
                            : hasSelectedAmount
                              ? "Ready to withdraw"
                              : "No withdraw amount selected"
                    }
                >
                    {hasAvailableBalanceError ? (
                        "The amount exceeds what you can currently withdraw."
                    ) : hasSelectedAmount ? (
                        <div className="lend-withdraw-notice-lines">
                            <div>
                                {`You are about to withdraw ${amount} ${token.tokenTicker}.`}
                            </div>
                            <div>
                                {`Remaining deposit: ${formatAmount(nextDepositValue)} ${token.depositedTicker}.`}
                            </div>
                        </div>
                    ) : (
                        "Enter amount to withdraw or select Withdraw All"
                    )}
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button secondary"
                        onClick={handleWithdrawAll}
                        type="button"
                    >
                        Withdraw All
                    </button>
                    <button
                        className="button"
                        disabled={!hasSelectedAmount || hasValidationError}
                        type="button"
                    >
                        {hasSelectedAmount ? "Withdraw" : "Enter an amount"}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
