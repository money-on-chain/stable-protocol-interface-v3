import React from "react";

import LogoIconCA_0 from "../assets/tokens/ca_0.svg?react";
import LogoIconCA_1 from "../assets/tokens/ca_1.svg?react";
import LogoIconCOINBASE from "../assets/tokens/coinbase.svg?react";
import LogoIconTC_0 from "../assets/tokens/tc_0.svg?react";
import LogoIconTC_1 from "../assets/tokens/tc_1.svg?react";
import LogoIconTG_0 from "../assets/tokens/tg_0.svg?react";
import LogoIconTP_0 from "../assets/tokens/tp_0.svg?react";
import LogoIconTP_1 from "../assets/tokens/tp_1.svg?react";
import settings from "../settings/settings.json";
import type { TokenConfig } from "../types/hooks";
import type {
    ContractProtocolStatusResult,
    UserBalanceResult,
    UserOmocBalanceResult,
} from "../types/status";
import type { Rounding } from "./precision";
import {
    divPrecision,
    fromWei,
    mulDiv,
    normalizeToBigInt,
    wadDiv,
    wadMul,
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
    { value: "TF", image: <LogoIconTG_0 className="token__icon" /> },
    { value: "TG", image: <LogoIconTG_0 className="token__icon" /> },
].map((it) => ({
    ...it,
}));

const getCurrenciesDetail = (): Currency[] => currencies;

export type Rounding = "down" | "halfUp" | "up";
type CoreToken = "CA" | "TC" | "TP" | "TG" | "COINBASE";
type AnyToken = CoreToken | "USD";

function priceCAUSD(
    contractProtocolStatus: ContractProtocolStatusResult,
    caIndex: number
): bigint {
    return (
        normalizeToBigInt(
            contractProtocolStatus.data?.[caIndex]?.PP_CA?.[0] || 0n
        ) || 0n
    );
}

function convertCore(
    contractProtocolStatus: ContractProtocolStatusResult,
    tokenExchange: string, // core only
    tokenReceive: string, // core only
    amount: bigint,
    caIndex: number,
    rounding: Rounding
): bigint {
    let price = 0n;
    let price_from = 0n;
    let price_to = 0n;

    const aEx = tokenExchange.split("_");
    const aRe = tokenReceive.split("_");
    const map = `${aEx[0]},${aRe[0]}`;

    switch (map) {
        case "CA,CA":
            return amount;

        case "CA,TC": {
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.getPTCac || 0n
                ) || 0n; // CA/TC
            return price === 0n ? 0n : wadDiv(amount, price, rounding);
        }

        case "TC,CA": {
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.getPTCac || 0n
                ) || 0n; // CA/TC
            return wadMul(amount, price, rounding);
        }

        case "CA,TP": {
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_TP?.[
                        parseInt(aRe[1])
                    ]?.[0] || 0n
                ) || 0n; // TP/CA
            return wadMul(amount, price, rounding);
        }

        case "TP,CA": {
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_TP?.[
                        parseInt(aEx[1])
                    ]?.[0] || 0n
                ) || 0n; // TP/CA
            return price === 0n ? 0n : wadDiv(amount, price, rounding);
        }

        case "TP,TP": {
            price_from =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_TP?.[
                        parseInt(aEx[1])
                    ]?.[0] || 0n
                ) || 0n;
            price_to =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_TP?.[
                        parseInt(aRe[1])
                    ]?.[0] || 0n
                ) || 0n;

            return price_from === 0n || price_to === 0n
                ? 0n
                : mulDiv(amount, price_to, price_from, rounding);
        }

        case "TF,CA":
        case "TG,CA": {
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_FeeToken?.[0] ||
                        0n
                ) || 0n; // CA/TG
            return wadMul(amount, price, rounding);
        }

        case "CA,TF":
        case "CA,TG": {
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex]?.PP_FeeToken?.[0] ||
                        0n
                ) || 0n; // CA/TG
            return price === 0n ? 0n : wadDiv(amount, price, rounding);
        }

        case "COINBASE,CA": {
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.PP_COINBASE?.[0] || 0n
                ) || 0n; // CA/COINBASE
            return wadMul(amount, price, rounding);
        }

        case "CA,COINBASE": {
            price =
                normalizeToBigInt(
                    contractProtocolStatus.data?.PP_COINBASE?.[0] || 0n
                ) || 0n; // CA/COINBASE
            return price === 0n ? 0n : wadDiv(amount, price, rounding);
        }

        case "TC,TP": {
            const ca = convertCore(
                contractProtocolStatus,
                tokenExchange,
                `CA_${caIndex}`,
                amount,
                caIndex,
                rounding
            );
            return convertCore(
                contractProtocolStatus,
                `CA_${caIndex}`,
                tokenReceive,
                ca,
                caIndex,
                rounding
            );
        }

        case "TP,TC": {
            const ca = convertCore(
                contractProtocolStatus,
                tokenExchange,
                `CA_${caIndex}`,
                amount,
                caIndex,
                rounding
            );
            return convertCore(
                contractProtocolStatus,
                `CA_${caIndex}`,
                tokenReceive,
                ca,
                caIndex,
                rounding
            );
        }

        default:
            throw new Error("Invalid token name (core): " + map);
    }
}

