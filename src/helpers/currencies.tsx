import React from "react";

import LogoIconCA_0 from "../assets/tokens/ca_0.svg?react";
import LogoIconCA_1 from "../assets/tokens/ca_1.svg?react";
import LogoIconCOINBASE from "../assets/tokens/coinbase.svg?react";
import LogoIconTC_0 from "../assets/tokens/tc_0.svg?react";
import LogoIconTC_1 from "../assets/tokens/tc_1.svg?react";
import LogoIconTG_0 from "../assets/tokens/tg_0.svg?react";
import LogoIconTP_0 from "../assets/tokens/tp_0.svg?react";
import LogoIconTP_1 from "../assets/tokens/tp_1.svg?react";
import LogoIconTPCA_0_0 from "../assets/tokens/tpca_0_0.svg?react";
import LogoIconTPCA_0_1 from "../assets/tokens/tpca_0_1.svg?react";
import LogoIconTPCA_1_0 from "../assets/tokens/tpca_1_0.svg?react";
import LogoIconTPCA_1_1 from "../assets/tokens/tpca_1_1.svg?react";
import settings from "../settings/settings.json";
import type { TokenConfig } from "../types/hooks";
import type {
    ContractProtocolStatusResult,
    UserBalanceResult,
    UserOmocBalanceResult,
} from "../types/status";
import {
    divPrecision,
    fromWei,
    mulPrecision,
    normalizeToBigInt,
} from "./precision";

interface Currency {
    value: string;
    image: React.ReactElement;
}

interface FeeInfo {
    fee: bigint;
    feeUSD: bigint;
    percent: bigint;
    markup: bigint;
    markOperation: bigint;
    feeTokenPrice: bigint;
    feeTokenPct: bigint;
    totalFeeToken: bigint;
    totalFeeTokenUSD: bigint;
    feeTokenPercent: bigint;
}

const currencies: Currency[] = [
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
    { value: "TPCA_0_0", image: <LogoIconTPCA_0_0 className="token__icon" /> },
    { value: "TPCA_0_1", image: <LogoIconTPCA_0_1 className="token__icon" /> },
    { value: "TPCA_1_0", image: <LogoIconTPCA_1_0 className="token__icon" /> },
    { value: "TPCA_1_1", image: <LogoIconTPCA_1_1 className="token__icon" /> },
    { value: "TF", image: <LogoIconTG_0 className="token__icon" /> },
    { value: "TG", image: <LogoIconTG_0 className="token__icon" /> },
].map((it) => ({
    ...it,
}));

const getCurrenciesDetail = (): Currency[] => currencies;

const getCurrencyByValue = (value: string): Currency => {
    const currency = currencies.find((currency) => currency.value === value);
    if (!currency) throw new Error("Currency not found");
    return currency;
};

