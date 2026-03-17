import { Input } from "antd";
import React, { useCallback, useEffect, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import {
    ConvertAmount,
    TokenBalance,
    TokenSettings,
} from "../../helpers/currencies";
import { tokenExchange } from "../../helpers/exchange";
import {
    fromWei,
    toBigIntPrecision,
} from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import CurrencyPopUp from "../CurrencyPopUp";
import InputAmount from "../InputAmount";

import ModalConfirmSend from "../Modals/ConfirmSend";
import { PrecisionNumbers } from "../PrecisionNumbers";


export default function Send(): JSX.Element {
    const { t, i18n } = useProjectTranslation();

    const { contractProtocolStatus, userBalance, userBaseCoinBalance } =
        useWalletContext();

    const tokenSend: string[] = tokenExchange();
    // Add Token Govern
    tokenSend.push("TG");
    // Add Coinbase support at index 0
    tokenSend.splice(0, 0, "COINBASE");

    const defaultTokenSend: string = tokenSend[0];
    const [currencyYouSend, setCurrencyYouSend] =
        useState<string>(defaultTokenSend);

    const [amountYouSend, setAmountYouSend] = useState<string>("");
    const [destinationAddress, setDestinationAddress] = useState<string>("");
    const [caIndex, setCAIndex] = useState<number>(0);

    const [inputValidationErrorText, setInputValidationErrorText] =
        useState<string>("");
    const [
        inputValidationAddressErrorText,
        setInputValidationAddressErrorText,
    ] = useState<string>("");
    const [inputValidationError, setInputValidationError] =
        useState<boolean>(false);

    const onChangeCurrencyYouSend = (newCurrencyYouExchange: string): void => {
        
        onClear();        

        let caIndex: number = 0;
        const aCurrencyYouSend: string[] = newCurrencyYouExchange.split("_");
        switch (aCurrencyYouSend[0]) {
            case "CA":
                caIndex = parseInt(aCurrencyYouSend[1]);
                break;
            case "TC":
                caIndex = parseInt(aCurrencyYouSend[1]);
                break;
            case "TP":
                caIndex = 0;
                break;
        }

        setCAIndex(caIndex);
        setCurrencyYouSend(newCurrencyYouExchange);
    };

    const onClear = (): void => {
        setAmountYouSend("");
    };

    const onValidate = useCallback((): void => {
        let amountInputError: boolean = false;
        let addressInputError: boolean = false;

        // 1. User Send Token Validation
        const totalBalance: bigint = TokenBalance(
            userBalance,
            currencyYouSend,
            userBaseCoinBalance?.balance
                ? { balance: userBaseCoinBalance.balance }
                : undefined
        );
        const amountYouSendBig: bigint = toBigIntPrecision(amountYouSend);

        if (amountYouSendBig > totalBalance) {
            setInputValidationErrorText(t("send.infoNoBalance"));
            amountInputError = true;
        }
        if (amountYouSendBig === 0n) {
            amountInputError = true;
        }
        if (amountYouSendBig < 0n) {
            setInputValidationErrorText(t("send.infoNoNegativeValues"));
            amountInputError = true;
        }
        if (amountYouSendBig === null) {
            setInputValidationErrorText(t("send.infoNoNegativeValues"));
            amountInputError = true;
        }
        // 2. Input address valid
        if (destinationAddress === "") {
            addressInputError = true;
        } else if (
            destinationAddress.length < 42 ||
            destinationAddress.length > 42
        ) {
            setInputValidationAddressErrorText(t("send.infoAddressInvalid"));
            addressInputError = true;
        }

        if (!amountInputError) {
            setInputValidationErrorText("");
        }

        if (!addressInputError) {
            setInputValidationAddressErrorText("");
        }

        if (amountInputError || addressInputError) {
            setInputValidationError(true);
        } else {
            setInputValidationError(false);
        }
    }, [
        amountYouSend,
        currencyYouSend,
        destinationAddress,
        userBalance,
        userBaseCoinBalance,
        t,
    ]);

    useEffect(() => {
        setAmountYouSend(amountYouSend);
    }, [amountYouSend]);

    useEffect(() => {
        if (amountYouSend) {
            onValidate();
        }
    }, [amountYouSend, onValidate]);

    useEffect(() => {
        if (destinationAddress) {
            onValidate();
        }
    }, [destinationAddress, onValidate]);

    const onChangeAmountYouSend = (
        newAmount: string | number,
        isPriceOnly: boolean = false
    ): void => {
        if (!isPriceOnly) {
            setAmountYouSend(newAmount.toString());
        }

        let caIndex: number = 0;
        const aCurrencyYouSend: string[] = currencyYouSend.split("_");
        switch (aCurrencyYouSend[0]) {
            case "CA":
                caIndex = parseInt(aCurrencyYouSend[1]);
                break;
            case "TC":
                caIndex = parseInt(aCurrencyYouSend[1]);
                break;
            case "TP":
                caIndex = 0;
                break;
        }

        setCAIndex(caIndex);
    };

    const onChangeDestinationAddress = (
        event: React.ChangeEvent<HTMLInputElement>
    ): void => {
        if (event.target.value.length < 42) {
            setInputValidationAddressErrorText(t("send.infoAddressInvalid"));
            setInputValidationError(true);
        }
        setDestinationAddress(event.target.value);
    };

    const setAddTotalAvailable = (): void => {        
        const totalYouSendWei: bigint = TokenBalance(
            userBalance,
            currencyYouSend,
            userBaseCoinBalance?.balance
                ? { balance: userBaseCoinBalance.balance }
                : undefined
        );
        const totalYouSend = fromWei(
            totalYouSendWei,
            TokenSettings(currencyYouSend).decimals
        );
        setAmountYouSend(totalYouSend.toString());

        onChangeAmountYouSend(totalYouSend, true);
    };

    const sendingUSD = ConvertAmount(
        contractProtocolStatus,
        currencyYouSend,
        "USD",
        toBigIntPrecision(amountYouSend),
        caIndex
    );

    return (
        <div>
            <div className="sectionSend__Content">
                <div className="inputFields">
                    <div className="tokenSelector">
                        <CurrencyPopUp
                            value={currencyYouSend}
                            currencyOptions={tokenSend}
                            onChange={onChangeCurrencyYouSend}
                            action={"send"}
                        />
                        <InputAmount
                            inputValue={amountYouSend.toString()}
                            placeholder={"0.0"}
                            onValueChange={onChangeAmountYouSend}
                            validateError={false}
                            balance={PrecisionNumbers({
                                amount: TokenBalance(
                                    userBalance,
                                    currencyYouSend,
                                    userBaseCoinBalance?.balance
                                        ? {
                                              balance:
                                                  userBaseCoinBalance.balance,
                                          }
                                        : undefined
                                ),
                                token: TokenSettings(currencyYouSend),
                                decimals:
                                    TokenSettings(currencyYouSend)
                                        .visibleDecimals,
                                i18n: i18n,
                            })}
                            setAddTotalAvailable={setAddTotalAvailable}
                            action={t("send.labelSending")}
                            balanceText={t("send.labelBalance")}
                        />
                        <div className="amountInput__feedback amountInput__feedback--error">
                            {inputValidationErrorText}
                        </div>
                    </div>
                    <div className="tx-direction">
                        <div className="icon-arrow-down"></div>
                    </div>
                    <div className="tokenSelector">
                        <div className="amountInput">
                            <div className="amountInput__infoBar">
                                <div className="captionOLD amountInput__label">
                                    {t("send.labelDestination")}
                                </div>
                            </div>
                            <Input
                                type="text"
                                placeholder={t("send.placeholder")}
                                className="input-addressOLD amountInput__value "
                                onChange={onChangeDestinationAddress}
                            />
                        </div>
                        <div className="amountInput__feedback amountInput__feedback--error">
                            {inputValidationAddressErrorText}
                        </div>
                    </div>
                </div>
            </div>
            <div className="cta-container">
                <div className="cta-info-group">
                    <div className="cta-info-summary">
                        <span className={"token_exchange"}>
                            {t("send.sendingSummary")}
                        </span>
                        <span className={"symbol"}>
                            {t("send.sendingSign")}
                        </span>
                        {sendingUSD.toString() !== "NaN" ? (
                            <span className={"token_receive_label"}>
                                {PrecisionNumbers({
                                    amount: sendingUSD,
                                    token: TokenSettings("CA_0"),
                                    decimals: 2,
                                    i18n: i18n,
                                })}
                            </span>
                        ) : (
                            <span>0</span>
                        )}
                        <span className={"token_receive_name"}>
                            {" "}
                            {t("send.sendingCurrency")}
                        </span>
                    </div>
                </div>

                <div className="cta-options-group">
                    <ModalConfirmSend
                        currencyYouExchange={currencyYouSend}
                        exchangingUSD={sendingUSD}
                        amountYouExchange={amountYouSend}
                        destinationAddress={destinationAddress}
                        onClear={onClear}
                        inputValidationError={inputValidationError}
                        caIndex={caIndex}
                    />
                </div>
            </div>
        </div>
    );
}
