import "./Styles.scss";

import React from "react";

import TokenAmountInput from "../../TokenAmountInput";
import { type LendCardData } from "../Lend/data";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import OperationActions from "../MiniComponents/OperationActions";
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";

interface LendEarnProps {
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

export default function LendEarn({
    onBack,
    token,
}: LendEarnProps): React.ReactElement {
    const [amount, setAmount] = React.useState("");

    const { isValid: isAmountValid, value: amountValue } = parseAmount(amount);
    const walletBalanceValue = parseAmount(token.walletBalance);
    const hasTypedAmount = amount.trim().length > 0;
    const hasBalanceError =
        isAmountValid && amountValue > walletBalanceValue.value;
    const hasValidationError = !isAmountValid || hasBalanceError;
    const hasSelectedAmount =
        isAmountValid && !hasBalanceError && amountValue > 0;

    const handleQuickAmountSelection = (percentage: number) => {
        const nextAmount =
            percentage === 100
                ? walletBalanceValue.value
                : walletBalanceValue.value * (percentage / 100);

        setAmount(
            nextAmount.toLocaleString("en-US", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
            })
        );
    };

    return (
        <div className="layout-card lend-earn-view">
            <div className="layout-card-title lend-earn-title">
                <h1>Lend</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="lend-earn-body">
                <div className="lend-earn-main">
                    <div className="lend-earn-header">
                        <div className="lend-earn-header__spacer"></div>
                        <div className="lend-earn-rate">
                            <div className="lend-earn-rate__value">
                                {token.supplyApy} %
                            </div>
                            <div className="lend-earn-rate__label">
                                {token.tokenTicker}/DOC Variable APY
                            </div>
                        </div>
                    </div>

                    <div className="lend-earn-content">
                        <TokenAmountInput
                            balanceLabel="Balance"
                            balanceValue={token.walletBalance}
                            feedbackMessage={
                                hasBalanceError
                                    ? "Not enough balance in your wallet"
                                    : undefined
                            }
                            feedbackState="negative"
                            fiatValue="0.00"
                            inputValue={amount}
                            label="Amount to Lend"
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
                                    label: "Next",
                                    unit: token.depositedTicker,
                                    value: hasSelectedAmount ? amount : "0.00",
                                }}
                                // before={{
                                //     label: "Current",
                                //     unit: selectedToken.depositedTicker,
                                //     value: selectedToken.depositedAmount,
                                // }}
                                title="Your Deposit + Earnings"
                                useBorder
                            />
                        </div>
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasBalanceError
                            ? "Not enough balance"
                            : hasSelectedAmount
                            ? "Review lend amount"
                            : "No lend amount selected"
                    }
                >
                    {hasBalanceError
                        ? "The amount exceeds your wallet balance."
                        : hasSelectedAmount
                        ? `You are about to lend ${amount} ${token.tokenTicker}.`
                        : "Enter an amount to lend."}
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button"
                        disabled={!hasSelectedAmount || hasValidationError}
                        type="button"
                    >
                        {hasSelectedAmount ? "Lend" : "Enter an amount"}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
