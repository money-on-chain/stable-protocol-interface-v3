import React from "react";

import settings from "../settings";
import globalData from "../settings/global.json";
import type { TokenConfig } from "../types/hooks";
import type { ContractProtocolStatusV1Result } from "../types/hooks-v1";
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

type SvgComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

// Eagerly load all token SVGs at build time; looked up by token name at runtime.
const tokenSvgModules = import.meta.glob<SvgComponent>(
    "../assets/tokens/*.svg",
    { eager: true, query: "?react", import: "default" }
);

function getTokenIcon(tokenName: string): React.ReactElement {
    const key = `../assets/tokens/${tokenName}.svg`;
    const Icon = (tokenSvgModules[key] ??
        tokenSvgModules["../assets/tokens/tx.svg"]) as SvgComponent | undefined;
    return Icon ? <Icon className="token__icon" /> : <></>;
}

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

const globalTokens = globalData.tokens as Record<string, TokenConfig>;

function getCustomPPEntries(): string[] {
    const raw = import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_CUSTOM as
        | string
        | undefined;
    if (!raw) return [];
    return raw.split(",").flatMap((entry) => {
        const parts = entry.trim().split(":");
        if (parts.length < 2) return [];
        const pair = parts[0].trim();
        const slashIdx = pair.indexOf("/");
        const name = slashIdx > 0 ? pair.slice(0, slashIdx) : pair;
        return name ? [name] : [];
    });
}

const buildCurrencies = (): Currency[] => {
    const entries: Currency[] = [];
    const seenNames = new Set<string>();

    settings.tokens.COINBASE?.forEach((t) =>
        entries.push({ value: "COINBASE", image: getTokenIcon(t.name) })
    );

    (["CA", "TC", "TP"] as const).forEach((type) =>
        settings.tokens[type]?.forEach((t, i) =>
            entries.push({
                value: `${type}_${t.key ?? i}`,
                image: getTokenIcon(t.name),
            })
        )
    );

    // TF and TG: deduplicate by token name within each type, but keep both
    // entries when the same token can be used as fee and governance token.
    (["TF", "TG"] as const).forEach((type) =>
        settings.tokens[type]?.forEach((t) => {
            const tokenKey = `${type}:${t.name}`;
            if (!seenNames.has(tokenKey)) {
                seenNames.add(tokenKey);
                entries.push({ value: type, image: getTokenIcon(t.name) });
            }
        })
    );

    // Custom tokens from REACT_APP_CONTRACT_PRICE_PROVIDER_CUSTOM
    getCustomPPEntries().forEach((tokenName) => {
        if (!seenNames.has(tokenName)) {
            seenNames.add(tokenName);
            entries.push({
                value: `CUSTOM_${tokenName}`,
                image: getTokenIcon(tokenName),
            });
        }
    });

    return entries;
};

const currencies: Currency[] = buildCurrencies();

const getCurrenciesDetail = (): Currency[] => currencies;

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

const IS_MOC_V1 =
    import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "moc-v1";

/**
 * Same contract as ConvertAmount, but usable for moc-v1: contractProtocolStatus
 * (v3) is never populated there (see context/Wallet.tsx), so price data comes
 * from contractProtocolStatusV1 instead. moc-v1 has exactly one TP (DOC, pegged
 * 1:1 to USD) and one CA (RBTC, priced via the oracle's getBitcoinPrice) — the
 * same invariants helpers/portfolioV1.ts relies on.
 */
function ConvertAmountLending(
    contractProtocolStatus: ContractProtocolStatusResult,
    contractProtocolStatusV1: ContractProtocolStatusV1Result,
    tokenExchange: string,
    tokenReceive: string,
    amount: bigint,
    caIndex: number,
    rounding: Rounding = "halfUp"
): bigint {
    if (!IS_MOC_V1) {
        return ConvertAmount(
            contractProtocolStatus,
            tokenExchange,
            tokenReceive,
            amount,
            caIndex,
            rounding
        );
    }

    const ex0 = tokenExchange.split("_")[0];
    const re0 = tokenReceive.split("_")[0];
    if (ex0 === re0) return amount;

    const btcPriceUsd = contractProtocolStatusV1.data?.getBitcoinPrice ?? 0n;

    const toUsd = (type: string, amt: bigint): bigint => {
        if (type === "TP" || type === "USD") return amt;
        if (type === "CA") return wadMul(amt, btcPriceUsd, rounding);
        return 0n;
    };
    const fromUsd = (type: string, usdAmt: bigint): bigint => {
        if (type === "TP" || type === "USD") return usdAmt;
        if (type === "CA")
            return btcPriceUsd === 0n ? 0n : wadDiv(usdAmt, btcPriceUsd, rounding);
        return 0n;
    };

    return fromUsd(re0, toUsd(ex0, amount));
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
        case "CUSTOM": {
            const cfg = globalTokens[aTokenName[1]];
            if (!cfg)
                throw new Error(
                    `Custom token "${aTokenName[1]}" not found in global.json`
                );
            return cfg;
        }
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
        case "CUSTOM":
            balance =
                normalizeToBigInt(
                    userBalance.data?.CUSTOM?.[`${aTokenName[1]}/USD`]?.balance
                ) ?? 0n;
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
        return inverted
            ? price === 0n
                ? 0n
                : divPrecision(1000000000000000000n, price)
            : price;
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
    ConvertAmountLending,
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
