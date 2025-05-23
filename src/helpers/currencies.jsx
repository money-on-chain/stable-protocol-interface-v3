import React from "react";
import BigNumber from "bignumber.js";

import LogoIconCA_0 from "../assets/tokens/ca_0.svg?react";
import LogoIconCA_1 from "../assets/tokens/ca_1.svg?react";
import LogoIconCOINBASE from "../assets/tokens/coinbase.svg?react";
import LogoIconTC_0 from "../assets/tokens/tc_0.svg?react";
import LogoIconTC_1 from "../assets/tokens/tc_1.svg?react";
import LogoIconTP_0 from "../assets/tokens/tp_0.svg?react";
import LogoIconTP_1 from "../assets/tokens/tp_1.svg?react";
import LogoIconTG_0 from "../assets/tokens/tg_0.svg?react";
import settings from "../settings/settings.json";
import { fromContractPrecisionDecimals } from "./Formats";

const currencies = [
    {
        value: "COINBASE",
        image: <LogoIconCOINBASE className="token__icon" />,
    },
    { value: "CA_0", image: <LogoIconCA_0 className="token__icon" /> },
    { value: "CA_1", image: <LogoIconCA_1 className="token__icon" /> },
    { value: "TC_0", image: <LogoIconTC_0 className="token__icon" /> },
    { value: "TC_1", image: <LogoIconTC_1 className="token__icon" /> },
    { value: "TP_0", image: <LogoIconTP_0 className="token__icon" /> },
    { value: "TP_1", image: <LogoIconTP_1 className="token__icon" /> },
    { value: "TF", image: <LogoIconTG_0 className="token__icon" /> },
    { value: "TG", image: <LogoIconTG_0 className="token__icon" /> },
].map((it) => ({
    ...it,
}));

const getCurrenciesDetail = () => currencies;

function TokenSettings(tokenName) {
    // Ex. tokenName = CA_0, CA_1, TP_0, TP_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    const aTokenName = tokenName.split("_");
    let token = settings.tokens.CA[0];
    switch (aTokenName[0]) {
        case "CA":
            token = settings.tokens.CA[parseInt(aTokenName[1])];
            break;
        case "TP":
            token = settings.tokens.TP[parseInt(aTokenName[1])];
            break;
        case "TC":
            token = settings.tokens.TC[parseInt(aTokenName[1])];
            break;
        case "COINBASE":
            token = settings.tokens.COINBASE[0];
            break;
        case "TF":
            token = settings.tokens.TF[parseInt(aTokenName[1])];
            break;
        case "TG":
            token = settings.tokens.TG[parseInt(aTokenName[1])];
            break;
        default:
            throw new Error("Invalid token name");
    }

    return token;
}

function TokenBalance(auth, tokenName) {
    // Ex. tokenName = CA_0, CA_1, TP_0, TP_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    let balance = 0;

    if (!auth.userBalanceData) return balance;

    const aTokenName = tokenName.split("_");
    switch (aTokenName[0]) {
        case "CA":
            balance = auth.userBalanceData.CA[parseInt(aTokenName[1])].balance;
            break;
        case "TP":
            balance = auth.userBalanceData.TP[0][parseInt(aTokenName[1])].balance;
            break;
        case "TC":
            balance = auth.userBalanceData[parseInt(aTokenName[1])].TC.balance;
            break;
        case "COINBASE":
            balance = auth.userBalanceData.coinbase;
            break;
        case "TF":
            balance = auth.userBalanceData[parseInt(aTokenName[1])].FeeToken.balance;
            break;
        case "TG":
            balance = auth.userBalanceData.TG.balance;
            break;
        default:
            throw new Error("Invalid token name");
    }

    return balance;
}

function ConvertPeggedTokenPrice(auth, caIndex, tpIndex, price) {
    if (settings.tokens.TP[tpIndex].peggedUSD) {
        return price;
    } else {
        const priceCA = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].PP_CA[0],
                settings.tokens.CA[caIndex].decimals
            )
        );
        return price.div(priceCA);
    }
}

