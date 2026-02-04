import type { RadioChangeEvent } from "antd";
import React, { useCallback, useEffect, useState } from "react";

import { getExecutionFee } from "../../backend/utils";
import { useWalletContext } from "../../context/Wallet";
import { CheckStatusGlobal } from "../../helpers/checkStatus";
import { calculateLimit } from "../../helpers/exchange";
import { SlippageTolerance } from "../SlippageTolerance";
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
    tokenExchangeCombined,
    tokenReceiveCombined,
    typeOperation,
    onlyTPs,
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

interface ExchangeProps {
    isCombinedOperation: boolean;
}

const allTPs = onlyTPs() as string[];

export default function Exchange(props: ExchangeProps): JSX.Element {
    const { isCombinedOperation } = props;
    const { t, i18n, ns } = useProjectTranslation();
    const space: string = "\u00A0";

    const { contractProtocolStatus, userBalance, publicClient } =
        useWalletContext();

    const defaultTokenExchange = isCombinedOperation ? tokenExchangeCombined()[0] : tokenExchange()[0];
    const defaultTokenReceive = isCombinedOperation ? tokenReceiveCombined(defaultTokenExchange)[0] : tokenReceive(defaultTokenExchange)[0];

    const [currencyYouExchange, setCurrencyYouExchange] =
        useState<string>(defaultTokenExchange);
    const [currencyYouReceive, setCurrencyYouReceive] =
        useState<string>(defaultTokenReceive);

    const [amountYouExchange, setAmountYouExchange] = useState<bigint>(0n);
    const [amountYouReceive, setAmountYouReceive] = useState<bigint>(0n);
    const [amountAnotherToken, setAmountAnotherToken] = useState<{ qAC: bigint, amount: bigint }>({ qAC: 0n, amount: 0n });

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
    const [globalValidationErrorText, setGlobalValidationErrorText] =
        useState<string>("");      

    let operationType: string = typeOperation(currencyYouExchange, currencyYouReceive);
    if (isCombinedOperation && operationType === "MINT") {
        operationType = "COMBINED_MINT";
    } else if (isCombinedOperation && operationType === "REDEEM") {
        operationType = "COMBINED_REDEEM";
    }

    const [radioSelectFee, setRadioSelectFee] = useState<number>(1);    

    const [valueExchange, setValueExchange] = useState<string>("");
    const [valueReceive, setValueReceive] = useState<string>("");
    const [caIndex, setCAIndex] = useState<number>(0);
    const [tpIndex, setTPIndex] = useState<number>(0);

    const lastEditedRef = React.useRef<"exchange" | "receive">("exchange");
    const slippageFirstRunRef = React.useRef(true);

    // For ignoring old async responses
    const changeSeqRef = React.useRef(0);
    
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
        const newCurrencyYouReceive = isCombinedOperation ? tokenReceiveCombined(newCurrencyYouExchange)[0] : tokenReceive(newCurrencyYouExchange)[0];
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
        setGlobalValidationErrorText("");
    };

    const onValidate = useCallback((): void => {
        // Protocol in not-good status
        const { statusCode } = checkerStatus();

        const arrCurrencyYouExchange = currencyYouExchange.split("_");
        const arrCurrencyYouReceive = currencyYouReceive.split("_");

        if (statusCode[caIndex] >= 2) {
            setGlobalValidationErrorText(t("exchange.errors.notOperational"));
            setInputValidationError(true);
            return;
        }

        // 0. Not Wallet connected
        if (!userBalance.data) {
            setGlobalValidationErrorText(t("exchange.errors.connectYourWallet"));
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

        // Coverage
        if (!contractProtocolStatus.data) return;
        const combinedCglb = contractProtocolStatus.data.getCombinedCglb;
        const combinedCtargemaCA = contractProtocolStatus.data.getCombinedCtargemaCA;
        const getCtargemaCA = contractProtocolStatus.data[caIndex].getCtargemaCA;
        const globalCoverage = contractProtocolStatus.data[caIndex].getCglb;

        let tIndex: number | undefined;
        // 2. MINT TP & SWAP TC FOR TP
        if ((arrCurrencyYouExchange[0] === "CA" && arrCurrencyYouReceive[0] === "TP") ||
            (arrCurrencyYouExchange[0] === "TC" && arrCurrencyYouReceive[0] === "TP")) {            
            // There are sufficient PEGGED in the contracts to mint?
            tIndex = TokenSettings(currencyYouReceive).key;
            if (tIndex !== undefined) {

                // Tp available to mint
                const tpAvailableToMint =
                    contractProtocolStatus.data[caIndex]
                        .getRealTPAvailableToMint[tIndex];
                if (amountYouReceive > tpAvailableToMint) {
                    setGlobalValidationErrorText(
                        t("exchange.errors.noLiquidity")
                    );
                    setInputValidationError(true);
                    return;
                }
               
                // Coverage not met
                if ((combinedCglb < combinedCtargemaCA) || (globalCoverage < getCtargemaCA)) {
                    setGlobalValidationErrorText(t("exchange.errors.coverageNotMet"));
                    setInputValidationError(true);
                    return;
                }
                
            }
        }

        // 3. REDEEM TC
        if (arrCurrencyYouExchange[0] === "TC" && arrCurrencyYouReceive[0] === "CA") {            
            // Coverage not met
            if ((combinedCglb < combinedCtargemaCA) || (globalCoverage < getCtargemaCA)) {
                setGlobalValidationErrorText(t("exchange.errors.coverageNotMet"));
                setInputValidationError(true);
                return;
            }
        }

        // 3. REDEEM TC & SWAP TC FOR TP
        if ((arrCurrencyYouExchange[0] === "TC" && arrCurrencyYouReceive[0] === "CA") ||
            (arrCurrencyYouExchange[0] === "TC" && arrCurrencyYouReceive[0] === "TP")) {
            if (!contractProtocolStatus.data) return;
            // There are sufficient TC in the contracts to redeem?
            const tcAvailableToRedeem =
                contractProtocolStatus.data[caIndex].getRealTCAvailableToRedeem;
            if (amountYouExchange > tcAvailableToRedeem) {
                setGlobalValidationErrorText(t("exchange.errors.noLiquidity"));
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
                    setGlobalValidationErrorText(
                        t("exchange.errors.noLiquidity")
                    );
                    setInputValidationError(true);
                    return;
                }
            }
        }

        // 6. MINT TP & SWAP TC FOR TP. Flux capacitor maxQACToMintTP
        if ((arrCurrencyYouExchange[0] === "CA" && arrCurrencyYouReceive[0] === "TP") || 
            (arrCurrencyYouExchange[0] === "TC" && arrCurrencyYouReceive[0] === "TP")) {
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
                    setGlobalValidationErrorText(
                        t("exchange.errors.maxLimitedByProtocol")
                    );
                    setInputValidationError(true);
                    return;
                }
            }
        }

        // Redeem TP & SWAP TP FOR TC        
        if ((arrCurrencyYouExchange[0] === "TP" && arrCurrencyYouReceive[0] === "CA") || 
            (arrCurrencyYouExchange[0] === "TP" && arrCurrencyYouReceive[0] === "TC")) {
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
                    setGlobalValidationErrorText(
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

        // SWAP TP FOR TP
        if (arrCurrencyYouExchange[0] === "TP" && arrCurrencyYouReceive[0] === "TP") {

        }

        // Not enough balance to pay fees
        const notEnoughBalanceToPayFees =
            Object.values(commissionsByKey).length > 0 &&
            Object.values(commissionsByKey).every(item => item.commission > item.balance);        
        if (notEnoughBalanceToPayFees) {
            setGlobalValidationErrorText("Not enough balance to pay fees");
            setInputValidationError(true);
            return;
        }
        
        // No Validations Errors
        setInputValidationErrorText("");
        setGlobalValidationErrorText("");
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


    useEffect(() => {
        // avoid recalculating in the first render (optional)
        if (slippageFirstRunRef.current) {
          slippageFirstRunRef.current = false;
          return;
        }
      
        if (!publicClient) return;
        if (!contractProtocolStatus.data) return;
        if (!userBalance.data) return;
      
        // if there is no amount loaded, do nothing
        if (amountYouExchange <= 0n && amountYouReceive <= 0n) return;
      
        // sequence to ignore old async responses
        const seq = ++changeSeqRef.current;
      
        const run = async () => {
          const source = lastEditedRef.current;
      
          if (source === "exchange") {
            const convertAmountReceive = ConvertAmount(
              contractProtocolStatus,
              currencyYouExchange,
              currencyYouReceive,
              amountYouExchange,
              caIndex
            );
      
            await onChangeAmounts(amountYouExchange, convertAmountReceive, "exchange");
          } else {
            const convertAmountExchange = ConvertAmount(
              contractProtocolStatus,
              currencyYouReceive,
              currencyYouExchange,
              amountYouReceive,
              caIndex
            );
      
            await onChangeAmounts(convertAmountExchange, amountYouReceive, "receive");
          }
      
          // if there was another change, do not "overwrite" with old results
          if (seq !== changeSeqRef.current) return;
        };
      
        void run();
      }, [
        slippageTolerance,
        // depends on these because if they change and the user adjusts slippage, you want to recalculate properly
        caIndex,
        currencyYouExchange,
        currencyYouReceive,
        // if the user changes the amount and then slippage, it is already updated
        amountYouExchange,
        amountYouReceive,
        contractProtocolStatus.data,
        userBalance.data,
        publicClient,
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
        let amountAnotherToken: { qAC: bigint, amount: bigint } = { qAC: 0n, amount: 0n };
        switch (source) {
            case "exchange":
                if (operationType === "COMBINED_MINT") {                    
                    amountAnotherToken = calculateAmountAnotherTokenMintTP(amountExchange, caIndex, tpIndex);                    
                    setAmountAnotherToken(amountAnotherToken);
                } else if (operationType === "COMBINED_REDEEM") {
                    amountAnotherToken = calculateAmountAnotherTokenRedeemTC(amountExchange, caIndex, tpIndex);
                    amountReceive = amountReceive                    
                    setAmountAnotherToken(amountAnotherToken);                    
                }
                infoFee = CalcCommission(
                    contractProtocolStatus,
                    currencyYouExchange,
                    currencyYouReceive,
                    amountReceive,
                    caIndex
                );
                amountExchangeFee = amountExchange;
                amountReceiveFee = amountReceive - infoFee.fee;                
                amountReceiveFee = calculateLimit(
                    amountReceiveFee,
                    -(slippageTolerance / 100)
                ); 
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
                if (operationType === "COMBINED_MINT") {                    
                    amountAnotherToken = calculateAmountAnotherTokenMintTP(amountReceive, caIndex, tpIndex);
                    amountExchange = amountExchange + amountAnotherToken.qAC;                    
                    setAmountAnotherToken(amountAnotherToken);
                } else if (operationType === "COMBINED_REDEEM") {
                    amountAnotherToken = calculateAmountAnotherTokenRedeemTC(amountExchange, caIndex, tpIndex);
                    setAmountAnotherToken(amountAnotherToken);                    
                }
                infoFee = CalcCommission(
                    contractProtocolStatus,
                    currencyYouExchange,
                    currencyYouReceive,
                    amountExchange,
                    caIndex
                );
                amountExchangeFee = amountExchange + infoFee.fee;
                amountExchangeFee = calculateLimit(
                    amountExchangeFee,
                    slippageTolerance / 100
                ); 
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
        
        if (operationType === "MINT" || operationType === "SWAP_TCFORTP" || operationType === "COMBINED_MINT") {
            const infoFee = CalcCommission(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                amountExchange,
                caIndex
            );
        
            infoFeeArray.push({ caIndex, info: infoFee });
            convertAmountUSD = amountExchangeFee;
        
        } else if (operationType === "REDEEM" || operationType === "SWAP_TPFORTC" || operationType === "COMBINED_REDEEM") {
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

        } else {
            throw new Error("Invalid type operation");
        }
        
        // Set commissions for each CA using the REAL CA index
        for (const { caIndex: caIdx, info } of infoFeeArray) {
            setCommissionForKey(`CA_${caIdx}`, {
                commission: info.fee,
                commissionUSD: info.feeUSD,
                commissionPercent: info.percent,
                balance: userBalance.data.CA[caIdx].balance
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
            balance: userBalance.data[caIndex].FeeToken.balance
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

        // Combined Operations
        /*if (operationType === "COMBINED_MINT") {
            const amountAnotherToken = calculateAmountAnotherTokenMint(amountReceive);
            setAmountAnotherToken(amountAnotherToken);
        }*/
    };

    const onChangeAmountYouExchange = (newAmount: string | number): void => {
        lastEditedRef.current = "exchange";

        const newAmountBigInt = toBigIntPrecision(newAmount);
        if (newAmountBigInt < 0n) {
            setAmountYouExchange(0n);
            setAmountYouReceive(0n);
            setExchangingUSD(0n);
            setValueExchange("");
            return;
        }

        setValueExchange(newAmount.toString());
        const convertAmountReceive = ConvertAmount(
            contractProtocolStatus,
            currencyYouExchange,
            currencyYouReceive,
            newAmountBigInt,
            caIndex
        );
        
        void onChangeAmounts(newAmountBigInt, convertAmountReceive, "exchange");
    };

    const onChangeAmountYouReceive = (newAmount: string | number): void => {
        lastEditedRef.current = "receive";

        const newAmountBigInt = toBigIntPrecision(newAmount);
        if (newAmountBigInt < 0n) {
          setAmountYouExchange(0n);
          setAmountYouReceive(0n);
          setExchangingUSD(0n);
          setValueReceive("");
          return;
        }
      
        setValueReceive(newAmount.toString());
        let convertAmountExchange = ConvertAmount(
          contractProtocolStatus,
          currencyYouReceive,
          currencyYouExchange,
          newAmountBigInt,
          caIndex
        );
              
        void onChangeAmounts(convertAmountExchange, newAmountBigInt, "receive");
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

    const onChangeSlippageTolerance = async (value: number): Promise<void> => {
        console.warn("slippage tolerance", value);
        setSlippageTolerance(value);
    };

    const onSlippageInteractionChange = useCallback(
        (next: { hasPendingCustom: boolean; isValid: boolean }) => {
            return next;
        },
        []
    );
    
    const onChangeTPIndex = (
        newTPValue: string
    ): void => {
        const index = allTPs.indexOf(newTPValue);
        if (index >= 0) {
            setTPIndex(index);
        }
    };

    const calculateAmountAnotherTokenMintTP = (
        qTP: bigint,
        caIndex: number,
        tpIndex: number
    ): { qAC: bigint, amount: bigint } => {
        /**             
        mintTCandTP:

            qACtpMintTC = (qTP * (ctargemaTP - 1)) / pACtp)

            qACtoMintTP = qTP / pACtp
            (qACmax amount you are willing to spend has to be greater than the amount you need to spend)

            qACNeeded = (qACtpMintTC + qACtoMintTP) + fee
        **/
        if (operationType !== "COMBINED_MINT") return { qAC: 0n, amount: 0n };
        const ctargemaTP = toBigIntPrecision(5.0);
        const pACtp = normalizeToBigInt(contractProtocolStatus.data[caIndex].PP_TP[tpIndex][0]) || 0n;
        const pTCac = normalizeToBigInt(contractProtocolStatus.data[caIndex].getPTCac) || 0n;
        const qACtpMintTC = divPrecision(mulPrecision(qTP, ctargemaTP - toBigIntPrecision(1)), pACtp);        
        const amount = mulPrecision(qACtpMintTC, pTCac);
        return { qAC: qACtpMintTC, amount: amount };
    };

    const calculateAmountAnotherTokenRedeemTC = (
        qTC: bigint,
        caIndex: number,
        tpIndex: number
    ): { qAC: bigint, amount: bigint } => {
        /** 
             * 
        redeemTCandTP :
            aux = ((combinedCglb - 1) * (ctargemaTP - 1) / (combinedCtargemaCA -1))
            el TP que el usuario indica para redimir tiene que ser mayor a

            qTP = qTC * pACtp * pTCac / aux
            (qACmin amount you receive has to be less than the amount you expect to receive)

            qACRedeemed = ((qTP / pACtp) + (qTC * pTCac)) - fee
        
        **/
        if (operationType !== "COMBINED_REDEEM") return { qAC: 0n, amount: 0n };
        const ctargemaTP = toBigIntPrecision(7.0);
        const combinedCglb = contractProtocolStatus.data.getCombinedCglb;
        const combinedCtargemaCA = contractProtocolStatus.data.getCombinedCtargemaCA;
        const pACtp = normalizeToBigInt(contractProtocolStatus.data[caIndex].PP_TP[tpIndex][0]) || 0n;
        const pTCac = normalizeToBigInt(contractProtocolStatus.data[caIndex].getPTCac) || 0n;
        const upAux = mulPrecision((combinedCglb - toBigIntPrecision(1)), (ctargemaTP - toBigIntPrecision(1)))
        const downAux = (combinedCtargemaCA - toBigIntPrecision(1))
        const aux = divPrecision(upAux, downAux)
        const qTP = divPrecision(mulPrecision(mulPrecision(qTC, pACtp), pTCac), aux)
        const qTPinAC = mulPrecision(qTP, pACtp)
        return { qAC: qTPinAC, amount: qTP };
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
                            currencyOptions={isCombinedOperation ? tokenExchangeCombined() : tokenExchange()}
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

                    {isCombinedOperation && operationType === "COMBINED_REDEEM" && (
                        <div className="combined-operations-info">
                            <div className="combined-operations-info-item">
                                <CurrencyPopUp
                                    value={allTPs[tpIndex]}
                                    currencyOptions={allTPs}
                                    onChange={onChangeTPIndex}
                                    action={"exchange"}
                                />
                            </div>
                            <div>Sending</div>
                            <div className="combined-operations-info-sending-value">
                            {" "}
                            {!contractProtocolStatus.data
                                ? "--"
                                : PrecisionNumbers({
                                        amount: amountAnotherToken.amount,
                                        decimals:
                                            TokenSettings(
                                                `TP_${tpIndex}`
                                            ).visibleDecimals || 2,
                                        token: TokenSettings(
                                            `TP_${tpIndex}`
                                        ),
                                        i18n: i18n,
                                    })}
                            </div>
                            <div className="combined-operations-info-sending-value-usd">
                                $0.0 
                                <span>USD</span>
                            </div>
                            <div className="combined-operations-info-sending-value-name">
                                Balance: 
                                {
                                    !userBalance
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: TokenBalance(userBalance, `TP_${tpIndex}`),
                                          token: TokenSettings(`TP_${tpIndex}`),
                                          decimals: 8,
                                          i18n: i18n,
                                      })
                                }
                            </div>
                        </div>
                    )}

                    <div className="buttonSwap" onClick={handleSwapCurrencies}>
                        <div className="icon-swap"></div>
                    </div>

                    <div
                        className="tokenSelector"
                        data-testid="exchange-input-to"
                    >
                        <CurrencyPopUp
                            value={currencyYouReceive}
                            currencyOptions={isCombinedOperation ? tokenReceiveCombined(currencyYouExchange) : tokenReceive(currencyYouExchange)}
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
                    {isCombinedOperation && operationType === "COMBINED_MINT" && (
                        <div className="combined-operations-info">
                            <div className="combined-operations-info-item">
                                <span className="combined-operations-info-item-label">

                                {t(
                                    `exchange.tokens.TC_${caIndex}.label`,
                                    {
                                        ns: ns,
                                    }
                                )} (
                                {t(
                                    `exchange.tokens.TC_${caIndex}.abbr`,
                                    {
                                        ns: ns,
                                    }
                                )} )
                                </span>
                            </div>
                            <div className="combined-operations-info-receiving">
                                <span className="combined-operations-info-receiving-label">
                                    Receiving
                                </span>
                                <span className="combined-operations-info-receiving-value">
                                {" "}
                                {!contractProtocolStatus.data
                                    ? "--"
                                    : PrecisionNumbers({
                                            amount: amountAnotherToken.amount,
                                            decimals:
                                                TokenSettings(
                                                    `TC_${caIndex}`
                                                ).visibleDecimals || 2,
                                            token: TokenSettings(
                                                `TC_${caIndex}`
                                            ),
                                            i18n: i18n,
                                        })}
                                </span>
                                <span className="combined-operations-info-receiving-value-usd">
                                    $0.0
                                </span>
                                <span className="combined-operations-info-receiving-value-name">
                                {" "}
                                    Balance:
                                    {
                                        !userBalance
                                        ? "--"
                                        : PrecisionNumbers({
                                              amount: TokenBalance(userBalance, `TC_${caIndex}`),
                                              token: TokenSettings(`TC_${caIndex}`),
                                              decimals: 8,
                                              i18n: i18n,
                                          })
                                    }
                                </span>
                            </div>
                        </div>
                    )}
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
                                    commissionsByKey={commissionsByKey}
                                    operationType={operationType}
                                />
                            </div>
                            <div className="tx-fees-info">
                                {t("fees.disclaimer1")} <br />
                                {t("fees.disclaimer2")}
                            </div>
                            <div className="tx-slippage-container">
                                <SlippageTolerance
                                    pairId={`${currencyYouExchange}-${currencyYouReceive}`}
                                    defaultState={{
                                        mode: "auto",
                                        value: slippageTolerance,
                                    }}
                                    onChange={(next) => onChangeSlippageTolerance(next.value)}
                                    onInteractionChange={onSlippageInteractionChange}
                                />
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
                <div className="cta-info-global-error">
                    <div className="amountInput__feedback amountInput__feedback--error">
                        {globalValidationErrorText}
                    </div>
                </div>
                <div className="cta-options-group">
                    <ModalConfirmOperation
                        currencyYouExchange={currencyYouExchange}
                        currencyYouReceive={currencyYouReceive}
                        exchangingUSD={exchangingUSD}
                        commissionsByKey={commissionsByKey}
                        amountYouExchange={amountYouExchange}
                        amountYouReceive={amountYouReceive}
                        inputValidationError={inputValidationError}
                        executionFee={executionFee}
                        executionFeeUSD={executionFeeUSD}
                        radioSelectFee={radioSelectFee}
                        caIndex={caIndex}                        
                        operationType={operationType}
                        slippageTolerance={slippageTolerance}
                        amountAnotherToken={amountAnotherToken}
                        tpIndex={tpIndex}
                        //amountYouExchangeFee={amountYouExchangeFee}
                        //amountYouReceiveFee={amountYouReceiveFee}
                    />
                </div>
            </div>
        </div>
    );
}
