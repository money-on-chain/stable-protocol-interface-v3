import type { RadioChangeEvent, Alert } from "antd";
import { Radio, Space } from "antd";
import React, { useCallback, useEffect, useState } from "react";

import { getExecutionFee } from "../../backend/utils";
import { useWalletContext } from "../../context/Wallet";
import { CheckStatusGlobal } from "../../helpers/checkStatus";
import {
    bigIntToInputValue,
    CalcCommission,
    ConvertAmount,
    ConvertBalance,
    getCAIndex,
    TokenBalance,
    TokenSettings,
} from "../../helpers/currencies";
import {
    executionFeeMap,
    isMintOperation,
    tokenExchange,
    tokenReceive,
} from "../../helpers/exchange";
import {
    divPrecision,
    mulPrecision,
    normalizeToBigInt,
    toBigIntPrecision,
} from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import type { Settings } from "../../types/hooks";
import CurrencyPopUp from "../CurrencyPopUp";
import InputAmount from "../InputAmount/";
import ModalConfirmOperation from "../Modals/ConfirmOperation";
import { PrecisionNumbers } from "../PrecisionNumbers";
import settings from "../../settings/settings.json";
const { slippage } = settings as Settings;

// Type definitions
interface CommissionInfo {
    fee: bigint;
    feeUSD: bigint;
    percent: bigint;
    totalFeeToken: bigint;
    totalFeeTokenUSD: bigint;
    feeTokenPercent: bigint;
}

