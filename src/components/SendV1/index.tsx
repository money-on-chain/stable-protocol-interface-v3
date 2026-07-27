import "../InputAmount/Styles.scss";

import { Input } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { checksumAddress } from "viem";

import { ALLOWED_CHAIN } from "../../constants/chain";
import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import {
    tokenBalanceV1,
    tokenSendV1,
    tokenUsdPriceV1,
} from "../../helpers/exchangeV1";
import {
    fromWei,
    mulPrecision,
    toBigIntPrecision,
} from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import ModalConfirmSendV1 from "../Modals/ConfirmSendV1";
import { PrecisionNumbers } from "../PrecisionNumbers";
import TokenAmountInput from "../TokenAmountInput";

// v1's Send surface, mirroring components/Send's UX (token picker + amount +
// destination address, USD summary, confirm modal), but over v1's fixed
// 4-token set (RBTC/BPro/DOC/MOC — see tokenSendV1) instead of the v3 dynamic
// caIndex-based token list. No allowance step: all 4 are plain
// transfer()/native-send, never requiring approval.
export default function SendV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1, userBalanceV1, userBaseCoinBalance } =
        useWalletContext();

    const status = contractProtocolStatusV1.data;
    const balances = userBalanceV1.data;
    const rbtcBalance = userBaseCoinBalance.balance ?? 0n;

    const tokenSend = tokenSendV1();
    const [currencyYouSend, setCurrencyYouSend] = useState<string>(
        tokenSend[0]
    );
    const [amountYouSend, setAmountYouSend] = useState<string>("");
    const [destinationAddress, setDestinationAddress] = useState<string>("");

    const [inputValidationErrorText, setInputValidationErrorText] =
        useState<string>("");
    const [
        inputValidationAddressErrorText,
        setInputValidationAddressErrorText,
    ] = useState<string>("");
    const [inputValidationError, setInputValidationError] =
        useState<boolean>(true);

    const sendBalance = tokenBalanceV1(currencyYouSend, balances, rbtcBalance);

    const onClear = (): void => {
        setAmountYouSend("");
        setDestinationAddress("");
        setInputValidationErrorText("");
        setInputValidationAddressErrorText("");
        setInputValidationError(true);
    };

    const onChangeCurrencyYouSend = (value: string): void => {
        onClear();
        setCurrencyYouSend(value);
    };

    const onValidate = useCallback((): void => {
        let amountInputError = false;
        let addressInputError = false;

        const amountYouSendBig = toBigIntPrecision(amountYouSend);

        if (!amountYouSend || amountYouSendBig === 0n) {
            amountInputError = true;
        } else if (amountYouSendBig > sendBalance) {
            setInputValidationErrorText(t("send.infoNoBalance"));
            amountInputError = true;
        }

        let addressChecksumWarning = false;
        if (!destinationAddress) {
            addressInputError = true;
        } else if (!/^0x[0-9a-fA-F]{40}$/.test(destinationAddress)) {
            setInputValidationAddressErrorText(t("send.infoAddressInvalid"));
            addressInputError = true;
        } else {
            const hex = destinationAddress.slice(2);
            const hasMixedCase = /[A-F]/.test(hex) && /[a-f]/.test(hex);
            if (hasMixedCase) {
                const addr = destinationAddress as `0x${string}`;
                if (
                    destinationAddress !==
                    checksumAddress(addr, ALLOWED_CHAIN.id)
                ) {
                    addressChecksumWarning = true;
                }
            }
        }

        if (!amountInputError) {
            setInputValidationErrorText("");
        }

        if (addressChecksumWarning) {
            setInputValidationAddressErrorText(
                t("send.infoAddressChecksumInvalid")
            );
        } else if (!addressInputError) {
            setInputValidationAddressErrorText("");
        }

        setInputValidationError(amountInputError || addressInputError);
    }, [amountYouSend, destinationAddress, sendBalance, t]);

    useEffect(() => {
        onValidate();
    }, [amountYouSend, destinationAddress, onValidate]);

    const onChangeAmountYouSend = (
        newAmount: string | number,
        isPriceOnly: boolean = false
    ): void => {
        if (!isPriceOnly) {
            setAmountYouSend(newAmount.toString());
        }
    };

    const onChangeDestinationAddress = (
        event: React.ChangeEvent<HTMLInputElement>
    ): void => {
        setDestinationAddress(event.target.value);
    };

    const setAddTotalAvailable = (): void => {
        const totalYouSend = fromWei(
            sendBalance,
            TokenSettings(currencyYouSend).decimals
        );
        setAmountYouSend(totalYouSend.toString());
    };

    const sendingUSD: bigint =
        status && amountYouSend !== ""
            ? mulPrecision(
                  toBigIntPrecision(amountYouSend),
                  tokenUsdPriceV1(currencyYouSend, status)
              )
            : 0n;

    return (
        <div>
            <div className="sectionSend__Content sectionSend__Content--v1">
                <div className="inputFields">
                    <div
                        className="tokenSelector"
                        data-testid="send-v1-input-token"
                    >
                        <TokenAmountInput
                            testId="send-v1-input-amount"
                            inputValue={amountYouSend}
                            placeholder={"0.0"}
                            onValueChange={onChangeAmountYouSend}
                            validateError={inputValidationErrorText !== ""}
                            feedbackMessage={
                                inputValidationErrorText || undefined
                            }
                            feedbackState="negative"
                            preserveSpaceWhenNoFeedback
                            balanceValue={PrecisionNumbers({
                                amount: sendBalance,
                                token: TokenSettings(currencyYouSend),
                                decimals:
                                    TokenSettings(currencyYouSend)
                                        .visibleDecimals,
                                i18n: i18n,
                                compact: true,
                            })}
                            onMaxClick={setAddTotalAvailable}
                            label={t("send.labelSending")}
                            balanceLabel={t("send.labelBalance")}
                            action="send"
                            currencyOptions={tokenSend}
                            tokenSelectable
                            selectedTokenValue={currencyYouSend}
                            onTokenSelect={onChangeCurrencyYouSend}
                        />
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
                                data-testid="send-v1-input-destination"
                                type="text"
                                placeholder={t("send.placeholder")}
                                className="input-addressOLD amountInput__value "
                                value={destinationAddress}
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
                        <span className={"token_receive_label"}>
                            {PrecisionNumbers({
                                amount: sendingUSD,
                                token: TokenSettings("CA_0"),
                                decimals: 2,
                                i18n: i18n,
                                compact: true,
                            })}
                        </span>
                        <span className={"token_receive_name"}>
                            {" "}
                            {t("send.sendingCurrency")}
                        </span>
                    </div>
                </div>

                <div className="cta-options-group">
                    <ModalConfirmSendV1
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
