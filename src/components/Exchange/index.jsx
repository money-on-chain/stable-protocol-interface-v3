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
import CheckStatus from "../../helpers/checkStatus";

export default function Exchange() {
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    const defaultTokenExchange = tokenExchange()[0];
    const defaultTokenReceive = tokenReceive(defaultTokenExchange)[0];

    const [currencyYouExchange, setCurrencyYouExchange] =
        useState(defaultTokenExchange);
    const [currencyYouReceive, setCurrencyYouReceive] =
        useState(defaultTokenReceive);

    const [amountYouExchange, setAmountYouExchange] = useState(
        new BigNumber(0)
    );
    const [amountYouReceive, setAmountYouReceive] = useState(new BigNumber(0));

    //const [isDirtyYouExchange, setIsDirtyYouExchange] = useState(false);
    //const [isDirtyYouReceive, setIsDirtyYouReceive] = useState(false);

    const [commission, setCommission] = useState("0.0");
    const [commissionUSD, setCommissionUSD] = useState("0.0");
    const [commissionPercent, setCommissionPercent] = useState("0.0");

    const [commissionFeeToken, setCommissionFeeToken] = useState("0.0");
    const [commissionFeeTokenUSD, setCommissionFeeTokenUSD] = useState("0.0");
    const [commissionPercentFeeToken, setCommissionPercentFeeToken] =
        useState("0.0");

    const [executionFee, setExecutionFee] = useState(new BigNumber(0));

    const [exchangingUSD, setExchangingUSD] = useState(new BigNumber(0));

    const [inputValidationErrorText, setInputValidationErrorText] =
        useState("");
    const [inputValidationError, setInputValidationError] = useState(false);

    const IS_MINT = isMintOperation(currencyYouExchange, currencyYouReceive);

    const [radioSelectFee, setRadioSelectFee] = useState(0);
    const [radioSelectFeeTokenDisabled, setRadioSelectFeeTokenDisabled] =
        useState(true);

    const [valueExchange, setValueExchange] = useState("");
    const [valueReceive, setValueReceive] = useState("");
    const [caIndex, setCAIndex] = useState(0);

    const { checkerStatus } = CheckStatus({caIndex: 0});

    useEffect(() => {
        if (amountYouExchange && auth.contractStatusData) {
            onValidate();
        }
    }, [amountYouExchange]);

    const onChangeCurrencyYouExchange = (newCurrencyYouExchange) => {
        onClear();
        setCurrencyYouExchange(newCurrencyYouExchange);
        const newCurrencyYouReceive = tokenReceive(newCurrencyYouExchange)[0]
        setCurrencyYouReceive(newCurrencyYouReceive);
        setCAIndex(getCAIndex(newCurrencyYouExchange, newCurrencyYouReceive));
    };

    const onChangeCurrencyYouReceive = (newCurrencyYouReceive) => {
        onClear();
        setCurrencyYouReceive(newCurrencyYouReceive);
        setCAIndex(getCAIndex(currencyYouExchange, newCurrencyYouReceive));
    };
    const handleSwapCurrencies = () => {
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
    const onClear = () => {
        setAmountYouExchange(new BigNumber(0));
        setAmountYouReceive(new BigNumber(0));
        setValueExchange("");
        setValueReceive("");
        setInputValidationError(false);
        setInputValidationErrorText("");
    };

    const onValidate = () => {
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
        const totalBalance = new BigNumber(
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

        let tIndex;
        // 2. MINT TP. User receive available token in contract
        const arrCurrencyYouReceive = currencyYouReceive.split("_");
        if (arrCurrencyYouReceive[0] === "TP") {
            // There are sufficient PEGGED in the contracts to mint?
            tIndex = TokenSettings(currencyYouReceive).key;
            const tpAvailableToMint = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getTPAvailableToMint[tIndex],
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
        let arrCurrencyYouExchange = currencyYouExchange.split("_");
        if (arrCurrencyYouExchange[0] === "TC") {
            // There are sufficient TC in the contracts to redeem?
            const tcAvailableToRedeem = new BigNumber(
                Web3.utils.fromWei(
                    auth.contractStatusData[caIndex].getTCAvailableToRedeem,
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
            const caBalance = new BigNumber(
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
        const feeTokenBalance = new BigNumber(
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
            const maxQACToMintTP = new BigNumber(
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
            const maxQACToRedeemTP = new BigNumber(
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
            const maxAvailableTP = new BigNumber(
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

    const onChangeAmounts = (amountExchange, amountReceive, source) => {
        let infoFee;
        let amountExchangeFee;
        let amountReceiveFee;
        let amountFormattedReceive;
        let amountFormattedExchange;
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
        let convertAmountUSD;
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
        setCommission(infoFee.fee);
        setCommissionUSD(infoFee.feeUSD);
        setCommissionPercent(infoFee.percent);

        // Fee Token Commission
        setCommissionFeeToken(infoFee.totalFeeToken);
        setCommissionFeeTokenUSD(infoFee.totalFeeTokenUSD);
        setCommissionPercentFeeToken(infoFee.feeTokenPercent);

        const priceCA = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].PP_CA[0],
                settings.tokens.CA[caIndex].decimals
            )
        );

        convertAmountUSD = convertAmountUSD.times(priceCA);
        setExchangingUSD(convertAmountUSD);

        // Execution fee load
        setExecutionFee(
            new BigNumber(
                fromContractPrecisionDecimals(
                    executionFeeMap(
                        currencyYouExchange,
                        currencyYouReceive,
                        auth
                    ),
                    settings.tokens.COINBASE[0].decimals
                )
            )
        );
    };

    const onChangeAmountYouExchange = (newAmount) => {
        if (newAmount < 0) {
            setAmountYouExchange(new BigNumber(0));
            setAmountYouReceive(new BigNumber(0));
            setExchangingUSD(new BigNumber(0));
            setValueExchange("");
        } else {
            setValueExchange(newAmount);
            const convertAmountReceive = ConvertAmount(
                auth,
                currencyYouExchange,
                currencyYouReceive,
                newAmount === "" ? new BigNumber(0) : newAmount,
                false
            );
            onChangeAmounts(
                new BigNumber(newAmount),
                convertAmountReceive,
                "exchange"
            );
        }
    };

    const onChangeAmountYouReceive = (newAmount) => {
        if (newAmount < 0) {
            setAmountYouExchange(new BigNumber(0));
            setAmountYouReceive(new BigNumber(0));
            setExchangingUSD(new BigNumber(0));
            setValueReceive("");
        } else {
            setValueReceive(newAmount);
            const convertAmountExchange = ConvertAmount(
                auth,
                currencyYouReceive,
                currencyYouExchange,
                newAmount === "" ? new BigNumber(0) : newAmount,
                false
            );
            onChangeAmounts(
                convertAmountExchange,
                new BigNumber(newAmount),
                "receive"
            );
        }
    };

    const setAddTotalAvailable = () => {
        const tokenSettings = TokenSettings(currencyYouExchange);
        const totalbalance = new BigNumber(
            fromContractPrecisionDecimals(
                TokenBalance(auth, currencyYouExchange),
                tokenSettings.decimals
            )
        );
        const convertAmountReceive = ConvertAmount(
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

    const onChangeFee = (e) => {
        console.log("radio checked", e.target.value);
        setRadioSelectFee(e.target.value);
    };
    const calculateFinalAmountExchange = () => {

        let arrCurrencyYouExchange = currencyYouExchange.split("_");
        if (arrCurrencyYouExchange[0] === "CA") {
            const tokenSettings = TokenSettings(currencyYouExchange);
            const totalbalance = new BigNumber(
                fromContractPrecisionDecimals(
                    TokenBalance(auth, currencyYouExchange),
                    tokenSettings.decimals
                )
            );
            const tolerance = 0.7;
            if (amountYouExchange.gte(totalbalance)) {
                const upperLimit = totalbalance
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