function ConvertAmount(
    contractProtocolStatus: ContractProtocolStatusResult,
    tokenExchange: string,
    tokenReceive: string,
    amount: bigint,
    caIndex: number,
    rounding: Rounding = "halfUp"
): bigint {
    const ex0 = tokenExchange.split("_")[0] as AnyToken;
    const re0 = tokenReceive.split("_")[0] as AnyToken;

    // =========================
    // COINBASE <-> USD ONLY
    // =========================
    if (ex0 === "COINBASE" && re0 === "USD") {
        const p =
            normalizeToBigInt(
                contractProtocolStatus.data?.PP_COINBASE?.[0] || 0n
            ) || 0n; // USD / COINBASE

        return wadMul(amount, p, rounding);
    }

    if (ex0 === "USD" && re0 === "COINBASE") {
        const p =
            normalizeToBigInt(
                contractProtocolStatus.data?.PP_COINBASE?.[0] || 0n
            ) || 0n;

        return p === 0n ? 0n : wadDiv(amount, p, rounding);
    }

    // =========================
    // Core tokens (CA / TC / TP / TG)
    // =========================
    if (ex0 !== "USD" && re0 !== "USD") {
        return convertCore(
            contractProtocolStatus,
            tokenExchange,
            tokenReceive,
            amount,
            caIndex,
            rounding
        );
    }

    const pCAUSD = priceCAUSD(contractProtocolStatus, caIndex);
    if (pCAUSD === 0n) return 0n;

    // X -> USD (X = CA / TC / TP / TG)
    if (re0 === "USD") {
        const ca = convertCore(
            contractProtocolStatus,
            tokenExchange,
            `CA_${caIndex}`,
            amount,
            caIndex,
            rounding
        );
        return wadMul(ca, pCAUSD, rounding);
    }

    // USD -> X
    if (ex0 === "USD") {
        const ca = wadDiv(amount, pCAUSD, rounding);
        return convertCore(
            contractProtocolStatus,
            `CA_${caIndex}`,
            tokenReceive,
            ca,
            caIndex,
            rounding
        );
    }

    // USD -> USD
    return amount;
}

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
    let token: TokenConfig = settings.tokens.TG[0];
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
    // Ex. tokenName = CA_0, CA_1, TP_0, TP_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    let balance = 0n;

    if (!userBalance || !userBalance.data) return 0n;

    const aTokenName = tokenName.split("_");
    switch (aTokenName[0]) {
        case "CA":
            balance =
                normalizeToBigInt(
                    userBalance.data?.CA?.[parseInt(aTokenName[1])]?.balance
                ) ?? 0n;
            break;
        case "TP":
            balance =
                normalizeToBigInt(
                    userBalance.data?.TP?.[0]?.[parseInt(aTokenName[1])]
                        ?.balance
                ) ?? 0n;
            break;
        case "TC":
            balance =
                normalizeToBigInt(
                    userBalance.data?.[parseInt(aTokenName[1])]?.TC?.balance
                ) ?? 0n;
            break;
        case "COINBASE":
            balance = normalizeToBigInt(userBaseCoinBalance?.balance) ?? 0n;
            break;
        case "TF":
            balance =
                normalizeToBigInt(
                    userBalance.data?.[parseInt(aTokenName[1])]?.FeeToken
                        ?.balance
                ) ?? 0n;
            break;
        case "TG":
            balance =
                normalizeToBigInt(userOmocBalance?.data?.TG?.balance) ?? 0n;
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
    tokenReceive: string,
    caIndex: number
): bigint {
    const rawAmount = TokenBalance(userBalance, tokenExchange);
    return ConvertAmount(
        contractProtocolStatus,
        tokenExchange,
        tokenReceive,
        rawAmount,
        caIndex
    );
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
            index = -1;
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
        case "TC,TP":
            index = parseInt(aTokenExchange[1]);
            break;
        case "TP,TC":
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
    rawAmount: bigint,
    caIndex: number
): FeeInfo {
    // Amount is expressed in CA units
    const amount = rawAmount;

    let feeParam: bigint;

    const aTokenExchange = tokenExchange.split("_");
    const aTokenReceive = tokenReceive.split("_");
    const aTokenMap = `${aTokenExchange[0]},${aTokenReceive[0]}`;

    // Select fee parameter depending on the operation
    switch (aTokenMap) {
        case "CA,TC": // Mint TC
            feeParam =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex].tcMintFee
                ) ?? 0n;
            break;

        case "TP,CA": // Redeem TP
            feeParam =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex].tpRedeemFees[
                        parseInt(aTokenExchange[1])
                    ]
                ) ?? 0n;
            break;

        case "CA,TP": // Mint TP
            feeParam =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex].tpMintFees[
                        parseInt(aTokenReceive[1])
                    ]
                ) ?? 0n;
            break;

        case "TC,CA": // Redeem TC
            feeParam =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex].tcRedeemFee
                ) ?? 0n;
            break;

        case "TP,TP": // Swap TP → TP
            feeParam =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex].swapTPforTPFee
                ) ?? 0n;
            break;

        case "TC,TP": // Swap TC → TP
            feeParam =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex].swapTCforTPFee
                ) ?? 0n;
            break;

        case "TP,TC": // Swap TP → TC
            feeParam =
                normalizeToBigInt(
                    contractProtocolStatus.data?.[caIndex].swapTPforTCFee
                ) ?? 0n;
            break;

        default:
            throw new Error("Invalid token pair");
    }

    const rounding: Rounding = "down"; // safe / conservative rounding

    // Prices and parameters (all in WAD)
    const feeTokenPrice =
        normalizeToBigInt(
            contractProtocolStatus.data?.[caIndex]?.PP_FeeToken?.[0] || 0n
        ) || 0n;

    const feeTokenPct =
        normalizeToBigInt(
            contractProtocolStatus.data?.[caIndex]?.feeTokenPct
        ) ?? 0n;

    const priceCA =
        normalizeToBigInt(contractProtocolStatus.data?.[caIndex]?.PP_CA?.[0]) ??
        0n;

    const vendorMarkup =
        normalizeToBigInt(
            contractProtocolStatus.data?.[caIndex].vendorMarkup
        ) ?? 0n;

    // Base fee for the operation (in CA)
    const baseFee = wadMul(amount, feeParam, rounding);

    // Vendor markup (in CA)
    const markupFee = wadMul(amount, vendorMarkup, rounding);

    // Total fee charged in CA
    const totalFeeCA = baseFee + markupFee;

    // Fee value in USD (CA → USD)
    const feeUSD = wadMul(totalFeeCA, priceCA, rounding);

    // Portion of the fee paid using the fee token (percentage applied to base fee)
    const feeTokenPortionCA = wadMul(baseFee, feeTokenPct, rounding);

    // Total amount paid via fee token (includes vendor markup)
    const totalFeeTokenCA = feeTokenPortionCA + markupFee;

    // Convert CA fee to fee token units
    const totalFeeToken =
        feeTokenPrice === 0n
            ? 0n
            : wadDiv(totalFeeTokenCA, feeTokenPrice, rounding);

    const feeInfo: FeeInfo = {
        fee: totalFeeCA,
        feeUSD,
        percent: (feeParam + vendorMarkup) * 100n,
        markup: vendorMarkup,
        markOperation: markupFee,
        feeTokenPrice,
        feeTokenPct,
        totalFeeToken,
        totalFeeTokenUSD: wadMul(totalFeeTokenCA, priceCA, rounding),
        feeTokenPercent:
            (wadMul(feeParam, feeTokenPct, rounding) + vendorMarkup) * 100n,
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