export default function Exchange(): JSX.Element {
    const { t, i18n, ns } = useProjectTranslation();
    const space: string = "\u00A0";

    const { contractProtocolStatus, userBalance, publicClient } =
        useWalletContext();

    const defaultTokenExchange = tokenExchange()[0];
    const defaultTokenReceive = tokenReceive(defaultTokenExchange)[0];

    const [currencyYouExchange, setCurrencyYouExchange] =
        useState<string>(defaultTokenExchange);
    const [currencyYouReceive, setCurrencyYouReceive] =
        useState<string>(defaultTokenReceive);

    const [amountYouExchange, setAmountYouExchange] = useState<bigint>(0n);
    const [amountYouReceive, setAmountYouReceive] = useState<bigint>(0n);

    const [slippageTolerance, setSlippageTolerance] = useState<number>(slippage.autoDefault);

    //const [isDirtyYouExchange, setIsDirtyYouExchange] = useState(false);
    //const [isDirtyYouReceive, setIsDirtyYouReceive] = useState(false);

    const [commission, setCommission] = useState<bigint>(0n);
    const [commissionUSD, setCommissionUSD] = useState<bigint>(0n);
    const [commissionPercent, setCommissionPercent] = useState<bigint>(0n);

    const [commissionFeeToken, setCommissionFeeToken] = useState<bigint>(0n);
    const [commissionFeeTokenUSD, setCommissionFeeTokenUSD] =
        useState<bigint>(0n);
    const [commissionPercentFeeToken, setCommissionPercentFeeToken] =
        useState<bigint>(0n);

    const [executionFee, setExecutionFee] = useState<bigint>(0n);
    const [executionFeeUSD, setExecutionFeeUSD] = useState<bigint>(0n);

    const [exchangingUSD, setExchangingUSD] = useState<bigint>(0n);

    const [inputValidationErrorText, setInputValidationErrorText] =
        useState<string>("");
    const [inputValidationError, setInputValidationError] =
        useState<boolean>(false);

    const IS_MINT = isMintOperation(currencyYouExchange, currencyYouReceive);

    const [radioSelectFee, setRadioSelectFee] = useState<number>(0);
    const [radioSelectFeeTokenDisabled, setRadioSelectFeeTokenDisabled] =
        useState<boolean>(true);

    const [valueExchange, setValueExchange] = useState<string>("");
    const [valueReceive, setValueReceive] = useState<string>("");
    const [caIndex, setCAIndex] = useState<number>(0);

    const { checkerStatus } = CheckStatusGlobal();

    const onChangeCurrencyYouExchange = (
        newCurrencyYouExchange: string
    ): void => {
        onClear();
        setCurrencyYouExchange(newCurrencyYouExchange);
        const newCurrencyYouReceive = tokenReceive(newCurrencyYouExchange)[0];
        setCurrencyYouReceive(newCurrencyYouReceive);
        setCAIndex(getCAIndex(newCurrencyYouExchange, newCurrencyYouReceive));
    };

    const onChangeCurrencyYouReceive = (
        newCurrencyYouReceive: string
    ): void => {
        onClear();
        setCurrencyYouReceive(newCurrencyYouReceive);
        setCAIndex(getCAIndex(currencyYouExchange, newCurrencyYouReceive));
    };

    const handleSwapCurrencies = (): void => {
        const tempCurrency = currencyYouExchange;
        setCurrencyYouExchange(currencyYouReceive);
        setCurrencyYouReceive(tempCurrency);

        const tempAmount = amountYouExchange;
        setAmountYouExchange(amountYouReceive);
        setAmountYouReceive(tempAmount);

        const tempInputExchange = valueExchange;
        setValueExchange(valueReceive);
        setValueReceive(tempInputExchange);
    };

    const onClear = (): void => {
        setAmountYouExchange(0n);
        setAmountYouReceive(0n);
        setValueExchange("");
        setValueReceive("");
        setInputValidationError(false);
        setInputValidationErrorText("");
    };

    const onValidate = useCallback((): void => {
        // Protocol in not-good status
        const { statusCode } = checkerStatus();

        const arrCurrencyYouExchange = currencyYouExchange.split("_");
        const arrCurrencyYouReceive = currencyYouReceive.split("_");

        if (statusCode[caIndex] >= 2) {
            setInputValidationErrorText(t("exchange.errors.notOperational"));
            setInputValidationError(true);
            return;
        }

        // 0. Not Wallet connected
        if (!userBalance.data) {
            setInputValidationErrorText(t("exchange.errors.connectYourWallet"));
            setInputValidationError(true);
            return;
        }

        // 0. Amount > 0
        if (amountYouExchange <= 0n || amountYouReceive <= 0n) {
            setInputValidationError(true);
            if (valueExchange !== "" || valueReceive !== "") {
                setInputValidationErrorText(t("exchange.errors.amountTooLow"));
                setInputValidationError(true);
                return;
            }
            return;
        }
        if (
            amountYouExchange.toString() === "NaN" ||
            amountYouReceive.toString() === "NaN"
        ) {
            setInputValidationErrorText(t("exchange.errors.amountInvalid"));
            setInputValidationError(true);
            return;
        }

        if (
            valueExchange.toString().length > 20 ||
            valueReceive.toString().length > 20
        ) {
            setInputValidationErrorText(t("exchange.errors.amountInvalid"));
            setInputValidationError(true);
            return;
        }

        // 1. User Exchange Token Validation
        const totalBalance = TokenBalance(userBalance, currencyYouExchange);

        if (amountYouExchange > totalBalance) {
            setInputValidationErrorText(t("exchange.errors.notBalance"));
            setInputValidationError(true);
            return;
        }

        let tIndex: number | undefined;
        // 2. MINT TP. User receive available token in contract
        if (arrCurrencyYouReceive[0] === "TP") {
            if (!contractProtocolStatus.data) return;
            // There are sufficient PEGGED in the contracts to mint?
            tIndex = TokenSettings(currencyYouReceive).key;
            if (tIndex !== undefined) {
                const tpAvailableToMint =
                    contractProtocolStatus.data[caIndex]
                        .getRealTPAvailableToMint[tIndex];
                if (amountYouReceive > tpAvailableToMint) {
                    setInputValidationErrorText(
                        t("exchange.errors.noLiquidity")
                    );
                    setInputValidationError(true);
                    return;
                }
            }
        }

        // 3. REDEEM TC
        if (arrCurrencyYouExchange[0] === "TC") {
            if (!contractProtocolStatus.data) return;
            // There are sufficient TC in the contracts to redeem?
            const tcAvailableToRedeem =
                contractProtocolStatus.data[caIndex].getRealTCAvailableToRedeem;
            if (amountYouExchange > tcAvailableToRedeem) {
                setInputValidationErrorText(t("exchange.errors.noLiquidity"));
                setInputValidationError(true);
                return;
            }
        }

        // 4. REDEEM SUFFICIENT CA IN THE CONTRACT?
        if (arrCurrencyYouReceive[0] === "CA") {
            tIndex = TokenSettings(currencyYouReceive).key;
            if (tIndex !== undefined) {
                if (!contractProtocolStatus.data) return;
                // There are sufficient CA in the contract
                const caBalance =
                    contractProtocolStatus.data[tIndex].getACBalance;
                if (amountYouReceive > caBalance) {
                    setInputValidationErrorText(
                        t("exchange.errors.noLiquidity")
                    );
                    setInputValidationError(true);
                    return;
                }
            }
        }

        // 5. HAVE TO PAY COMMISSIONS WITH FEE TOKEN?
        const feeTokenBalance = userBalance.data[caIndex].FeeToken.balance;

        if (feeTokenBalance && feeTokenBalance > commissionFeeToken) {
            // Set as default to pay fee with token
            setRadioSelectFeeTokenDisabled(false);
        } else {
            setRadioSelectFeeTokenDisabled(true);
        }

        // 6. MINT TP. Flux capacitor maxQACToMintTP
        if (arrCurrencyYouReceive[0] === "TP") {
            tIndex = TokenSettings(currencyYouReceive).key;
            if (tIndex !== undefined) {
                if (!contractProtocolStatus.data) return;
                const maxQACToMintTPArray =
                    contractProtocolStatus.data[caIndex].maxQACToMintTP;
                const maxQACToMintTP = Array.isArray(maxQACToMintTPArray)
                    ? (maxQACToMintTPArray[tIndex] as bigint | undefined)
                    : undefined;
                if (
                    maxQACToMintTP !== undefined &&
                    typeof maxQACToMintTP === "bigint" &&
                    amountYouExchange > maxQACToMintTP
                ) {
                    setInputValidationErrorText(
                        t("exchange.errors.maxLimitedByProtocol")
                    );
                    setInputValidationError(true);
                    return;
                }
            }
        }

        // Redeem TP
        //arrCurrencyYouExchange = currencyYouExchange.split("_");
        if (arrCurrencyYouExchange[0] === "TP") {
            // 7. Flux Capacitor
            tIndex = TokenSettings(currencyYouReceive).key;
            if (tIndex !== undefined) {
                if (!contractProtocolStatus.data) return;
                const maxQACToRedeemTPArray =
                    contractProtocolStatus.data[caIndex].maxQACToRedeemTP;
                const maxQACToRedeemTP = Array.isArray(maxQACToRedeemTPArray)
                    ? (maxQACToRedeemTPArray[tIndex] as bigint | undefined)
                    : undefined;
                console.warn(
                    "maxQACToRedeemTP: ",
                    typeof maxQACToRedeemTP === "bigint"
                        ? maxQACToRedeemTP.toString()
                        : "undefined"
                );
                console.warn("amountYouReceive: ", amountYouReceive.toString());
                if (
                    maxQACToRedeemTP !== undefined &&
                    typeof maxQACToRedeemTP === "bigint" &&
                    amountYouReceive > maxQACToRedeemTP
                ) {
                    setInputValidationErrorText(
                        t("exchange.errors.maxLimitedByProtocol")
                    );
                    setInputValidationError(true);
                    return;
                }
            }

            // 8 Available TP to redeem
            tIndex = TokenSettings(currencyYouExchange).key;
            if (tIndex !== undefined) {
                if (!contractProtocolStatus.data) return;
                const pegContainerArray =
                    contractProtocolStatus.data[caIndex].pegContainer;
                const maxAvailableTP = Array.isArray(pegContainerArray)
                    ? pegContainerArray[tIndex]
                    : undefined;
                if (
                    maxAvailableTP !== undefined &&
                    typeof maxAvailableTP === "bigint" &&
                    amountYouExchange > maxAvailableTP
                ) {
                    setInputValidationErrorText(
                        t("exchange.errors.insufficientTPinCA")
                    );
                    setInputValidationError(true);
                    return;
                }
            }
        }

        // No Validations Errors
        setInputValidationErrorText("");
        setInputValidationError(false);
    }, [
        amountYouExchange,
        amountYouReceive,
        caIndex,
        checkerStatus,
        commissionFeeToken,
        contractProtocolStatus,
        currencyYouExchange,
        currencyYouReceive,
        t,
        userBalance,
        valueExchange,
        valueReceive,
    ]);

    useEffect(() => {
        if (
            amountYouExchange &&
            contractProtocolStatus.data &&
            userBalance.data
        ) {
            onValidate();
        }
    }, [
        amountYouExchange,
        contractProtocolStatus.data,
        userBalance.data,
        onValidate,
    ]);

    const onChangeAmounts = async (
        amountExchange: bigint,
        amountReceive: bigint,
        source: string
    ): Promise<void> => {
        if (!publicClient) return;
        if (!contractProtocolStatus.data) return;
        let infoFee: CommissionInfo;
        let amountExchangeFee: bigint;
        let amountReceiveFee: bigint;
        let amountFormattedReceive: string;
        let amountFormattedExchange: string;
        switch (source) {
            case "exchange":
                infoFee = CalcCommission(
                    contractProtocolStatus,
                    currencyYouExchange,
                    currencyYouReceive,
                    amountReceive
                );
                amountExchangeFee = amountExchange;
                amountReceiveFee = amountReceive - infoFee.fee;
                amountFormattedReceive = bigIntToInputValue(
                    amountReceiveFee,
                    currencyYouReceive,
                    amountReceiveFee < 10n ** 17n ? 12 : 8
                );
                setValueReceive(
                    amountReceiveFee === 0n ? "" : amountFormattedReceive
                );
                setAmountYouReceive(amountReceiveFee);
                setAmountYouExchange(amountExchangeFee);
                break;
            case "receive":
                infoFee = CalcCommission(
                    contractProtocolStatus,
                    currencyYouExchange,
                    currencyYouReceive,
                    amountExchange
                );
                amountExchangeFee = amountExchange + infoFee.fee;
                amountReceiveFee = amountReceive;
                amountFormattedExchange = bigIntToInputValue(
                    amountExchangeFee,
                    currencyYouExchange,
                    amountExchangeFee < 10n ** 17n ? 12 : 8
                );
                setAmountYouExchange(amountExchangeFee);
                setValueExchange(
                    amountExchangeFee === 0n ? "" : amountFormattedExchange
                );
                setAmountYouReceive(amountReceiveFee);
                break;
            default:
                throw new Error("Invalid source name");
        }

        // Set exchanging total in USD
        let convertAmountUSD: bigint;
        if (IS_MINT) {
            infoFee = CalcCommission(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                amountExchange
            );
            convertAmountUSD = amountExchangeFee;
        } else {
            infoFee = CalcCommission(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                amountReceive
            );
            convertAmountUSD = amountReceiveFee;
        }

        // Commission
        setCommission(infoFee.fee);
        setCommissionUSD(infoFee.feeUSD);
        setCommissionPercent(infoFee.percent);

        // Fee Token Commission
        setCommissionFeeToken(infoFee.totalFeeToken);
        setCommissionFeeTokenUSD(infoFee.totalFeeTokenUSD);
        setCommissionPercentFeeToken(infoFee.feeTokenPercent);

        const priceCA = normalizeToBigInt(
            contractProtocolStatus.data[caIndex].PP_CA[0]
        );
        if (priceCA) {
            convertAmountUSD = mulPrecision(convertAmountUSD, priceCA);
            setExchangingUSD(convertAmountUSD);
        }

        const execCost = executionFeeMap(
            currencyYouExchange,
            currencyYouReceive,
            contractProtocolStatus
        );

        const execFee = await getExecutionFee(publicClient, execCost, 2);

        const priceCoinbase = normalizeToBigInt(
            contractProtocolStatus.data.PP_COINBASE[0]
        );
        if (priceCoinbase) {
            const execFeeUSD = mulPrecision(execFee, priceCoinbase);
            setExecutionFeeUSD(execFeeUSD);
        }

        // Execution fee load
        setExecutionFee(execFee);
    };

    const onChangeAmountYouExchange = (newAmount: string | number): void => {
        const newAmountBigInt = toBigIntPrecision(newAmount);
        if (newAmountBigInt < 0n) {
            setAmountYouExchange(0n);
            setAmountYouReceive(0n);
            setExchangingUSD(0n);
            setValueExchange("");
        } else {
            setValueExchange(newAmount.toString());
            const convertAmountReceive = ConvertAmount(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                newAmountBigInt
            );
            console.warn("convertAmountReceive", convertAmountReceive);
            void onChangeAmounts(
                newAmountBigInt,
                convertAmountReceive,
                "exchange"
            );
        }
    };

    const onChangeAmountYouReceive = (newAmount: string | number): void => {
        const newAmountBigInt = toBigIntPrecision(newAmount);
        if (newAmountBigInt < 0n) {
            setAmountYouExchange(0n);
            setAmountYouReceive(0n);
            setExchangingUSD(0n);
            setValueReceive("");
        } else {
            setValueReceive(newAmount.toString());
            const convertAmountExchange = ConvertAmount(
                contractProtocolStatus,
                currencyYouReceive,
                currencyYouExchange,
                newAmountBigInt
            );
            void onChangeAmounts(
                convertAmountExchange,
                newAmountBigInt,
                "receive"
            );
        }
    };

    const setAddTotalAvailable = (): void => {
        const totalbalance = TokenBalance(userBalance, currencyYouExchange);
        const convertAmountReceive = ConvertAmount(
            contractProtocolStatus,
            currencyYouExchange,
            currencyYouReceive,
            totalbalance
        );
        setValueExchange(totalbalance.toString());
        setAmountYouExchange(totalbalance);
        void onChangeAmounts(totalbalance, convertAmountReceive, "exchange");
    };

    const onChangeFee = (e: RadioChangeEvent): void => {
        console.warn("radio checked", e.target.value);
        setRadioSelectFee(Number(e.target.value));
    };

    const calculateFinalAmountExchange = (): bigint => {
        const arrCurrencyYouExchange = currencyYouExchange.split("_");
        if (arrCurrencyYouExchange[0] === "CA") {
            const totalbalance = TokenBalance(userBalance, currencyYouExchange);
            const tolerance = 7n / 10n;
            if (amountYouExchange > totalbalance) {
                const upperLimit =
                    divPrecision(mulPrecision(totalbalance, tolerance), 100n) +
                    amountYouExchange;
                return totalbalance - (upperLimit - totalbalance);
            } else {
                return amountYouExchange;
            }
        } else {
            return amountYouExchange;
        }
    };

    const onChangeSlippageTolerance = (value: number): void => {
        console.warn("slippage tolerance", value);
        setSlippageTolerance(value);
    };

    return (
        <div>
            <div className="sectionExchange__Content">
                <div className="inputFields">
                    <div className="tokenSelector">
                        <CurrencyPopUp
                            value={currencyYouExchange}
                            currencyOptions={tokenExchange()}
                            onChange={onChangeCurrencyYouExchange}
                            action={"exchange"}
                        />

                        <InputAmount
                            inputValue={valueExchange}
                            placeholder={"0.0"}
                            onValueChange={onChangeAmountYouExchange}
                            validateError={false}
                            balance={
                                !userBalance
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: TokenBalance(
                                              userBalance,
                                              currencyYouExchange
                                          ),
                                          token: TokenSettings(
                                              currencyYouExchange
                                          ),
                                          decimals: 8,
                                          i18n: i18n,
                                      })
                            }
                            setAddTotalAvailable={setAddTotalAvailable}
                            action={t("exchange.labelSending")}
                            balanceText={t("exchange.labelBalance")}
                        />
                        <div className="amountInput__feedback amountInput__feedback--error">
                            {inputValidationErrorText}
                        </div>
                    </div>

                    <div className="buttonSwap" onClick={handleSwapCurrencies}>
                        <div className="icon-swap"></div>
                    </div>

                    <div className="tokenSelector">
                        <CurrencyPopUp
                            value={currencyYouReceive}
                            currencyOptions={tokenReceive(currencyYouExchange)}
                            onChange={onChangeCurrencyYouReceive}
                            action={"exchange"}
                        />

                        <InputAmount
                            inputValue={valueReceive}
                            placeholder={"0.0"}
                            onValueChange={onChangeAmountYouReceive}
                            validateError={false}
                            balance={
                                !userBalance
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: ConvertBalance(
                                              contractProtocolStatus,
                                              userBalance,
                                              currencyYouExchange,
                                              currencyYouReceive
                                          ),
                                          token: TokenSettings(
                                              currencyYouReceive
                                          ),
                                          decimals: 8,
                                          i18n: i18n,
                                      })
                            }
                            setAddTotalAvailable={setAddTotalAvailable}
                            action={t("exchange.labelReceiving")}
                            balanceText={t("exchange.labelUpTo")}
                        />
                    </div>
                </div>
                <div className="info">
                    <div className="tx-amount-container">
                        <div className="tx-fees-container">
                            <div className="tx-fees-data">
                                <div className="tx-fees-item">
                                    <span className={""}>
                                        {" "}
                                        1{" "}
                                        {t(
                                            `exchange.tokens.${currencyYouExchange}.abbr`,
                                            {
                                                ns: ns,
                                            }
                                        )}
                                    </span>
                                    <span className={"symbol"}> ≈ </span>
                                    <span className={"token_receive"}>
                                        {" "}
                                        {!contractProtocolStatus.data
                                            ? "--"
                                            : PrecisionNumbers({
                                                  amount: ConvertAmount(
                                                      contractProtocolStatus,
                                                      currencyYouExchange,
                                                      currencyYouReceive,
                                                      1000000000000000000n
                                                  ),
                                                  decimals:
                                                      TokenSettings(
                                                          currencyYouReceive
                                                      ).visibleDecimals || 2,
                                                  token: TokenSettings(
                                                      currencyYouReceive
                                                  ),
                                                  i18n: i18n,
                                              })}
                                    </span>
                                    <span className={"token_receive_name"}>
                                        {" "}
                                        {t(
                                            `exchange.tokens.${currencyYouReceive}.abbr`,
                                            {
                                                ns: ns,
                                            }
                                        )}
                                    </span>
                                </div>
                                <div className="tx-fees-item">
                                    <span className={"token_exchange"}>
                                        1{" "}
                                        {t(
                                            `exchange.tokens.${currencyYouReceive}.abbr`,
                                            {
                                                ns: ns,
                                            }
                                        )}
                                    </span>
                                    <span className={"symbol"}> ≈ </span>
                                    <span className={"token_receive"}>
                                        {!contractProtocolStatus.data
                                            ? "--"
                                            : PrecisionNumbers({
                                                  amount: ConvertAmount(
                                                      contractProtocolStatus,
                                                      currencyYouReceive,
                                                      currencyYouExchange,
                                                      1000000000000000000n
                                                  ),
                                                  decimals:
                                                      TokenSettings(
                                                          currencyYouExchange
                                                      ).visibleDecimals || 2,
                                                  token: TokenSettings(
                                                      currencyYouExchange
                                                  ),
                                                  i18n: i18n,
                                              })}
                                    </span>
                                    <span className={"token_receive_name"}>
                                        {" "}
                                        {t(
                                            `exchange.tokens.${currencyYouExchange}.abbr`,
                                            {
                                                ns: ns,
                                            }
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="tx-fee-options">
                                <div className={"radioButton"}>
                                    <Radio.Group
                                        onChange={onChangeFee}
                                        value={radioSelectFee}
                                    >
                                        <Space direction="vertical">
                                            <Radio value={0}>
                                                <span
                                                    className={"token_exchange"}
                                                >
                                                    {t("fees.labelFee")} (
                                                    {PrecisionNumbers({
                                                        amount: commissionPercent,
                                                        token: TokenSettings(
                                                            currencyYouExchange
                                                        ),
                                                        decimals: 2,
                                                        i18n: i18n,
                                                    })}
                                                    %)
                                                </span>
                                                <span className={""}> ≈ </span>
                                                <span className={""}>
                                                    {PrecisionNumbers({
                                                        amount: commission,
                                                        token: TokenSettings(
                                                            `CA_${caIndex}`
                                                        ),
                                                        i18n: i18n,
                                                    })}
                                                </span>
                                                <span className={""}>
                                                    {" "}
                                                    {IS_MINT
                                                        ? t(
                                                              `exchange.tokens.${currencyYouExchange}.abbr`,
                                                              { ns: ns }
                                                          )
                                                        : t(
                                                              `exchange.tokens.${currencyYouReceive}.abbr`,
                                                              { ns: ns }
                                                          )}
                                                </span>
                                                <span className={""}> (</span>
                                                <span>
                                                    {PrecisionNumbers({
                                                        amount: commissionUSD,
                                                        decimals: 2,
                                                        token: TokenSettings(
                                                            `CA_${caIndex}`
                                                        ),
                                                        i18n: i18n,
                                                        isUSD: true,
                                                    })}
                                                </span>
                                                <span className={""}>
                                                    {" "}
                                                    {t(
                                                        "exchange.exchangingCurrency"
                                                    )}
                                                </span>
                                                <span className={""}>) </span>
                                            </Radio>
                                            <Radio
                                                value={1}
                                                disabled={
                                                    radioSelectFeeTokenDisabled
                                                }
                                            >
                                                <span className={""}>
                                                    {t("fees.labelFee")} (
                                                    {PrecisionNumbers({
                                                        amount: commissionPercentFeeToken,
                                                        token: TokenSettings(
                                                            currencyYouExchange
                                                        ),
                                                        decimals: 2,
                                                        i18n: i18n,
                                                    })}
                                                    %)
                                                </span>
                                                <span className={""}> ≈ </span>
                                                <span className={""}>
                                                    {PrecisionNumbers({
                                                        amount: commissionFeeToken,
                                                        token: TokenSettings(
                                                            `TF_${caIndex}`
                                                        ),
                                                        i18n: i18n,
                                                    })}
                                                </span>
                                                <span className={""}>
                                                    {" "}
                                                    {t(
                                                        `exchange.tokens.TF.abbr`,
                                                        { ns: ns }
                                                    )}
                                                </span>
                                                <span className={""}> (</span>
                                                <span>
                                                    {PrecisionNumbers({
                                                        amount: commissionFeeTokenUSD,
                                                        decimals: 2,
                                                        token: TokenSettings(
                                                            `CA_${caIndex}`
                                                        ),
                                                        i18n: i18n,
                                                        isUSD: true,
                                                    })}
                                                </span>
                                                <span className={""}>
                                                    {" "}
                                                    {t(
                                                        "exchange.exchangingCurrency"
                                                    )}
                                                </span>
                                                <span className={""}>) </span>
                                            </Radio>
                                        </Space>
                                    </Radio.Group>
                                </div>
                            </div>
                            <div className="tx-fees-info">
                                {t("fees.disclaimer1")} <br />
                                {t("fees.disclaimer2")}
                            </div>
                            <div className="tx-slippage-container">
                                {/* <div className="divider-horizontal"></div> */}
                                <div className="tx-slippage-label">
                                    Slippage tolerance: {space}
                                    <div className="tx-slippage-value">
                                        {slippageTolerance} %
                                    </div>
                                </div>
                                <div className="tx-slippage-text">
                                    Slippage tolerance can be adjusted during
                                    the next confirmation step
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="cta-container">
                <div className="cta-info-group">
                    <div className="cta-info-summary">
                        {t("exchange.exchangingSummary")}

                        <div className={""}> ≈ </div>
                        {exchangingUSD.toString() !== "NaN" ? (
                            <div className={""}>
                                {!exchangingUSD
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: exchangingUSD,
                                          token: TokenSettings(`CA_${caIndex}`),
                                          decimals: 2,
                                          i18n: i18n,
                                          isUSD: true,
                                      })}
                            </div>
                        ) : (
                            <div>0</div>
                        )}
                        <span className={""}>
                            {t("exchange.exchangingCurrency")}
                        </span>
                    </div>
                </div>
                <div className="cta-options-group">
                    <ModalConfirmOperation
                        currencyYouExchange={currencyYouExchange}
                        currencyYouReceive={currencyYouReceive}
                        exchangingUSD={exchangingUSD}
                        commission={commission}
                        commissionUSD={commissionUSD}
                        commissionPercent={commissionPercent}
                        inputAmountYouExchange={calculateFinalAmountExchange()}
                        amountYouReceive={amountYouReceive}
                        inputValidationError={inputValidationError}
                        executionFee={executionFee}
                        executionFeeUSD={executionFeeUSD}
                        commissionFeeToken={commissionFeeToken}
                        commissionFeeTokenUSD={commissionFeeTokenUSD}
                        commissionPercentFeeToken={commissionPercentFeeToken}
                        radioSelectFee={radioSelectFee}
                        caIndex={caIndex}
                        slippageTolerance={slippageTolerance}
                        onChangeSlippageTolerance={onChangeSlippageTolerance}
                        //amountYouExchangeFee={amountYouExchangeFee}
                        //amountYouReceiveFee={amountYouReceiveFee}
                    />
                </div>
            </div>
        </div>
    );
}