function hasNonUSDPeggedTokens() {
    let has = false;
    for (let i = 0; i < settings.tokens.TP.length; i++) {
        if (!settings.tokens.TP[i]["peggedUSD"]) has = true;
    }

    return has;
}

function ConvertBalance(auth, tokenExchange, tokenReceive) {
    const rawAmount = TokenBalance(auth, tokenExchange);
    return ConvertAmount(auth, tokenExchange, tokenReceive, rawAmount);
}

function ConvertAmount(
    auth,
    tokenExchange,
    tokenReceive,
    rawAmount,
    amountInWei = true
) {

    const caIndex = getCAIndex(tokenExchange, tokenReceive)
    const tokenExchangeSettings = TokenSettings(tokenExchange);
    const tokenReceiveSettings = TokenSettings(tokenReceive);

    let price = new BigNumber(0);

    let amount;
    if (amountInWei) {
        amount = new BigNumber(
            fromContractPrecisionDecimals(
                rawAmount,
                tokenReceiveSettings.decimals
            )
        );
    } else {
        amount = new BigNumber(rawAmount);
    }

    let cAmount = new BigNumber(0);

    // [tokenExchange,tokenReceive]
    //const tokenMap = `${tokenExchange},${tokenReceive}`;
    const aTokenExchange = tokenExchange.split("_");
    const aTokenReceive = tokenReceive.split("_");
    const aTokenMap = `${aTokenExchange[0]},${aTokenReceive[0]}`;

    switch (aTokenMap) {
        case "CA,TC":
            price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getPTCac,
                    tokenReceiveSettings.decimals
                )
            );
            cAmount = amount.div(price);
            break;
        case "TP,CA":
            // Redeem Operation
            price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].PP_TP[parseInt(aTokenExchange[1])][0],
                    tokenExchangeSettings.decimals
                )
            );
            cAmount = amount.div(price);
            break;
        case "CA,TP":
            // Mint Operation
            price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].PP_TP[parseInt(aTokenReceive[1])][0],
                    tokenReceiveSettings.decimals
                )
            );
            cAmount = amount.times(price);
            break;
        case "TC,CA":
            // Redeem Operation
            price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getPTCac,
                    tokenExchangeSettings.decimals
                )
            );
            cAmount = amount.times(price);
            break;
        case "TG,CA":
            // TG
            price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].PP_FeeToken[0],
                    tokenExchangeSettings.decimals
                )
            );
            cAmount = amount.times(price);
            break;
        case "COINBASE,CA":
            // COINBASE
            price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData.PP_COINBASE[0],
                    tokenExchangeSettings.decimals
                )
            );
            cAmount = amount.times(price);
            break;
        case "CA,CA":
            cAmount = amount;
            break;
        default:
            throw new Error("Invalid token name");
    }

    return cAmount;
}

//const precision = (contractDecimals) =>
//    new BigNumber(10).exponentiatedBy(contractDecimals);

const AmountToVisibleValue = (
    rawAmount,
    tokenName,
    decimals,
    amountInWei = true
) => {
    const tokenSettings = TokenSettings(tokenName);

    let amount;
    if (amountInWei) {
        amount = new BigNumber(
            fromContractPrecisionDecimals(rawAmount, tokenSettings.decimals)
        );
    } else {
        amount = new BigNumber(rawAmount);
    }
    return amount.toFormat(decimals, BigNumber.ROUND_DOWN, {
        decimalSeparator: ".",
        groupSeparator: ",",
    });
};

const getCAIndex = (
    tokenExchange,
    tokenReceive
) => {
    const aTokenExchange = tokenExchange.split("_");
    const aTokenReceive = tokenReceive.split("_");
    const aTokenMap = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    let index = 0;

    switch (aTokenMap) {
        case "CA,TC":
            index = parseInt(aTokenExchange[1])
            break;
        case "TP,CA":
            index = parseInt(aTokenReceive[1])
            break;
        case "CA,TP":
            index = parseInt(aTokenExchange[1])
            break;
        case "TC,CA":
            index = parseInt(aTokenReceive[1])
            break;
        case "COINBASE,CA":
            index = parseInt(aTokenReceive[1])
            break;
        case "CA,CA":
            index = parseInt(aTokenReceive[1])
            break;
        default:
            throw new Error("Invalid map getCAIndex");
    }
    return index
};

