import "../Exchange/Styles.scss";
import "./Styles.scss";

import { Button } from "antd";
import React, { useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { bigIntToInputValue, TokenSettings } from "../../helpers/currencies";
import { typeOperation } from "../../helpers/exchange";
import {
    estimateExchangeOutputV1,
    tokenBalanceV1,
    tokenExchangeV1,
    tokenReceiveV1,
} from "../../helpers/exchangeV1";
import { toBigIntPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import CurrencyPopUp from "../CurrencyPopUp";
import InputAmount from "../InputAmount";
import type { ExchangeModeV1 } from "../Modals/ExchangeOptionsModalV1";
import ExchangeOptionsModalV1 from "../Modals/ExchangeOptionsModalV1";
import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

// v1's exchange surface has the same "you exchange" / "you receive" token-pair
// structure as components/Exchange, but over a fixed, symmetric pair set (no
// caIndex/swap-pairs/execution-fee) — see helpers/exchangeV1.ts.
export default function ExchangeV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1, userBalanceV1, userBaseCoinBalance } =
        useWalletContext();

    const [currencyYouExchange, setCurrencyYouExchange] =
        useState<string>("CA_0");
    const [currencyYouReceive, setCurrencyYouReceive] =
        useState<string>("TC_0");
    const [amountYouExchange, setAmountYouExchange] = useState<string>("");
    const [modalMode, setModalMode] = useState<ExchangeModeV1 | null>(null);
    const [modalAmount, setModalAmount] = useState<bigint>(0n);
    const [operationModalInfo, setOperationModalInfo] =
        useState<OperationModalInfo>({ operationStatus: "", txHash: "" });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);

    const status = contractProtocolStatusV1.data;
    const balances = userBalanceV1.data;
    const rbtcBalance = userBaseCoinBalance.balance ?? 0n;

    const operationType = typeOperation(
        currencyYouExchange,
        currencyYouReceive
    );
    const isMint = operationType === "MINT";

    const onChangeCurrencyYouExchange = (value: string): void => {
        setCurrencyYouExchange(value);
        setCurrencyYouReceive(tokenReceiveV1(value)[0]);
        setAmountYouExchange("");
    };

    const onChangeCurrencyYouReceive = (value: string): void => {
        setCurrencyYouReceive(value);
    };

    const handleSwapCurrencies = (): void => {
        const newExchange = currencyYouReceive;
        const newReceive = currencyYouExchange;
        setCurrencyYouExchange(newExchange);
        setCurrencyYouReceive(newReceive);
        setAmountYouExchange("");
    };

    const amountBigInt =
        amountYouExchange === "" ? 0n : toBigIntPrecision(amountYouExchange);

    const sourceBalance = tokenBalanceV1(
        currencyYouExchange,
        balances,
        rbtcBalance
    );

    const estimatedReceive = status
        ? estimateExchangeOutputV1(
              currencyYouExchange,
              currencyYouReceive,
              amountBigInt,
              status
          )
        : 0n;

    const receiveUpToBalance = status
        ? estimateExchangeOutputV1(
              currencyYouExchange,
              currencyYouReceive,
              sourceBalance,
              status
          )
        : 0n;

    const paused = status?.paused ?? false;
    const overFreeDocLimit =
        !isMint && currencyYouExchange === "TP_0" && status
            ? amountBigInt > status.freeDoc
            : false;

    let errorText = "";
    if (paused) {
        errorText = t("exchange.v1.systemPaused");
    } else if (amountYouExchange !== "" && amountBigInt > sourceBalance) {
        errorText = t("exchange.errors.notBalance");
    } else if (overFreeDocLimit) {
        errorText = t("exchange.v1.limitReachedDoc");
    }

    const hasError =
        errorText !== "" || amountBigInt <= 0n || !status || !balances;

    const setAddTotalAvailable = (): void => {
        setAmountYouExchange(
            bigIntToInputValue(sourceBalance, currencyYouExchange, 8)
        );
    };

    const onSubmitButton = (): void => {
        if (hasError) return;

        let mode: ExchangeModeV1;
        if (isMint) {
            mode = currencyYouReceive === "TC_0" ? "mintBPro" : "mintDoc";
        } else {
            mode = currencyYouExchange === "TC_0" ? "redeemBPro" : "redeemDoc";
        }
        setModalAmount(amountBigInt);
        setModalMode(mode);
    };

    const onModalConfirm = (operationStatus: string, txHash: string): void => {
        setOperationModalInfo({ operationStatus, txHash });
        setIsOperationModalVisible(true);
        setAmountYouExchange("");
    };

    const buttonLabelKey = isMint
        ? "exchange.v1.buttonMint"
        : "exchange.v1.buttonRedeem";

    return (
        <div>
            <div className="sectionExchange__Content">
                <div>
                    <div className="tokenSelector" data-testid="exchange-v1-input-from">
                        <CurrencyPopUp
                            value={currencyYouExchange}
                            data-testid="exchange-v1-input-from-popup"
                            currencyOptions={tokenExchangeV1()}
                            onChange={onChangeCurrencyYouExchange}
                            action={"exchange"}
                        />
                        <InputAmount
                            testId="exchange-v1-amount-exchange"
                            inputValue={amountYouExchange}
                            placeholder={"0.0"}
                            onValueChange={setAmountYouExchange}
                            validateError={errorText !== ""}
                            balance={PrecisionNumbers({
                                amount: sourceBalance,
                                token: TokenSettings(currencyYouExchange),
                                decimals: 8,
                                i18n: i18n,
                                compact: true,
                            })}
                            setAddTotalAvailable={setAddTotalAvailable}
                            action={
                                isMint
                                    ? t("exchange.labelSendingMint")
                                    : t("exchange.labelSending")
                            }
                            balanceText={t("exchange.labelBalance")}
                        />
                        <div className="amountInput__feedback amountInput__feedback--error">
                            {errorText}
                        </div>
                    </div>
                </div>

                <div className="buttonSwap" onClick={handleSwapCurrencies}>
                    <div className="icon-swap"></div>
                </div>

                <div>
                    <div className="tokenSelector" data-testid="exchange-v1-input-to">
                        <CurrencyPopUp
                            value={currencyYouReceive}
                            data-testid="exchange-v1-input-to-popup"
                            currencyOptions={tokenReceiveV1(
                                currencyYouExchange
                            )}
                            onChange={onChangeCurrencyYouReceive}
                            action={"exchange"}
                        />
                        <InputAmount
                            testId="exchange-v1-amount-receive"
                            inputValue={bigIntToInputValue(
                                estimatedReceive,
                                currencyYouReceive,
                                8
                            )}
                            placeholder={"0.0"}
                            onValueChange={() => {
                                /* displayOnly: no reverse-direction entry */
                            }}
                            validateError={false}
                            displayOnly
                            balance={PrecisionNumbers({
                                amount: receiveUpToBalance,
                                token: TokenSettings(currencyYouReceive),
                                decimals: 8,
                                i18n: i18n,
                                compact: true,
                            })}
                            setAddTotalAvailable={() => {
                                /* displayOnly: no-op */
                            }}
                            action={
                                isMint
                                    ? t("exchange.labelReceiving")
                                    : t("exchange.labelReceivingRedeem")
                            }
                            balanceText={t("exchange.labelUpTo")}
                        />
                    </div>
                </div>
            </div>

            {isMint && (
                <div className="exchangeV1__disclaimer">
                    {t("exchange.v1.estimatedMaxRbtc")}
                </div>
            )}

            <div className="cta-container">
                <div className="cta-options-group">
                    <Button
                        data-testid="exchange-v1-submit"
                        type="primary"
                        className="button"
                        onClick={onSubmitButton}
                        disabled={hasError}
                    >
                        {t(buttonLabelKey)}
                    </Button>
                </div>
            </div>

            <ExchangeOptionsModalV1
                mode={modalMode}
                visible={modalMode !== null}
                onClose={() => setModalMode(null)}
                amount={modalAmount}
                onConfirm={onModalConfirm}
            />
            {isOperationModalVisible && (
                <OperationStatusModal
                    visible={isOperationModalVisible}
                    onCancel={() => setIsOperationModalVisible(false)}
                    operationStatus={operationModalInfo.operationStatus}
                    txHash={operationModalInfo.txHash}
                />
            )}
        </div>
    );
}
