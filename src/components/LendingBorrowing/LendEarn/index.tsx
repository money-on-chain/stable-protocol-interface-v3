import "./Styles.scss";

import React from "react";

import BeforeAfterCard from "../BeforeAfterCard";
import type { LendCardData } from "../Lend/data";

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
    const hasSelectedAmount = isAmountValid && amountValue > 0;
    const hasTypedAmount = amount.trim().length > 0;

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
                <button
                    className="lend-earn-back-link"
                    onClick={onBack}
                    type="button"
                >
                    <span className="lend-earn-back-link__icon">←</span>
                    <span>Back to Lending & Borrowing</span>
                </button>
            </div>

            <div className="lend-earn-body">
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
                    <div className="lend-earn-input-card">
                        <div className="lend-earn-input-card__top">
                            <div className="lend-earn-input-card__label">
                                Amount to Lend
                            </div>
                            <div className="lend-earn-input-card__quick-actions">
                                {QUICK_ACTIONS.map((percentage) => (
                                    <button
                                        className="lend-earn-input-card__quick-action"
                                        key={percentage}
                                        onClick={() =>
                                            handleQuickAmountSelection(
                                                percentage
                                            )
                                        }
                                        type="button"
                                    >
                                        {percentage === 100
                                            ? "MAX"
                                            : `${percentage}%`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="lend-earn-input-card__body">
                            <div className="lend-earn-input-card__amount-wrapper">
                                <input
                                    className="lend-earn-input-card__amount-input"
                                    inputMode="decimal"
                                    onChange={(event) =>
                                        setAmount(event.target.value)
                                    }
                                    placeholder="0.00"
                                    value={amount}
                                />
                                <div className="lend-earn-input-card__amount-usd">
                                    ~= 0.00 USD
                                </div>
                            </div>

                            <div className="lend-earn-input-card__token-panel">
                                <div className="token">
                                    <div
                                        className={token.tokenIconClassName}
                                    ></div>
                                    <div className="token-name">
                                        {token.tokenTicker}
                                    </div>
                                </div>
                                <div className="lend-earn-input-card__balance">
                                    Balance: {token.walletBalance}
                                </div>
                            </div>
                        </div>
                    </div>

                    <BeforeAfterCard
                        after={{
                            isInvalid: hasTypedAmount && !isAmountValid,
                            label: "Next",
                            unit: token.depositedTicker,
                            value: hasSelectedAmount ? amount : "0.00",
                        }}
                        before={{
                            label: "Current",
                            unit: token.depositedTicker,
                            value: token.depositedAmount,
                        }}
                        title="Your Deposit + Earnings"
                    />
                </div>

                <div className="lend-earn-notice">
                    <div className="lend-earn-notice__title">
                        {hasSelectedAmount
                            ? "Review lend amount"
                            : "No lend amount selected"}
                    </div>
                    <div className="lend-earn-notice__subtitle">
                        {hasSelectedAmount
                            ? `You are about to lend ${amount} ${token.tokenTicker}.`
                            : "Enter an amount to lend."}
                    </div>
                </div>

                <div className="lend-earn-actions">
                    <button
                        className="button--compact lend-earn-actions__submit"
                        disabled={!hasSelectedAmount}
                        type="button"
                    >
                        {hasSelectedAmount ? "Lend" : "Enter an amount"}
                    </button>
                </div>
            </div>
        </div>
    );
}
