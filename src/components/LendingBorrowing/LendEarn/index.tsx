import "./Styles.scss";

import React from "react";

import TokenAmountInput from "../../TokenAmountInput";
import { LEND_CARDS, type LendCardData } from "../Lend/data";
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
    const [selectedTokenId, setSelectedTokenId] = React.useState(token.id);
    const selectedToken =
        LEND_CARDS.find((card) => card.id === selectedTokenId) || token;

    const { isValid: isAmountValid, value: amountValue } = parseAmount(amount);
    const walletBalanceValue = parseAmount(selectedToken.walletBalance);
    const hasSelectedAmount = isAmountValid && amountValue > 0;
    const hasTypedAmount = amount.trim().length > 0;

    React.useEffect(() => {
        setSelectedTokenId(token.id);
    }, [token.id]);

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
                                {selectedToken.supplyApy} %
                            </div>
                            <div className="lend-earn-rate__label">
                                {selectedToken.tokenTicker}/DOC Variable APY
                            </div>
                        </div>
                    </div>

                    <div className="lend-earn-content">
                        <TokenAmountInput
                            balanceLabel="Balance"
                            balanceValue={selectedToken.walletBalance}
                            fiatValue="0.00"
                            inputValue={amount}
                            label="Amount to Lend"
                            onMaxClick={() => handleQuickAmountSelection(100)}
                            onQuickActionClick={handleQuickAmountSelection}
                            onTokenSelect={setSelectedTokenId}
                            onValueChange={setAmount}
                            quickActions={QUICK_ACTIONS.filter(
                                (percentage) => percentage !== 100
                            )}
                            selectedTokenValue={selectedToken.id}
                            showMaxShortcut
                            testId="lend-earn-input"
                            tokenIconClassName={selectedToken.tokenIconClassName}
                            tokenLabel={selectedToken.tokenTicker}
                            tokenOptions={LEND_CARDS.map((card) => ({
                                iconClassName: card.tokenIconClassName,
                                label: card.tokenTicker,
                                value: card.id,
                            }))}
                            tokenSelectable
                        />

                        <div className="lend-earn-summary-column">
                            <BeforeAfterCard
                                after={{
                                    isInvalid: hasTypedAmount && !isAmountValid,
                                    label: "Next",
                                    unit: selectedToken.depositedTicker,
                                    value: hasSelectedAmount ? amount : "0.00",
                                }}
                                // before={{
                                //     label: "Current",
                                //     unit: selectedToken.depositedTicker,
                                //     value: selectedToken.depositedAmount,
                                // }}
                                title="Your Deposit + Earnings"
                            />
                        </div>
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasSelectedAmount
                            ? "Review lend amount"
                            : "No lend amount selected"
                    }
                >
                    {hasSelectedAmount
                        ? `You are about to lend ${amount} ${selectedToken.tokenTicker}.`
                        : "Enter an amount to lend."}
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button"
                        disabled={!hasSelectedAmount}
                        type="button"
                    >
                        {hasSelectedAmount ? "Lend" : "Enter an amount"}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