function CalcCommission(
    auth,
    tokenExchange,
    tokenReceive,
    rawAmount,
    amountInWei = true
) {
    // Calc commissions

    const tokenExchangeSettings = TokenSettings(tokenExchange);
    const tokenReceiveSettings = TokenSettings(tokenReceive);

    let amount;
    if (amountInWei) {
        amount = new BigNumber(
            fromContractPrecisionDecimals(
                rawAmount,
                tokenExchangeSettings.decimals
            )
        );
    } else {
        amount = new BigNumber(rawAmount);
    }

    let feeParam;

    //const tokenMap = `${tokenExchange},${tokenReceive}`;
    const aTokenExchange = tokenExchange.split("_");
    const aTokenReceive = tokenReceive.split("_");
    const aTokenMap = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    const caIndex = getCAIndex(tokenExchange, tokenReceive);

    switch (aTokenMap) {
        case "CA,TC":
            // Mint TC
            feeParam = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].tcMintFee,
                    tokenReceiveSettings.decimals
                )
            );
            break;
        case "TP,CA":
            // Redeem TP
            feeParam = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].tpRedeemFees[
                        parseInt(aTokenExchange[1])
                    ],
                    tokenReceiveSettings.decimals
                )
            );
            break;
        case "CA,TP":
            // Mint TP
            feeParam = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].tpMintFees[
                        parseInt(aTokenReceive[1])
                    ],
                    tokenReceiveSettings.decimals
                )
            );
            break;
        case "TC,CA":
            // Redeem TC
            feeParam = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].tcRedeemFee,
                    tokenReceiveSettings.decimals
                )
            );
            break;
        default:
            throw new Error("Invalid token name");
    }

    // Fee Paying with Token
    const feeTokenPrice = new BigNumber(
        fromContractPrecisionDecimals(
            auth.contractStatusData[caIndex].PP_FeeToken[0],
            tokenReceiveSettings.decimals
        )
    );
    const feeTokenPct = new BigNumber(
        fromContractPrecisionDecimals(
            auth.contractStatusData[caIndex].feeTokenPct,
            tokenReceiveSettings.decimals
        )
    );
    const priceCA = new BigNumber(
        fromContractPrecisionDecimals(
            auth.contractStatusData[caIndex].PP_CA[0],
            settings.tokens.CA[caIndex].decimals
        )
    );
    const qFeeToken = amount.times(feeParam.times(feeTokenPct));

    // Markup Vendors
    const vendorMarkup = new BigNumber(
        fromContractPrecisionDecimals(
            auth.contractStatusData[caIndex].vendorMarkup,
            tokenReceiveSettings.decimals
        )
    );
    const markOperation = amount.times(vendorMarkup);

    // Total fee token
    const totalFeeToken = qFeeToken.plus(markOperation);

    const feeInfo = {
        fee: amount.times(feeParam).plus(markOperation),
        feeUSD: amount.times(feeParam).plus(markOperation).times(priceCA),
        percent: feeParam.plus(vendorMarkup).times(100),
        markup: vendorMarkup,
        markOperation: markOperation,
        feeTokenPrice: feeTokenPrice,
        feeTokenPct: feeTokenPct,
        totalFeeToken: totalFeeToken.div(feeTokenPrice),
        totalFeeTokenUSD: totalFeeToken.times(priceCA),
        feeTokenPercent: feeParam
            .times(feeTokenPct)
            .plus(vendorMarkup)
            .times(100),
    };

    return feeInfo;
}

export {
    getCurrenciesDetail,
    TokenSettings,
    TokenBalance,
    ConvertBalance,
    ConvertAmount,
    AmountToVisibleValue,
    CalcCommission,
    ConvertPeggedTokenPrice,
    hasNonUSDPeggedTokens,
    getCAIndex
};
