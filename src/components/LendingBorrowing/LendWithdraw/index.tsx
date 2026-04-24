import "./Styles.scss";

import React from "react";

import TokenAmountInput from "../../TokenAmountInput";
import { type LendCardData } from "../Lend/data";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";

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

    const availableValue = parseAmount(token.availableToWithdrawAmount);
    const { isValid: isAmountValid, value: amountValue } = parseAmount(amount);
    const hasSelectedAmount = isAmountValid && amountValue > 0;
    const hasTypedAmount = amount.trim().length > 0;
    const cappedWithdrawValue = Math.min(amountValue, availableValue.value);
    const nextDepositValue = Math.max(
        availableValue.value - cappedWithdrawValue,
        0
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
                        <div className="lend-withdraw-rate">
                            <div className="lend-withdraw-rate__value">
                                {token.supplyApy} %
                            </div>
                            <div className="lend-withdraw-rate__label">
                                {token.tokenTicker}/DOC Variable APY
                            </div>
                        </div>
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
                            />
                        </div>
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasSelectedAmount
                            ? "Ready to withdraw"
                            : "No withdraw amount selected"
                    }
                >
                    {hasSelectedAmount ? (
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
                        disabled={!hasSelectedAmount}
                        type="button"
                    >
                        {hasSelectedAmount ? "Withdraw" : "Enter an amount"}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