function getTCTokenIndex(
    collateralTokens: { address: string }[],
    tokenAddress: string
): number {
    const tcIndex = collateralTokens.findIndex(
        (token) => token.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (tcIndex !== -1) {
        return tcIndex;
    }

    throw new Error("Token address not found");
}

function TokenSettings(tokenName: string): TokenConfig {
    // Ex. tokenName = CA_0, CA_1, TP_0, TP_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    const aTokenName = tokenName.split("_");
    let token: TokenConfig = settings.tokens.CA[0];
    switch (aTokenName[0]) {
        case "CA":
            token = settings.tokens.CA[parseInt(aTokenName[1])];
            break;
        case "TP":
        case "TPCA":
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
            token = settings.tokens.TG[0];
            break;
        default:
            throw new Error("Invalid token name");
    }

    return token;
}

function TokenBalance(
    userBalance: UserBalanceResult,
    tokenName: string,
    userBaseCoinBalance: { balance: bigint } | undefined = undefined,
    userOmocBalance: UserOmocBalanceResult | undefined = undefined
): bigint {
    // Ex. tokenName = CA_0, CA_1, TP_0, TP_1, TPCA_0_0, TPCA_0_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    let balance = 0n;

    if (!userBalance || !userBalance.data) return 0n;

    const aTokenName = tokenName.split("_");
    switch (aTokenName[0]) {
        case "CA":
            balance =
                userBalance.data?.CA?.[parseInt(aTokenName[1])]?.balance || 0n;
            break;
        case "TP":
        case "TPCA":
            balance =
                userBalance.data?.TP?.[0]?.[parseInt(aTokenName[1])]?.balance ||
                0n;
            break;
        case "TC":
            balance =
                userBalance.data?.[parseInt(aTokenName[1])]?.TC?.balance || 0n;
            break;
        case "COINBASE":
            balance = userBaseCoinBalance?.balance || 0n;
            break;
        case "TF":
            balance =
                userBalance.data?.[parseInt(aTokenName[1])]?.FeeToken
                    ?.balance || 0n;
            break;
        case "TG":
            balance = (userOmocBalance?.data?.TG?.balance as bigint) || 0n;
            break;
        default:
            throw new Error("Invalid token name");
    }

    return balance;
}

function ConvertPeggedTokenPrice(
    contractProtocolStatus: ContractProtocolStatusResult,
    caIndex: number,
    tpIndex: number,
    price: bigint,
    inverted: boolean = false
): bigint {
    if (settings.tokens.TP[tpIndex].peggedUSD) {
        return price;
    } else {
        const priceCA =
            normalizeToBigInt(
                contractProtocolStatus.data?.[caIndex]?.PP_CA?.[0] || 0n
            ) || 0n;
        return inverted
            ? price === 0n
                ? 0n
                : divPrecision(1000000000000000000n, price)
            : priceCA === 0n
              ? 0n
              : divPrecision(price, priceCA);
    }
}

function hasNonUSDPeggedTokens(): boolean {
    let has = false;
    for (let i = 0; i < settings.tokens.TP.length; i++) {
        if (!settings.tokens.TP[i]["peggedUSD"]) has = true;
    }

    return has;
}

function ConvertBalance(
    contractProtocolStatus: ContractProtocolStatusResult,
    userBalance: UserBalanceResult,
    tokenExchange: string,
    tokenReceive: string
): bigint {
    const rawAmount = TokenBalance(userBalance, tokenExchange);
    return ConvertAmount(
        contractProtocolStatus,
        tokenExchange,
        tokenReceive,
        rawAmount
    );
}

function ConvertAmount(
    contractProtocolStatus: ContractProtocolStatusResult,
    tokenExchange: string,
    tokenReceive: string,
    amount: bigint
): bigint {
    const caIndex = getCAIndex(tokenExchange, tokenReceive);

    let price = 0n;
    let cAmount = 0n;
    let price_from = 0n;
    let price_to = 0n;

    const aTokenExchange = tokenExchange.split("_");
    const aTokenReceive = tokenReceive.split("_");
    const aTokenMap = `${aTokenExchange[0]},${aTokenReceive[0]}`;

    switch (aTokenMap) {
        case "CA,TC":
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.getPTCac || 0n
                ) || 0n;
            cAmount = price === 0n ? 0n : divPrecision(amount, price);
            break;
        case "TP,CA":
            // Redeem Operation
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_TP?.[
                        parseInt(aTokenExchange[1])
                    ]?.[0] || 0n
                ) || 0n;
            cAmount = price === 0n ? 0n : divPrecision(amount, price);
            break;
        case "TP,TP":
        case "TP,TPCA":    
        case "TPCA,TP":
            // Swap Operation
            price_from =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_TP?.[
                        parseInt(aTokenExchange[1])
                    ]?.[0] || 0n
                ) || 0n;
            price_to =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_TP?.[
                        parseInt(aTokenReceive[1])
                    ]?.[0] || 0n
                ) || 0n;    
            cAmount = price_from === 0n || price_to === 0n ? 0n : divPrecision(mulPrecision(amount, price_to), price_from);
            break;
        case "CA,TP":
            // Mint Operation
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_TP?.[
                        parseInt(aTokenReceive[1])
                    ]?.[0] || 0n
                ) || 0n;
            cAmount = mulPrecision(amount, price);
            break;
        case "TC,CA":
            // Redeem Operation
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.getPTCac || 0n
                ) || 0n;
            cAmount = mulPrecision(amount, price);
            break;
        case "TG,CA":
            // TG
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_FeeToken?.[0] ||
                        0n
                ) || 0n;
            cAmount = mulPrecision(amount, price);
            break;
        case "COINBASE,CA":
            // COINBASE
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.PP_COINBASE[0] || 0n
                ) || 0n;
            cAmount = mulPrecision(amount, price);
            break;
        case "CA,CA":
            cAmount = amount;
            break;
        default:
            throw new Error("Invalid token name");
    }

    return cAmount;
}

const bigIntToInputValue = (
    rawAmount: bigint,
    tokenName: string,
    decimals: number
): string => {
    if (typeof rawAmount !== "bigint") {
        console.warn("❌ amount must be bigint:", rawAmount);
        return "Error";
    }

    const tokenSettings = TokenSettings(tokenName);
    const amount = Number(fromWei(rawAmount, tokenSettings.decimals));

    // Round down to the desired number of decimals
    const factor = Math.pow(10, decimals);
    const floored = Math.floor(amount * factor) / factor;

    // Use toFixed to ensure fixed-point notation, then remove trailing zeros
    return floored.toFixed(decimals).replace(/\.?0+$/, ""); // remove unnecessary trailing zeros and dot if needed
};

