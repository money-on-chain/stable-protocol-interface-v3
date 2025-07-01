import { Radio, Space } from "antd";
import React, { useContext, useState, useEffect } from "react";
import Web3 from "web3";

import { useProjectTranslation } from "../../helpers/translations";
import CurrencyPopUp from "../CurrencyPopUp";
import ModalConfirmOperation from "../Modals/ConfirmOperation";
import {
    TokenSettings,
    TokenBalance,
    ConvertBalance,
    ConvertAmount,
    AmountToVisibleValue,
    CalcCommission,
    getCAIndex,
} from "../../helpers/currencies";
import {
    tokenExchange,
    tokenReceive,
    isMintOperation,
    executionFeeMap,
} from "../../helpers/exchange";

import settings from "../../settings/settings.json";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { AuthenticateContext } from "../../context/Auth";
import InputAmount from "../InputAmount/";
import BigNumber from "bignumber.js";
import { fromContractPrecisionDecimals } from "../../helpers/Formats";
import { CheckStatusGlobal } from "../../helpers/checkStatus";
import { getExecutionFee } from "../../lib/backend/utils";

interface FeeInfo {
    fee: BigNumber;
    feeUSD: BigNumber;
    percent: BigNumber;
    totalFeeToken: BigNumber;
    totalFeeTokenUSD: BigNumber;
    feeTokenPercent: BigNumber;
}

type SourceType = "exchange" | "receive";

