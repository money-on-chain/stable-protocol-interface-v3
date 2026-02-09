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

        if (currencyYouExchange.startsWith("CA_") && radioSelectFee > 0) {
            const feeCA = commissionsByKey[`CA_${caIndex}`]?.commission ?? 0n;
            const needed = amountYouExchange + feeCA;
            const bal = TokenBalance(userBalance, currencyYouExchange);
            if (needed > bal) {
                setInputValidationErrorText(t("exchange.errors.notBalance"));
                setInputValidationError(true);
                return;
            }
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

        const ex = currencyYouExchange.split("_")[0];
        const re = currencyYouReceive.split("_")[0];

        const isMint = ex === "CA" && re !== "CA";     // CA -> (TC/TP)
        const isRedeem = ex !== "CA" && re === "CA";   // (TC/TP) -> CA
        const isSwapNoCA = ex !== "CA" && re !== "CA"; // (TC/TP) -> (TC/TP)

        const payFeeInCA = radioSelectFee > 0;

        const feeBaseForCombined = (baseCA: bigint, ctx?: { qTC?: bigint; qTP?: bigint }): bigint => {
            if (operationType === "COMBINED_MINT") {
                const other = calculateAmountAnotherTokenMintTP(baseCA, caIndex, tpIndex); // baseCA = qTP (CA principal)
                return baseCA + other.qAC;
            }
            if (operationType === "COMBINED_REDEEM") {
                const qTC = ctx?.qTC ?? 0n;
                const other = calculateAmountAnotherTokenRedeemTC(qTC, caIndex, tpIndex);
                return baseCA + other.qAC;
            }
            return baseCA;
        };
        
        const solveGrossCAForNetRedeem = (netCA: bigint): { grossCA: bigint; qTC: bigint } => {
            if (!payFeeInCA) {                
                const qTC0 = ConvertAmount(contractProtocolStatus, `CA_${caIndex}`, currencyYouExchange, netCA, caIndex);
                return { grossCA: netCA, qTC: qTC0 };
            }

            let grossCA = netCA;
            let qTC = 0n;

            for (let i = 0; i < 8; i++) {
                qTC = ConvertAmount(contractProtocolStatus, `CA_${caIndex}`, currencyYouExchange, grossCA, caIndex);

                const feeInfoTmp = CalcCommission(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                feeBaseForCombined(grossCA, { qTC }),
                caIndex
                );

                const nextGross = netCA + feeInfoTmp.fee;
                if (nextGross === grossCA) break;
                grossCA = nextGross;
            }

            return { grossCA, qTC };
        };

        let infoFee: CommissionInfo;
        let amountExchangeFee: bigint;
        let amountReceiveFee: bigint;
        let amountInCA: bigint = 0n;

        if (operationType === "COMBINED_MINT" || operationType === "MINT") {
            // MINT: exchange is CA principal
            amountInCA = amountExchange;

        } else if (operationType === "COMBINED_REDEEM" || operationType === "REDEEM") {
            // REDEEM: fee base must be gross CA equivalent
            if (source === "exchange") {
                // user typed TC/TP => gross CA comes from exchange amount
                amountInCA = ConvertAmount(
                contractProtocolStatus,
                currencyYouExchange,   // TC_x or TP_x
                `CA_${caIndex}`,
                amountExchange,
                caIndex
                );
            } else {
                // source === "receive": amountReceive is CA NET (your preference).
                // The correct gross CA is solved later (net = gross - fee(gross)),
                // so set placeholder here and recompute amountInCA after solving gross.
                amountInCA = 0n;
            }

        } else if (operationType === "SWAP_TPFORTP") {
            // TP -> TP: fee base is CA equivalent of TP input
            amountInCA = ConvertAmount(
                contractProtocolStatus,
                currencyYouExchange,     // TP_x
                `CA_${caIndex}`,
                amountExchange,
                caIndex
            );

        } else if (operationType === "SWAP_TCFORTP") {
            amountInCA = ConvertAmount(
                contractProtocolStatus,
                `TC_${caIndex}`,
                `CA_${caIndex}`,
                amountExchange,
                caIndex
            );

        } else if (operationType === "SWAP_TPFORTC") {
            amountInCA = ConvertAmount(
                contractProtocolStatus,
                currencyYouExchange,     // TP_x
                `CA_${caIndex}`,
                amountExchange,
                caIndex
            );

        } else {
            throw new Error("Invalid operation type: " + operationType);
        }
        
        let combinedFeeCA: bigint = amountInCA; 
        if (operationType === "COMBINED_MINT") {                    
            const other = calculateAmountAnotherTokenMintTP(amountInCA, caIndex, tpIndex);
            setAmountAnotherToken(other);
            combinedFeeCA = amountInCA + other.qAC;                     
        } else if (operationType === "COMBINED_REDEEM") {
            const other = calculateAmountAnotherTokenRedeemTC(amountExchange, caIndex, tpIndex);
            setAmountAnotherToken(other);
            combinedFeeCA = amountInCA + other.qAC;                  
        }

        infoFee = CalcCommission(
            contractProtocolStatus,
            currencyYouExchange,
            currencyYouReceive,
            combinedFeeCA,
            caIndex
        );

        switch (source) {
            case "exchange": {
              amountExchangeFee = amountExchange;
          
              if (isMint) {
                // CA principal => output from principal (fee does NOT reduce receive)
                const receiveOut = ConvertAmount(
                  contractProtocolStatus,
                  currencyYouExchange,
                  currencyYouReceive,
                  amountExchangeFee,
                  caIndex
                );
          
                const receiveSlip = calculateLimit(receiveOut, -(slippageTolerance / 100));
                setAmountYouExchange(amountExchangeFee);
                setAmountYouReceive(receiveSlip);
                setValueReceive(receiveSlip === 0n ? "" : bigIntToInputValue(receiveSlip, currencyYouReceive, receiveSlip < 10n ** 17n ? 12 : 8));
                // You should also store/display totalPayCA = principal + fee when payFeeInCA
                break;
              }
          
              if (isRedeem) {
                const grossCA = ConvertAmount(
                  contractProtocolStatus,
                  currencyYouExchange,
                  `CA_${caIndex}`,
                  amountExchangeFee,
                  caIndex
                );
                amountInCA = grossCA;
          
                // fee base for redeem is grossCA (principal CA equivalent)
                const feeInfoRedeem = CalcCommission(
                  contractProtocolStatus,
                  currencyYouExchange,
                  currencyYouReceive,
                  feeBaseForCombined(grossCA, { qTC: amountExchangeFee }),
                  caIndex
                );
          
                let netCA = grossCA;
                if (payFeeInCA) netCA = netCA - feeInfoRedeem.fee;
          
                netCA = calculateLimit(netCA, -(slippageTolerance / 100));
                setAmountYouExchange(amountExchangeFee);
                setAmountYouReceive(netCA);
                setValueReceive(netCA === 0n ? "" : bigIntToInputValue(netCA, currencyYouReceive, netCA < 10n ** 17n ? 12 : 8));
          
                // IMPORTANT: overwrite infoFee with the correct one for this branch
                infoFee = feeInfoRedeem;
                break;
              }
          
              // swap no CA
              const receiveOut = ConvertAmount(
                contractProtocolStatus,
                currencyYouExchange,
                currencyYouReceive,
                amountExchangeFee,
                caIndex
              );
          
              const receiveSlip = calculateLimit(receiveOut, -(slippageTolerance / 100));
              setAmountYouExchange(amountExchangeFee);
              setAmountYouReceive(receiveSlip);
              setValueReceive(receiveSlip === 0n ? "" : bigIntToInputValue(receiveSlip, currencyYouReceive, receiveSlip < 10n ** 17n ? 12 : 8));
              break;
            }
          
            case "receive": {
              amountReceiveFee = amountReceive;
          
              if (isMint) {
                // receive typed => solve CA principal (no fee in inputs)
                const principalCA = ConvertAmount(
                  contractProtocolStatus,
                  currencyYouReceive,
                  `CA_${caIndex}`,
                  amountReceiveFee,
                  caIndex
                );
          
                // apply max pay slippage on principal? usually you'd apply on receive, but keep your convention:
                const principalSlip = calculateLimit(principalCA, +(slippageTolerance / 100));
          
                setAmountYouReceive(amountReceiveFee);
                setAmountYouExchange(principalSlip);
                setValueExchange(principalSlip === 0n ? "" : bigIntToInputValue(principalSlip, currencyYouExchange, principalSlip < 10n ** 17n ? 12 : 8));
          
                // fee should be computed from principalCA (and totalPayCA = principal + fee if payFeeInCA)
                const feeInfoMint = CalcCommission(
                  contractProtocolStatus,
                  currencyYouExchange,
                  currencyYouReceive,
                  feeBaseForCombined(principalCA),
                  caIndex
                );
                infoFee = feeInfoMint;
                break;
              }
          
              if (isRedeem) {
                const desiredNetCA = amountReceiveFee; // receive is CA net
          
                const { grossCA, qTC } = solveGrossCAForNetRedeem(desiredNetCA);
                amountInCA = grossCA;

                const grossSlip = calculateLimit(grossCA, +(slippageTolerance / 100));

                const exchangeIn = ConvertAmount(
                    contractProtocolStatus,
                    `CA_${caIndex}`,
                    currencyYouExchange,
                    grossSlip,
                    caIndex
                );

                setAmountYouReceive(desiredNetCA);
                setAmountYouExchange(exchangeIn);
                setValueExchange(exchangeIn === 0n ? "" : bigIntToInputValue(exchangeIn, currencyYouExchange, exchangeIn < 10n ** 17n ? 12 : 8));

                const feeInfoRedeem = CalcCommission(
                    contractProtocolStatus,
                    currencyYouExchange,
                    currencyYouReceive,
                    feeBaseForCombined(grossCA, { qTC }),
                    caIndex
                );
                infoFee = feeInfoRedeem;
                break;
              }
          
              // swap no CA
              const exchangeIn = ConvertAmount(
                contractProtocolStatus,
                currencyYouReceive,
                currencyYouExchange,
                amountReceiveFee,
                caIndex
              );
          
              const exchangeSlip = calculateLimit(exchangeIn, +(slippageTolerance / 100));
              setAmountYouReceive(amountReceiveFee);
              setAmountYouExchange(exchangeSlip);
              setValueExchange(exchangeSlip === 0n ? "" : bigIntToInputValue(exchangeSlip, currencyYouExchange, exchangeSlip < 10n ** 17n ? 12 : 8));
              break;
            }
          
            default:
              throw new Error("Invalid source name");
          }
          

        type CommissionWithIndex = {
            caIndex: number;
            info: CommissionInfo;
        };
        
        // Set exchanging total in USD and choosen CA index
        let convertAmountUSD: bigint = amountInCA;
        let choosenCAIndex: number = caIndex;
        const infoFeeArray: CommissionWithIndex[] = [];
        
        if (operationType === "MINT" || operationType === "SWAP_TCFORTP" || operationType === "COMBINED_MINT") {                    
            infoFeeArray.push({ caIndex, info: infoFee });
            //convertAmountUSD = amountExchangeFee;        
        } else if (operationType === "REDEEM" || operationType === "SWAP_TPFORTC" || operationType === "COMBINED_REDEEM") {
            infoFeeArray.push({ caIndex, info: infoFee });
            //convertAmountUSD = amountReceiveFee;
        
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
            balance: userBalance.data[choosenCAIndex].FeeToken.balance
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
        //const qTPinAC = mulPrecision(qTP, pACtp)
        const qTPinAC = divPrecision(qTP, pACtp)

        return { qAC: qTPinAC, amount: qTP };
    };

    const onConvertUSDYouExchange = (amount: string): bigint => {        
        const amountBigInt = toBigIntPrecision(amount);
        if (amountBigInt < 0n) return 0n;
        const amountUSD = ConvertAmount(contractProtocolStatus, currencyYouExchange, "USD", amountBigInt, caIndex);
        return amountUSD;
    };

    const onConvertUSDYouReceive = (amount: string): bigint => {        
        const amountBigInt = toBigIntPrecision(amount);
        if (amountBigInt < 0n) return 0n;
        const amountUSD = ConvertAmount(contractProtocolStatus, currencyYouReceive, "USD", amountBigInt, caIndex);
        return amountUSD;
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
                            onConvertUSD={onConvertUSDYouExchange}
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
                            onConvertUSD={onConvertUSDYouReceive}
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
