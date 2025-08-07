import { Input } from "antd";
import React, { useContext, useState, useEffect } from "react";

import { useProjectTranslation } from "../../helpers/translations";
import CurrencyPopUp from "../CurrencyPopUp";
import {
    TokenSettings,
    TokenBalance,
    ConvertAmount, getCAIndex
} from '../../helpers/currencies';
import { tokenExchange } from "../../helpers/exchange";
import { PrecisionNumbers } from "../PrecisionNumbers";
import InputAmount from "../InputAmount";
import ModalConfirmSend from "../Modals/ConfirmSend";
import { useWalletContext } from "../../context/Wallet";
import { normalizeToBigInt, mulPrecision, toBigIntPrecision, fromWei } from "../../helpers/precision";


export default function Send(): JSX.Element {
    const { t, i18n } = useProjectTranslation();
    
    const { contractProtocolStatus, userBalance, userBaseCoinBalance } = useWalletContext()

    const tokenSend: string[] = tokenExchange();
    // Add Token Govern
    tokenSend.push("TG");
    // Add Coinbase support at index 0
    tokenSend.splice(0, 0, "COINBASE");

    const defaultTokenSend: string = tokenSend[0];
    const [currencyYouSend, setCurrencyYouSend] = useState<string>(defaultTokenSend);

    const [amountYouSend, setAmountYouSend] = useState<string>("");
    const [destinationAddress, setDestinationAddress] = useState<string>("");

    const [sendingUSD, setSendingUSD] = useState<bigint>(0n);

    //const [isDirtyYouSend, setIsDirtyYouSend] = useState(false);

    const [inputValidationErrorText, setInputValidationErrorText] =
        useState<string>("");
    const [
        inputValidationAddressErrorText,
        setInputValidationAddressErrorText,
    ] = useState<string>("");
    const [inputValidationError, setInputValidationError] = useState<boolean>(false);

    useEffect(() => {
        setAmountYouSend(amountYouSend);
    }, [amountYouSend]);

    useEffect(() => {
        if (amountYouSend) {
            onValidate();
        }
    }, [amountYouSend]);

    useEffect(() => {
        if (destinationAddress) {
            onValidate();
        }
    }, [destinationAddress]);

    const onChangeCurrencyYouSend = (newCurrencyYouExchange: string): void => {
        onClear();
        setCurrencyYouSend(newCurrencyYouExchange);
    };

    const onClear = (): void => {
        //setIsDirtyYouSend(false);
        setAmountYouSend("");
    };

    const onValidate = (): void => {
        let amountInputError: boolean = false;
        let addressInputError: boolean = false;

        // 1. User Send Token Validation
        const totalBalance: bigint = TokenBalance(userBalance, currencyYouSend, userBaseCoinBalance);
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
    };

    const onChangeAmountYouSend = (newAmount: string | number, isPriceOnly: boolean = false): void => {
        
        const newAmountBig: bigint = toBigIntPrecision(newAmount);
                
        if (!isPriceOnly) {
            //setIsDirtyYouSend(true);
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
                
        const convertAmount: bigint = ConvertAmount(
            contractProtocolStatus,
            currencyYouSend,
            `CA_${caIndex}`,
            newAmountBig
        );
        
        const priceCA: bigint = normalizeToBigInt(contractProtocolStatus.data[caIndex].PP_CA[0]);

        let convertAmountUSD: bigint;
        if (currencyYouSend === "COINBASE") {
            convertAmountUSD = convertAmount;
        } else {
            convertAmountUSD = mulPrecision(convertAmount, priceCA);
        }

        setSendingUSD(convertAmountUSD);
    };

    const onChangeDestinationAddress = (event: React.ChangeEvent<HTMLInputElement>): void => {
        if (event.target.value.length < 42) {
            setInputValidationAddressErrorText(t("send.infoAddressInvalid"));
            setInputValidationError(true);
        }
        setDestinationAddress(event.target.value);
    };

    const setAddTotalAvailable = (): void => {
        //setIsDirtyYouSend(false);

        const totalYouSendWei: bigint = TokenBalance(userBalance, currencyYouSend, userBaseCoinBalance);
        const totalYouSend = fromWei(totalYouSendWei, TokenSettings(currencyYouSend).decimals);
        setAmountYouSend(totalYouSend.toString());

        onChangeAmountYouSend(
            totalYouSend,
            true
        );
    };

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
                                amount: TokenBalance(userBalance, currencyYouSend, userBaseCoinBalance),
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
                                    i18n: i18n                                    
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
                    />
                </div>
            </div>
        </div>
    );
}
