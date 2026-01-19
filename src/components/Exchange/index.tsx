import type { RadioChangeEvent } from "antd";
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
    typeOperation,
} from "../../helpers/exchange";
import {
    divPrecision,
    mulPrecision,
    normalizeToBigInt,
    toBigIntPrecision,
} from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import type { Settings } from "../../types/hooks";
import type { CommissionItem, CommissionsState } from "../../types/status";
import CurrencyPopUp from "../CurrencyPopUp";
import InputAmount from "../InputAmount/";
import ModalConfirmOperation from "../Modals/ConfirmOperation";
import { PrecisionNumbers } from "../PrecisionNumbers";
import CommissionsSelector from "../CommissionsSelector";
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

    const [slippageTolerance, setSlippageTolerance] = useState<number>(
        slippage.autoDefault
    );
    
    const [commissionsByKey, setCommissionsByKey] = useState<CommissionsState>({});

    const [executionFee, setExecutionFee] = useState<bigint>(0n);
    const [executionFeeUSD, setExecutionFeeUSD] = useState<bigint>(0n);

    const [exchangingUSD, setExchangingUSD] = useState<bigint>(0n);

    const [inputValidationErrorText, setInputValidationErrorText] =
        useState<string>("");
    const [inputValidationError, setInputValidationError] =
        useState<boolean>(false);

    const operationType: string = typeOperation(currencyYouExchange, currencyYouReceive);

    const [radioSelectFee, setRadioSelectFee] = useState<number>(1);
    const [radioSelectFeeTokenDisabled, setRadioSelectFeeTokenDisabled] =
        useState<boolean>(true);

    const [valueExchange, setValueExchange] = useState<string>("");
    const [valueReceive, setValueReceive] = useState<string>("");
    const [caIndex, setCAIndex] = useState<number>(0);

    const { checkerStatus } = CheckStatusGlobal();

    const setCommissionForKey = (
        key: string,
        partial: Partial<CommissionItem>
      ) => {
        setCommissionsByKey(prev => ({
          ...prev,
          [key]: {
            ...(prev[key] ?? {
              commission: 0n,
              commissionUSD: 0n,
              commissionPercent: 0n,
            }),
            ...partial,
          },
        }));
      };

    const onChangeCurrencyYouExchange = (
        newCurrencyYouExchange: string
    ): void => {
        onClear();
        setCurrencyYouExchange(newCurrencyYouExchange);
        const newCurrencyYouReceive = tokenReceive(newCurrencyYouExchange)[0];
        setCurrencyYouReceive(newCurrencyYouReceive);
        const caI = getCAIndex(newCurrencyYouExchange, newCurrencyYouReceive);
        if (caI >= 0) {
            setCAIndex(caI);
        } else {
            setCAIndex(0);
        }
    };

    const onChangeCurrencyYouReceive = (
        newCurrencyYouReceive: string
    ): void => {
        onClear();
        setCurrencyYouReceive(newCurrencyYouReceive);
        const caI = getCAIndex(currencyYouExchange, newCurrencyYouReceive);
        if (caI >= 0) {
            setCAIndex(caI);
        } else {
            setCAIndex(0);
        }
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
        if (arrCurrencyYouExchange[0] === "CA" && arrCurrencyYouReceive[0] === "TP") {
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

        if (feeTokenBalance && feeTokenBalance > commissionsByKey["FeeToken"].commission) {
            // Set as default to pay fee with token
            setRadioSelectFeeTokenDisabled(false);
        } else {
            setRadioSelectFeeTokenDisabled(true);
        }

        // 6. MINT TP. Flux capacitor maxQACToMintTP
        if (arrCurrencyYouExchange[0] === "CA" && arrCurrencyYouReceive[0] === "TP") {
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
        if (arrCurrencyYouExchange[0] === "TP" && arrCurrencyYouReceive[0] === "CA") {
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
        commissionsByKey,
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
                    amountReceive,
                    caIndex
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
                    amountExchange,
                    caIndex
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

        type CommissionWithIndex = {
            caIndex: number;
            info: CommissionInfo;
        };
        
        // Set exchanging total in USD and choosen CA index
        let convertAmountUSD: bigint = 0n;
        let choosenCAIndex: number = caIndex;
        const infoFeeArray: CommissionWithIndex[] = [];
        
        if (operationType === "MINT") {
            const infoFee = CalcCommission(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                amountExchange,
                caIndex
            );
        
            infoFeeArray.push({ caIndex, info: infoFee });
            convertAmountUSD = amountExchangeFee;
        
        } else if (operationType === "REDEEM") {
            const infoFee = CalcCommission(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                amountReceive,
                caIndex
            );
        
            infoFeeArray.push({ caIndex, info: infoFee });
            convertAmountUSD = amountReceiveFee;
        
        } else if (operationType === "SWAP_TPFORTP") {
            for (let i = 0; i < settings.tokens.CA.length; i++) {
                const amountInCA: bigint = ConvertAmount(
                    contractProtocolStatus,
                    currencyYouExchange,
                    `CA_${i}`,
                    amountExchange,
                    i
                );
        
                const infoFee = CalcCommission(
                    contractProtocolStatus,
                    currencyYouExchange,
                    currencyYouReceive,
                    amountInCA,
                    i
                );
        
                infoFeeArray.push({ caIndex: i, info: infoFee });
        
                // if in the future you need the "best" CA, you could choose it here
                // for now I leave the last one as chosen:
                convertAmountUSD = amountInCA;
                choosenCAIndex = i;
            }
            
        } else if (operationType === "SWAP_TCFORTP") {

            const infoFee = CalcCommission(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                amountExchange,
                caIndex
            );
        
            infoFeeArray.push({ caIndex, info: infoFee });
            convertAmountUSD = amountExchangeFee;

        } else if (operationType === "SWAP_TPFORTC") {

            const infoFee = CalcCommission(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                amountReceive,
                caIndex
            );

            infoFeeArray.push({ caIndex, info: infoFee });
            convertAmountUSD = amountReceiveFee;

        } else {
            throw new Error("Invalid type operation");
        }
        
        // Set commissions for each CA using the REAL CA index
        for (const { caIndex: caIdx, info } of infoFeeArray) {
            setCommissionForKey(`CA_${caIdx}`, {
                commission: info.fee,
                commissionUSD: info.feeUSD,
                commissionPercent: info.percent,
            });
        }
        
        // Fee Token Commission: use the entry corresponding to choosenCAIndex
        const baseForFeeToken =
            infoFeeArray.find((x) => x.caIndex === choosenCAIndex)?.info ??
            infoFeeArray[0]?.info; // fallback for security
        
        if (!baseForFeeToken) {
            throw new Error("No commission info available for FeeToken");
        }
        
        setCommissionForKey("FeeToken", {
            commission: baseForFeeToken.totalFeeToken,
            commissionUSD: baseForFeeToken.totalFeeTokenUSD,
            commissionPercent: baseForFeeToken.feeTokenPercent,
        });

        const priceCA = normalizeToBigInt(
            contractProtocolStatus.data[choosenCAIndex].PP_CA[0]
        );
        if (priceCA) {
            const aTokenExchange = currencyYouExchange.split("_");
            const aTokenReceive = currencyYouReceive.split("_");
            const aTokenMap = `${aTokenExchange[0]},${aTokenReceive[0]}`;
            convertAmountUSD = mulPrecision(convertAmountUSD, priceCA);
            setExchangingUSD(convertAmountUSD);
        }

        const execCost = executionFeeMap(
            currencyYouExchange,
            currencyYouReceive,
            contractProtocolStatus,
            caIndex
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
                newAmountBigInt,
                caIndex
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
                newAmountBigInt,
                caIndex
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
            totalbalance,
            caIndex
        );
        setValueExchange(totalbalance.toString());
        setAmountYouExchange(totalbalance);
        void onChangeAmounts(totalbalance, convertAmountReceive, "exchange");
    };

    const onChangeFee = (e: RadioChangeEvent): void => {
        console.warn("radio checked", e.target.value);
        const nValue = Number(e.target.value)
        setRadioSelectFee(nValue);
        if (operationType === "SWAP_TPFORTP" && nValue > 0) {
            setCAIndex(nValue - 1);
        }
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
                    <div
                        className="tokenSelector"
                        data-testid="exchange-input-from"
                    >
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

                    <div
                        className="tokenSelector"
                        data-testid="exchange-input-to"
                    >
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
                                              currencyYouReceive,
                                              caIndex
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
                                                      1000000000000000000n,
                                                      caIndex
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
                                                      1000000000000000000n,
                                                      caIndex
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
                                <CommissionsSelector 
                                    onChangeFee={onChangeFee}
                                    radioSelectFee={radioSelectFee}
                                    currencyYouExchange={currencyYouExchange}
                                    caIndex={caIndex}
                                    radioSelectFeeTokenDisabled={radioSelectFeeTokenDisabled}
                                    commissionsByKey={commissionsByKey}
                                    operationType={operationType}
                                />
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
                        commissionsByKey={commissionsByKey}
                        inputAmountYouExchange={calculateFinalAmountExchange()}
                        amountYouReceive={amountYouReceive}
                        inputValidationError={inputValidationError}
                        executionFee={executionFee}
                        executionFeeUSD={executionFeeUSD}
                        radioSelectFee={radioSelectFee}
                        caIndex={caIndex}
                        slippageTolerance={slippageTolerance}
                        onChangeSlippageTolerance={onChangeSlippageTolerance}
                        operationType={operationType}
                        //amountYouExchangeFee={amountYouExchangeFee}
                        //amountYouReceiveFee={amountYouReceiveFee}
                    />
                </div>
            </div>
        </div>
    );
}