export default function Exchange(): JSX.Element {
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    const defaultTokenExchange: string = tokenExchange()[0];
    const defaultTokenReceive: string = tokenReceive(defaultTokenExchange)[0];

    const [currencyYouExchange, setCurrencyYouExchange] =
        useState<string>(defaultTokenExchange);
    const [currencyYouReceive, setCurrencyYouReceive] =
        useState<string>(defaultTokenReceive);

    const [amountYouExchange, setAmountYouExchange] = useState<BigNumber>(
        new BigNumber(0)
    );
    const [amountYouReceive, setAmountYouReceive] = useState<BigNumber>(new BigNumber(0));

    //const [isDirtyYouExchange, setIsDirtyYouExchange] = useState(false);
    //const [isDirtyYouReceive, setIsDirtyYouReceive] = useState(false);

    const [commission, setCommission] = useState<string>("0.0");
    const [commissionUSD, setCommissionUSD] = useState<string>("0.0");
    const [commissionPercent, setCommissionPercent] = useState<string>("0.0");

    const [commissionFeeToken, setCommissionFeeToken] = useState<string>("0.0");
    const [commissionFeeTokenUSD, setCommissionFeeTokenUSD] = useState<string>("0.0");
    const [commissionPercentFeeToken, setCommissionPercentFeeToken] =
        useState<string>("0.0");

    const [executionFee, setExecutionFee] = useState<BigNumber>(new BigNumber(0));
    const [executionFeeUSD, setExecutionFeeUSD] = useState<BigNumber>(new BigNumber(0));

    const [exchangingUSD, setExchangingUSD] = useState<BigNumber>(new BigNumber(0));

    const [inputValidationErrorText, setInputValidationErrorText] =
        useState<string>("");
    const [inputValidationError, setInputValidationError] = useState<boolean>(false);

    const IS_MINT: boolean = isMintOperation(currencyYouExchange, currencyYouReceive);

    const [radioSelectFee, setRadioSelectFee] = useState<number>(0);
    const [radioSelectFeeTokenDisabled, setRadioSelectFeeTokenDisabled] =
        useState<boolean>(true);

    const [valueExchange, setValueExchange] = useState<string>("");
    const [valueReceive, setValueReceive] = useState<string>("");
    const [caIndex, setCAIndex] = useState<number>(0);

    const { checkerStatus } = CheckStatusGlobal();

    useEffect(() => {
        if (amountYouExchange && auth.contractStatusData) {
            onValidate();
        }
    }, [amountYouExchange]);

    const onChangeCurrencyYouExchange = (newCurrencyYouExchange: string): void => {
        onClear();
        setCurrencyYouExchange(newCurrencyYouExchange);
        const newCurrencyYouReceive: string = tokenReceive(newCurrencyYouExchange)[0];
        setCurrencyYouReceive(newCurrencyYouReceive);
        setCAIndex(getCAIndex(newCurrencyYouExchange, newCurrencyYouReceive));
    };

    const onChangeCurrencyYouReceive = (newCurrencyYouReceive: string): void => {
        onClear();
        setCurrencyYouReceive(newCurrencyYouReceive);
        setCAIndex(getCAIndex(currencyYouExchange, newCurrencyYouReceive));
    };
    
    const handleSwapCurrencies = (): void => {
        const tempCurrency: string = currencyYouExchange;
        setCurrencyYouExchange(currencyYouReceive);
        setCurrencyYouReceive(tempCurrency);

        const tempAmount: BigNumber = amountYouExchange;
        setAmountYouExchange(amountYouReceive);
        setAmountYouReceive(tempAmount);

        const tempInputExchange: string = valueExchange;
        setValueExchange(valueReceive);
        setValueReceive(tempInputExchange);
    };
    
    const onClear = (): void => {
        setAmountYouExchange(new BigNumber(0));
        setAmountYouReceive(new BigNumber(0));
        setValueExchange("");
        setValueReceive("");
        setInputValidationError(false);
        setInputValidationErrorText("");
    };

    const onValidate = (): void => {
        // Protocol in not-good status
        const { isValid, errorType } = checkerStatus();
        if (!isValid && errorType === "1") {
            if (
                !currencyYouExchange.startsWith("TP") &&
                !currencyYouReceive.startsWith("TC")
            ) {
                setInputValidationErrorText(
                    t("exchange.errors.notOperational")
                );
                setInputValidationError(true);
                return;
            }
        }
        if (!isValid && errorType > 1 && errorType < 5) {
            setInputValidationErrorText(t("exchange.errors.cantOperate"));
            setInputValidationError(true);
            return;
        }
        if (!isValid && errorType === "5") {
            setInputValidationErrorText(t("exchange.errors.requestTimeout"));
            setInputValidationError(true);
            return;
        }

        // 0. Not Wallet connected
        if (!auth.userBalanceData) {
            setInputValidationErrorText(t("exchange.errors.connectYourWallet"));
            setInputValidationError(true);
            return;
        }

        // 0. Cannot operate
        if (!auth.contractStatusData?.canOperate) {
            setInputValidationErrorText(t("exchange.errors.cantOperate"));
            setInputValidationError(true);
            return;
        }

        // 0. Amount > 0
        if (amountYouExchange.lte(0) || amountYouReceive.lte(0)) {
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
        const totalBalance: BigNumber = new BigNumber(
            fromContractPrecisionDecimals(
                TokenBalance(auth, currencyYouExchange),
                TokenSettings(currencyYouExchange).decimals
            )
        );

        if (amountYouExchange.gt(totalBalance)) {
            setInputValidationErrorText(t("exchange.errors.notBalance"));
            setInputValidationError(true);
            return;
        }

        let tIndex: number;
        // 2. MINT TP. User receive available token in contract
        const arrCurrencyYouReceive: string[] = currencyYouReceive.split("_");
        if (arrCurrencyYouReceive[0] === "TP") {
            // There are sufficient PEGGED in the contracts to mint?
            tIndex = TokenSettings(currencyYouReceive).key;
            const tpAvailableToMint: BigNumber = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getRealTPAvailableToMint[tIndex],
                    settings.tokens.TP[tIndex].decimals
                )
            );
            if (new BigNumber(amountYouReceive).gt(tpAvailableToMint)) {
                setInputValidationErrorText(t("exchange.errors.noLiquidity"));
                setInputValidationError(true);
                return;
            }
        }

        // 3. REDEEM TC
        let arrCurrencyYouExchange: string[] = currencyYouExchange.split("_");
        if (arrCurrencyYouExchange[0] === "TC") {
            // There are sufficient TC in the contracts to redeem?
            const tcAvailableToRedeem: BigNumber = new BigNumber(
                Web3.utils.fromWei(
                    auth.contractStatusData[caIndex].getRealTCAvailableToRedeem,
                    "ether"
                )
            );
            if (new BigNumber(amountYouExchange).gt(tcAvailableToRedeem)) {
                setInputValidationErrorText(t("exchange.errors.noLiquidity"));
                setInputValidationError(true);
                return;
            }
        }

        // 4. REDEEM SUFFICIENT CA IN THE CONTRACT?
        if (arrCurrencyYouReceive[0] === "CA") {
            tIndex = TokenSettings(currencyYouReceive).key;
            // There are sufficient CA in the contract
            const caBalance: BigNumber = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getACBalance[tIndex],
                    settings.tokens.CA[tIndex].decimals
                )
            );
            if (new BigNumber(amountYouReceive).gt(caBalance)) {
                setInputValidationErrorText(t("exchange.errors.noLiquidity"));
                setInputValidationError(true);
                return;
            }
        }

        // 5. HAVE TO PAY COMMISSIONS WITH FEE TOKEN?
        const feeTokenBalance: BigNumber = new BigNumber(
            fromContractPrecisionDecimals(
                auth.userBalanceData[0].FeeToken.balance,
                settings.tokens.TF[0].decimals
            )
        );

        if (feeTokenBalance.gt(commissionFeeToken)) {
            // Set as default to pay fee with token
            setRadioSelectFeeTokenDisabled(false);
        } else {
            setRadioSelectFeeTokenDisabled(true);
        }

        // 6. MINT TP. Flux capacitor maxQACToMintTP
        if (arrCurrencyYouReceive[0] === "TP") {
            tIndex = TokenSettings(currencyYouReceive).key;
            const maxQACToMintTP: BigNumber = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].maxQACToMintTP,
                    settings.tokens.TP[tIndex].decimals
                )
            );
            if (new BigNumber(amountYouExchange).gt(maxQACToMintTP)) {
                setInputValidationErrorText(
                    t("exchange.errors.maxLimitedByProtocol")
                );
                setInputValidationError(true);
                return;
            }
        }

        // Redeem TP
        arrCurrencyYouExchange = currencyYouExchange.split("_");
        if (arrCurrencyYouExchange[0] === "TP") {

            // 7. Flux Capacitor
            tIndex = TokenSettings(currencyYouReceive).key;
            const maxQACToRedeemTP: BigNumber = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].maxQACToRedeemTP,
                    settings.tokens.TP[tIndex].decimals
                )
            );
            console.log("maxQACToRedeemTP: ", maxQACToRedeemTP.toString());
            console.log(
                "amountYouReceive: ",
                new BigNumber(amountYouReceive).toString()
            );
            if (new BigNumber(amountYouReceive).gt(maxQACToRedeemTP)) {
                setInputValidationErrorText(
                    t("exchange.errors.maxLimitedByProtocol")
                );
                setInputValidationError(true);
                return;
            }

            // 8 Available TP to redeem
            tIndex = TokenSettings(currencyYouExchange).key;
            const maxAvailableTP: BigNumber = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].pegContainer[tIndex],
                    settings.tokens.TP[tIndex].decimals
                )
            );
            if (new BigNumber(amountYouExchange).gt(maxAvailableTP)) {
                setInputValidationErrorText(
                    t("exchange.errors.insufficientTPinCA")
                );
                setInputValidationError(true);
                return;
            }

        }

        // No Validations Errors
        setInputValidationErrorText("");
        setInputValidationError(false);
    };

    const onChangeAmounts = async (amountExchange: BigNumber, amountReceive: BigNumber, source: SourceType): Promise<void> => {
        let infoFee: FeeInfo;
        let amountExchangeFee: BigNumber;
        let amountReceiveFee: BigNumber;
        let amountFormattedReceive: string;
        let amountFormattedExchange: string;
        switch (source) {
            case "exchange":
                infoFee = CalcCommission(
                    auth,
                    currencyYouExchange,
                    currencyYouReceive,
                    amountReceive,
                    false
                );
                amountExchangeFee = amountExchange;
                amountReceiveFee = amountReceive.minus(infoFee.fee);
                amountFormattedReceive = AmountToVisibleValue(
                    amountReceiveFee,
                    currencyYouReceive,
                    amountReceiveFee.lt(0.00000001) ? 12 : 8,
                    false
                );
                setValueReceive(
                    amountReceiveFee.isZero() ? "" : amountFormattedReceive
                );
                setAmountYouReceive(amountReceiveFee);
                setAmountYouExchange(amountExchangeFee);
                break;
            case "receive":
                infoFee = CalcCommission(
                    auth,
                    currencyYouExchange,
                    currencyYouReceive,
                    amountExchange,
                    false
                );
                amountExchangeFee = amountExchange.plus(infoFee.fee);
                amountReceiveFee = amountReceive;
                amountFormattedExchange = AmountToVisibleValue(
                    amountExchangeFee,
                    currencyYouExchange,
                    amountExchangeFee.lte(0.00000001) ? 12 : 8,
                    false
                );
                setAmountYouExchange(amountExchangeFee);
                setValueExchange(
                    amountExchangeFee.isZero() ? "" : amountFormattedExchange
                );
                setAmountYouReceive(amountReceiveFee);
                break;
            default:
                throw new Error("Invalid source name");
        }

        // Set exchanging total in USD
        let convertAmountUSD: BigNumber;
        if (IS_MINT) {
            infoFee = CalcCommission(
                auth,
                currencyYouExchange,
                currencyYouReceive,
                amountExchange,
                false
            );
            convertAmountUSD = amountExchangeFee;
        } else {
            infoFee = CalcCommission(
                auth,
                currencyYouExchange,
                currencyYouReceive,
                amountReceive,
                false
            );
            convertAmountUSD = amountReceiveFee;
        }

        // Commission
        setCommission(infoFee.fee.toString());
        setCommissionUSD(infoFee.feeUSD.toString());
        setCommissionPercent(infoFee.percent.toString());

        // Fee Token Commission
        setCommissionFeeToken(infoFee.totalFeeToken.toString());
        setCommissionFeeTokenUSD(infoFee.totalFeeTokenUSD.toString());
        setCommissionPercentFeeToken(infoFee.feeTokenPercent.toString());

        const priceCA: BigNumber = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].PP_CA[0],
                settings.tokens.CA[caIndex].decimals
            )
        );

        convertAmountUSD = convertAmountUSD.times(priceCA);
        setExchangingUSD(convertAmountUSD);

        const execCost: BigNumber = executionFeeMap(
            currencyYouExchange,
            currencyYouReceive,
            auth
        );

        const execFee: BigNumber = fromContractPrecisionDecimals(
            await getExecutionFee(auth.web3, execCost, 2),
            settings.tokens.COINBASE[0].decimals
        );

        const priceCoinbase: BigNumber = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData.PP_COINBASE[0],
                settings.tokens.COINBASE[0].decimals
            )
        );
        const execFeeUSD: BigNumber = execFee.times(priceCoinbase);

        // Execution fee load
        setExecutionFee(execFee);
        setExecutionFeeUSD(execFeeUSD);
    };

    const onChangeAmountYouExchange = (newAmount: string | number): void => {
        if (newAmount < 0) {
            setAmountYouExchange(new BigNumber(0));
            setAmountYouReceive(new BigNumber(0));
            setExchangingUSD(new BigNumber(0));
            setValueExchange("");
        } else {
            setValueExchange(newAmount.toString());
            const convertAmountReceive: BigNumber = ConvertAmount(
                auth,
                currencyYouExchange,
                currencyYouReceive,
                newAmount === "" ? new BigNumber(0) : new BigNumber(newAmount),
                false
            );
            onChangeAmounts(
                new BigNumber(newAmount),
                convertAmountReceive,
                "exchange"
            );
        }
    };

    const onChangeAmountYouReceive = (newAmount: string | number): void => {
        if (newAmount < 0) {
            setAmountYouExchange(new BigNumber(0));
            setAmountYouReceive(new BigNumber(0));
            setExchangingUSD(new BigNumber(0));
            setValueReceive("");
        } else {
            setValueReceive(newAmount.toString());
            const convertAmountExchange: BigNumber = ConvertAmount(
                auth,
                currencyYouReceive,
                currencyYouExchange,
                newAmount === "" ? new BigNumber(0) : new BigNumber(newAmount),
                false
            );
            onChangeAmounts(
                convertAmountExchange,
                new BigNumber(newAmount),
                "receive"
            );
        }
    };

    const setAddTotalAvailable = (): void => {
        const tokenSettings: any = TokenSettings(currencyYouExchange);
        const totalbalance: BigNumber = new BigNumber(
            fromContractPrecisionDecimals(
                TokenBalance(auth, currencyYouExchange),
                tokenSettings.decimals
            )
        );
        const convertAmountReceive: BigNumber = ConvertAmount(
            auth,
            currencyYouExchange,
            currencyYouReceive,
            totalbalance,
            false
        );
        setValueExchange(totalbalance.toFixed(8, 2));
        setAmountYouExchange(totalbalance);
        onChangeAmounts(totalbalance, convertAmountReceive, "exchange");
    };

    const onChangeFee = (e: any): void => {
        console.log("radio checked", e.target.value);
        setRadioSelectFee(e.target.value);
    };
    
    const calculateFinalAmountExchange = (): BigNumber => {
        let arrCurrencyYouExchange: string[] = currencyYouExchange.split("_");
        if (arrCurrencyYouExchange[0] === "CA") {
            const tokenSettings: any = TokenSettings(currencyYouExchange);
            const totalbalance: BigNumber = new BigNumber(
                fromContractPrecisionDecimals(
                    TokenBalance(auth, currencyYouExchange),
                    tokenSettings.decimals
                )
            );
            const tolerance: number = 0.7;
            if (amountYouExchange.gte(totalbalance)) {
                const upperLimit: BigNumber = totalbalance
                    .times(BigNumber(tolerance))
                    .div(100)
                    .plus(amountYouExchange);
                return totalbalance.minus(upperLimit.minus(totalbalance));
            } else {
                return amountYouExchange;
            }
        } else {
            return amountYouExchange;
        }
    };
    
    return (
        <div>
            <div className="sectionExchange__Content">
                <div className="inputFields">
                    <div className="tokenSelector">
                        <CurrencyPopUp
                            className="select-token"
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
                                !auth.contractStatusData?.canOperate
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: TokenBalance(
                                              auth,
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
                            className="select-token"
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
                            isDirty={false}
                            balance={
                                !auth.contractStatusData?.canOperate
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: ConvertBalance(
                                              auth,
                                              currencyYouExchange,
                                              currencyYouReceive
                                          ),
                                          token: TokenSettings(
                                              currencyYouReceive
                                          ),
                                          decimals: 8,
                                          i18n: i18n,
                                          skipContractConvert: true,
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
                                        {!auth.contractStatusData?.canOperate
                                            ? "--"
                                            : PrecisionNumbers({
                                                  amount: ConvertAmount(
                                                      auth,
                                                      currencyYouExchange,
                                                      currencyYouReceive,
                                                      1,
                                                      false
                                                  ),
                                                  decimals: TokenSettings(
                                                      currencyYouReceive
                                                  ).visiblePriceUSD,
                                                  token: TokenSettings(
                                                      currencyYouReceive
                                                  ),
                                                  i18n: i18n,
                                                  skipContractConvert: true,
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
                                        {!auth.contractStatusData?.canOperate
                                            ? "--"
                                            : PrecisionNumbers({
                                                  amount: ConvertAmount(
                                                      auth,
                                                      currencyYouReceive,
                                                      currencyYouExchange,
                                                      1,
                                                      false
                                                  ),
                                                  decimals: TokenSettings(
                                                      currencyYouExchange
                                                  ).visiblePriceUSD,
                                                  token: TokenSettings(
                                                      currencyYouExchange
                                                  ),
                                                  i18n: i18n,
                                                  skipContractConvert: true,
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
                                                    {!auth.contractStatusData
                                                        ?.canOperate
                                                        ? "--"
                                                        : PrecisionNumbers({
                                                              amount: new BigNumber(
                                                                  commissionPercent
                                                              ),
                                                              token: TokenSettings(
                                                                  currencyYouExchange
                                                              ),
                                                              decimals: 2,
                                                              i18n: i18n,
                                                              skipContractConvert: true,
                                                          })}
                                                    %)
                                                </span>
                                                <span className={""}> ≈ </span>
                                                <span className={""}>
                                                    {!auth.contractStatusData
                                                        ?.canOperate
                                                        ? "--"
                                                        : PrecisionNumbers({
                                                              amount: new BigNumber(
                                                                  commission
                                                              ),
                                                              token: TokenSettings(
                                                                  `CA_${caIndex}`
                                                              ),
                                                              i18n: i18n,
                                                              skipContractConvert: true,
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
                                                    {!auth.contractStatusData
                                                        ?.canOperate
                                                        ? "--"
                                                        : PrecisionNumbers({
                                                              amount: new BigNumber(
                                                                  commissionUSD
                                                              ),
                                                              decimals: 2,
                                                              token: TokenSettings(
                                                                  `CA_${caIndex}`
                                                              ),
                                                              i18n: i18n,
                                                              isUSD: true,
                                                              skipContractConvert: true,
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
                                                    {!auth.contractStatusData
                                                        ?.canOperate
                                                        ? "--"
                                                        : PrecisionNumbers({
                                                              amount: new BigNumber(
                                                                  commissionPercentFeeToken
                                                              ),
                                                              token: TokenSettings(
                                                                  currencyYouExchange
                                                              ),
                                                              decimals: 2,
                                                              i18n: i18n,
                                                              skipContractConvert: true,
                                                          })}
                                                    %)
                                                </span>
                                                <span className={""}> ≈ </span>
                                                <span className={""}>
                                                    {!auth.contractStatusData
                                                        ?.canOperate
                                                        ? "--"
                                                        : PrecisionNumbers({
                                                              amount: new BigNumber(
                                                                  commissionFeeToken
                                                              ),
                                                              token: TokenSettings(
                                                                  `TF_${caIndex}`
                                                              ),
                                                              i18n: i18n,
                                                              skipContractConvert: true,
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
                                                    {!auth.contractStatusData
                                                        ?.canOperate
                                                        ? "--"
                                                        : PrecisionNumbers({
                                                              amount: new BigNumber(
                                                                  commissionFeeTokenUSD
                                                              ),
                                                              decimals: 2,
                                                              token: TokenSettings(
                                                                  `CA_${caIndex}`
                                                              ),
                                                              i18n: i18n,
                                                              isUSD: true,
                                                              skipContractConvert: true,
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
                        </div>
                    </div>
                </div>{" "}
            </div>
            <div className="cta-container">
                <div className="cta-info-group">
                    <div className="cta-info-summary">
                        {t("exchange.exchangingSummary")}

                        <div className={""}> ≈ </div>
                        {exchangingUSD.toString() !== "NaN" ? (
                            <div className={""}>
                                {!auth.contractStatusData?.canOperate
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: exchangingUSD,
                                          token: TokenSettings(`CA_${caIndex}`),
                                          decimals: 2,
                                          i18n: i18n,
                                          skipContractConvert: true,
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
                        onClear={onClear}
                        inputValidationError={inputValidationError}
                        executionFee={executionFee}
                        executionFeeUSD={executionFeeUSD}
                        commissionFeeToken={commissionFeeToken}
                        commissionFeeTokenUSD={commissionFeeTokenUSD}
                        commissionPercentFeeToken={commissionPercentFeeToken}
                        radioSelectFee={radioSelectFee}
                        caIndex={caIndex}
                        //amountYouExchangeFee={amountYouExchangeFee}
                        //amountYouReceiveFee={amountYouReceiveFee}
                    />
                </div>
            </div>
        </div>
    );
}
