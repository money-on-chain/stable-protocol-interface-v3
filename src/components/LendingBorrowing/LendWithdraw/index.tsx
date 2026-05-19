import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount, TokenSettings } from "../../../helpers/currencies";
import { toBigIntPrecision } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import TokenAmountInput from "../../TokenAmountInput";
import { type LendCardData } from "../Lend/data";
import { formatAmount as formatAmountUtil } from "../Borrow/operationUtils";
import BeforeAfterCard from "../MiniComponents/BeforeAfterCard";
import CompactMetricDisplay from "../MiniComponents/CompactMetricDisplay";
import OperationActions from "../MiniComponents/OperationActions";
import OperationBackLink from "../MiniComponents/OperationBackLink";
import OperationNotice from "../MiniComponents/OperationNotice";
import RateDisplay from "../MiniComponents/RateDisplay";

interface LendWithdrawProps {
    onConfirm: (token: LendCardData, amount: string, onSuccess?: () => void) => void;
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

export default function LendWithdraw({
    onConfirm,
    onBack,
    token,
}: LendWithdrawProps): React.ReactElement {
    const [amount, setAmount] = React.useState("");
    const { contractProtocolStatus } = useWalletContext();
    const { t, i18n } = useProjectTranslation();

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

        setAmount(formatAmountUtil(nextAmount, token.tokenDecimals));
    };

    const handleWithdrawAll = () => {
        setAmount(formatAmountUtil(availableValue.value, token.tokenDecimals));
    };

    return (
        <div className="layout-card lend-withdraw-view">
            <div className="layout-card-title lend-withdraw-title">
                <h1>{t("lending.sectionWithdraw.cardTitle")}</h1>
                <OperationBackLink onClick={onBack} />
            </div>

            <div className="lend-withdraw-body">
                <div className="lend-withdraw-main">
                    <div className="lend-withdraw-header">
                        <div className="lend-withdraw-header__spacer"></div>
                        <RateDisplay
                            number={token.supplyApy}
                            title={`${token.tokenTicker}  ${t(
                                "lending.sectionWithdraw.apy"
                            )}`}
                        />
                    </div>

                    <div className="lend-withdraw-content">
                        <div className="lend-withdraw-inputs">
                            <CompactMetricDisplay
                                label={t("lending.sectionWithdraw.available")}
                                value={token.availableToWithdrawAmount}
                                valueLabel={token.tokenTicker}
                            />

                            <TokenAmountInput
                                feedbackMessage={
                                    hasAvailableBalanceError
                                        ? t(
                                              "lending.sectionWithdraw.exceedsWithdrawBalance"
                                          )
                                        : undefined
                                }
                                feedbackState="negative"
                                getFiatEquivalent={getFiatEquivalent}
                                inputValue={amount}
                                label={t(
                                    "lending.sectionWithdraw.labelAmountToWithdraw"
                                )}
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
                                    label: t("beforeAfterCard.after"),
                                    unit: token.depositedTicker,
                                    value: hasSelectedAmount
                                        ? formatAmountUtil(nextDepositValue, token.tokenDecimals)
                                        : token.availableToWithdrawAmount,
                                }}
                                before={{
                                    label: t("beforeAfterCard.before"),
                                    unit: token.depositedTicker,
                                    value: token.availableToWithdrawAmount,
                                }}
                                title={t("lending.labelDeposits")}
                                useBorder
                            />
                        </div>
                    </div>
                </div>

                <OperationNotice
                    title={
                        hasAvailableBalanceError
                            ? t(
                                  "lending.sectionWithdraw.summary.titleBalanceError"
                              )
                            : hasSelectedAmount
                              ? t(
                                    "lending.sectionWithdraw.summary.titleAmountOK"
                                )
                              : t(
                                    "lending.sectionWithdraw.summary.titleNoAmount"
                                )
                    }
                >
                    {hasAvailableBalanceError ? (
                        t("lending.sectionWithdraw.summary.txtExceedsBalance")
                    ) : hasSelectedAmount ? (
                        <div className="lend-withdraw-notice-lines">
                            <div>
                                {`${t("lending.sectionWithdraw.summary.txtAboutToWithdraw")}: ${amount} ${token.tokenTicker}.`}
                            </div>
                            <div>
                                {`${t("lending.sectionWithdraw.summary.txtRemaining")}: ${formatAmountUtil(nextDepositValue, token.tokenDecimals)} ${token.depositedTicker}.`}
                            </div>
                        </div>
                    ) : (
                        t("lending.sectionWithdraw.summary.txtEnterAmount")
                    )}
                </OperationNotice>

                <OperationActions>
                    <button
                        className="button secondary"
                        onClick={handleWithdrawAll}
                        type="button"
                    >
                        {t("lending.sectionWithdraw.cta.withdrawAll")}
                    </button>
                    <button
                        className="button"
                        disabled={!hasSelectedAmount || hasValidationError}
                        onClick={() => onConfirm(token, amount, () => setAmount(""))}
                        type="button"
                    >
                        {hasSelectedAmount
                            ? t("lending.sectionWithdraw.cta.ok")
                            : t("lending.sectionWithdraw.cta.noAmount")}
                    </button>
                </OperationActions>
            </div>
        </div>
    );
}