const getCAIndex = (tokenExchange: string, tokenReceive: string): number => {
    const aTokenExchange = tokenExchange.split("_");
    const aTokenReceive = tokenReceive.split("_");
    const aTokenMap = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    let index = 0;
    
    switch (aTokenMap) {
        case "CA,TC":
            index = parseInt(aTokenExchange[1]);
            break;
        case "TP,CA":
            index = parseInt(aTokenReceive[1]);
            break;
        case "TP,TP":
            index = 0; // TODO: Change to the correct index
            break;
        case "TP,TPCA":
            // TP_i -> TPCA_i_j i=TP Index, j=CA Index
            index = parseInt(aTokenReceive[2]);
            break;    
        case "TPCA,TP":
            // TPCA_i_j -> TP_i i=TP Index, j=CA Index
            index = parseInt(aTokenExchange[2]);
            break;    
        case "CA,TP":
            index = parseInt(aTokenExchange[1]);
            break;
        case "TC,CA":
            index = parseInt(aTokenReceive[1]);
            break;
        case "COINBASE,CA":
            index = parseInt(aTokenReceive[1]);
            break;
        case "CA,CA":
            index = parseInt(aTokenReceive[1]);
            break;
        default:
            throw new Error("Invalid map getCAIndex");
    }
    return index;
};

function CalcCommission(
    contractProtocolStatus: ContractProtocolStatusResult,
    tokenExchange: string,
    tokenReceive: string,
    rawAmount: bigint
): FeeInfo {
    const amount: bigint = rawAmount;

    let feeParam: bigint;

    const aTokenExchange = tokenExchange.split("_");
    const aTokenReceive = tokenReceive.split("_");
    const aTokenMap = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    const caIndex = getCAIndex(tokenExchange, tokenReceive);

    switch (aTokenMap) {
        case "CA,TC":
            // Mint TC
            feeParam = contractProtocolStatus.data?.[caIndex].tcMintFee || 0n;
            break;
        case "TP,CA":
            // Redeem TP
            feeParam =
                contractProtocolStatus.data?.[caIndex].tpRedeemFees[
                    parseInt(aTokenExchange[1])
                ] || 0n;
            break;
        case "CA,TP":
            // Mint TP
            feeParam =
                contractProtocolStatus.data?.[caIndex].tpMintFees[
                    parseInt(aTokenReceive[1])
                ] || 0n;
            break;
        case "TC,CA":
            // Redeem TC
            feeParam = contractProtocolStatus.data?.[caIndex].tcRedeemFee || 0n;
            break;
        case "TP,TP":
        case "TP,TPCA":
            // Swap TP
            feeParam =
                contractProtocolStatus.data?.[caIndex].swapTPforTPFee || 0n;
            break;    
        default:
            throw new Error("Invalid token name");
    }

    // Fee Paying with Token
    const feeTokenPrice =
        normalizeToBigInt(
            contractProtocolStatus.data?.[caIndex]?.PP_FeeToken?.[0] || 0n
        ) || 0n;
    const feeTokenPct =
        contractProtocolStatus.data?.[caIndex]?.feeTokenPct || 0n;
    const priceCA =
        normalizeToBigInt(
            contractProtocolStatus.data?.[caIndex]?.PP_CA?.[0] || 0n
        ) || 0n;
    const qFeeToken = mulPrecision(amount, mulPrecision(feeParam, feeTokenPct));

    // Markup Vendors
    const vendorMarkup =
        contractProtocolStatus.data?.[caIndex].vendorMarkup || 0n;
    const markOperation = mulPrecision(amount, vendorMarkup);

    // Total fee token
    const totalFeeToken = qFeeToken + markOperation;

    const feeInfo: FeeInfo = {
        fee: mulPrecision(amount, feeParam) + markOperation,
        feeUSD: mulPrecision(
            mulPrecision(amount, feeParam) + markOperation,
            priceCA || 0n
        ),
        percent: (feeParam + vendorMarkup) * 100n,
        markup: vendorMarkup,
        markOperation: markOperation,
        feeTokenPrice: feeTokenPrice,
        feeTokenPct: feeTokenPct,
        totalFeeToken:
            feeTokenPrice === 0n
                ? 0n
                : divPrecision(totalFeeToken, feeTokenPrice),
        totalFeeTokenUSD: mulPrecision(totalFeeToken, priceCA),
        feeTokenPercent:
            (mulPrecision(feeParam, feeTokenPct) + vendorMarkup) * 100n,
    };

    return feeInfo;
}

export {
    bigIntToInputValue,
    CalcCommission,
    ConvertAmount,
    ConvertBalance,
    ConvertPeggedTokenPrice,
    getCAIndex,
    getCurrenciesDetail,
    getCurrencyByValue,
    getTCTokenIndex,
    hasNonUSDPeggedTokens,
    TokenBalance,
    TokenSettings,
};
