import "./Styles.scss";

import { Skeleton } from "antd";
import React, { useEffect, useRef, useState } from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount } from "../../../helpers/currencies";
import { tokenMapBlacklist } from "../../../helpers/exchange";
import { getPortfolioTokenUsdBalance } from "../../../helpers/portfolio";
import { normalizeToBigInt } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings";
import globalData from "../../../settings/global.json";
import type { Settings, TokenConfig } from "../../../types/hooks";
import { generateTokenRow } from "./renderHelpers";

const globalTokens = globalData.tokens as Record<string, TokenConfig>;

// Type definitions

interface TokenRow {
    key: number;
    renderRow: React.ReactElement;
}

interface Label {
    name: string;
    price: string;
    variation: string;
    balance: string;
    usdBalance: string;
}

// Custom serializer that handles BigInt values
const serializeWithBigInt = (obj: unknown): string => {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "bigint") {
            return value.toString();
        }
        return value as unknown;
    });
};

export default function PortfolioTable() {
    const { t, i18n } = useProjectTranslation();
    const {
        contractProtocolStatus,
        userBalance,
        userBaseCoinBalance,
        priceProvider,
    } = useWalletContext();
    const [ready, setReady] = useState<boolean>(false);

    // Refs to track previous values and prevent infinite loops
    const prevContractDataRef = useRef<unknown>(null);
    const prevUserBalanceRef = useRef<unknown>(null);
    const prevLanguageRef = useRef<string>(i18n.language);
    const isProcessingRef = useRef<boolean>(false);

    // Default values for all tokens
    const label: Label = {
        name: t("portfolio.tokensTable.tokenName"),
        price: t("portfolio.tokensTable.priceInUSD"),
        variation: t("portfolio.tokensTable.variation"),
        balance: t("portfolio.tokensTable.balance"),
        usdBalance: t("portfolio.tokensTable.usdBalance"),
    };

    useEffect(() => {
        // Set component ready when contract status data is available
        if (
            contractProtocolStatus.data &&
            userBalance.data &&
            userBaseCoinBalance.balance != null
        ) {
            setReady(true);
        }
    }, [
        contractProtocolStatus.data,
        userBalance.data,
        userBaseCoinBalance.balance,
    ]);

    // Initialize arrays for token and column data
    const [usdPriceTokensData, setUsdPriceTokensData] = useState<TokenRow[]>(
        []
    );
    const [nonUSDpriceTokensData, setNonUSDPriceTokensData] = useState<
        TokenRow[]
    >([]);

    const createAllTheTokens = (settings: Settings): TokenConfig[] => {
        let uniqueKeyCounter = 0;
        const allTheTokens: TokenConfig[] = [];
        const seenNames = new Set<string>();

        const pushToken = (
            type: string,
            token: TokenConfig,
            resolvedKey: number
        ) => {
            if (seenNames.has(token.name)) return;
            allTheTokens.push({
                uniqueKey: uniqueKeyCounter++,
                key: resolvedKey,
                type,
                name: token.name,
                fullName: token.fullName || token.name,
                decimals: token.decimals,
                visiblePriceDecimals: token.visiblePriceDecimals,
                visibleBalanceDecimals: token.visibleBalanceDecimals,
                visibleBalanceUSDDecimals: token.visibleBalanceUSDDecimals,
                peggedUSD:
                    token.peggedUSD !== undefined ? token.peggedUSD : false,
                collateralType: token.collateralType,
            });
            seenNames.add(token.name);
        };

        if (settings.portfolio_table) {
            // portfolio_table drives both selection and order
            for (const entry of settings.portfolio_table) {
                const lastUnderscore = entry.lastIndexOf("_");
                const suffix =
                    lastUnderscore !== -1
                        ? entry.slice(lastUnderscore + 1)
                        : "";
                if (lastUnderscore !== -1 && /^\d+$/.test(suffix)) {
                    // Entry like "CA_0" — pick the specific token by key
                    const type = entry.slice(0, lastUnderscore);
                    const key = parseInt(suffix, 10);
                    const typeTokens = settings.tokens[
                        type as keyof typeof settings.tokens
                    ] as TokenConfig[] | undefined;
                    if (typeTokens) {
                        const token = typeTokens.find(
                            (t, i) => (t.key !== undefined ? t.key : i) === key
                        );
                        if (token) pushToken(type, token, key);
                    }
                } else {
                    // Entry like "COINBASE" or "TF" — include all tokens of this type in their defined order
                    const typeTokens = settings.tokens[
                        entry as keyof typeof settings.tokens
                    ] as TokenConfig[] | undefined;
                    if (typeTokens) {
                        typeTokens.forEach((token, i) =>
                            pushToken(
                                entry,
                                token,
                                token.key !== undefined ? token.key : i
                            )
                        );
                    } else {
                        // Entry is a token name (e.g. "MOC") — look it up in global.json as a CUSTOM token
                        const globalToken = globalTokens[entry];
                        if (globalToken) pushToken("CUSTOM", globalToken, 0);
                    }
                }
            }
        } else {
            // No portfolio_table — include all tokens in settings order
            Object.entries(settings.tokens).forEach(([type, tokens]) => {
                (tokens as TokenConfig[]).forEach((token, i) =>
                    pushToken(
                        type,
                        token,
                        token.key !== undefined ? token.key : i
                    )
                );
            });
        }

        return allTheTokens;
    };

    const processTokens = (
        allTheTokens: TokenConfig[],
        settings: Settings,
        tFunc: (key: string) => string
    ): void => {
        if (!contractProtocolStatus?.data) {
            console.warn(
                "⚠️ contractProtocolStatus.data is missing, skipping processTokens."
            );
            return;
        }
        const newNonUSDpeggedTokenRows: TokenRow[] = [];
        const newUSDpeggedTokenRows: TokenRow[] = [];

        allTheTokens.forEach((token: TokenConfig) => {
            if (tokenMapBlacklist.has(`${token.type}_${token.key}`)) return;

            let balance = 0n;
            let balanceLoaded = false;

            switch (token.type) {
                case "COINBASE":
                    balance = BigInt(userBaseCoinBalance.balance || 0);
                    balanceLoaded = userBaseCoinBalance.balance != null;
                    break;
                case "CA": {
                    if (
                        !token.collateralType ||
                        token.collateralType === "coinbase"
                    )
                        break;
                    const rawBalanceCA =
                        userBalance.data?.CA?.[token.key || 0]?.balance;
                    balanceLoaded = rawBalanceCA != null;
                    balance = normalizeToBigInt(rawBalanceCA) || 0n;
                    break;
                }
                case "TP": {
                    const rawBalanceTP =
                        userBalance.data?.TP?.[0]?.[token.key || 0]?.balance;
                    balanceLoaded = rawBalanceTP != null;
                    balance = normalizeToBigInt(rawBalanceTP) || 0n;
                    break;
                }
                case "TC": {
                    const rawBalanceTC =
                        userBalance.data?.[token.key || 0]?.TC?.balance;
                    balanceLoaded = rawBalanceTC != null;
                    balance = normalizeToBigInt(rawBalanceTC) || 0n;
                    break;
                }
                case "TF": {
                    const rawBalanceTF =
                        userBalance.data[token.key || 0]?.FeeToken?.balance;
                    balanceLoaded = rawBalanceTF != null;
                    balance = normalizeToBigInt(rawBalanceTF) || 0n;
                    break;
                }
                case "CUSTOM": {
                    const pair = `${token.name}/USD`;
                    const rawBalanceCustom =
                        userBalance.data?.CUSTOM?.[pair]?.balance;
                    balanceLoaded = rawBalanceCustom != null;
                    balance = normalizeToBigInt(rawBalanceCustom) ?? 0n;
                    break;
                }
                default:
                    break;
            }

            const tokenIcon = `icon-token-${token.name}`;

            const tokenKey = token.key || 0;
            const tokenId = `${token.type}_${tokenKey}`;

            let price: bigint;
            let balanceUSD: bigint;
            if (token.type === "CUSTOM") {
                const pair = `${token.name}/USD`;
                price = priceProvider.data?.[pair]?.[0] ?? 0n;
                balanceUSD = price > 0n ? (balance * price) / 10n ** 18n : 0n;
            } else if (token.type === "TP" && token.peggedUSD) {
                price = 10n ** 18n;
                balanceUSD = getPortfolioTokenUsdBalance(
                    contractProtocolStatus,
                    token,
                    balance
                );
            } else if (token.type === "TP") {
                // non-pegged TP: display tokens-per-USD
                price = ConvertAmount(
                    contractProtocolStatus,
                    "USD",
                    tokenId,
                    10n ** 18n,
                    0
                );
                balanceUSD = getPortfolioTokenUsdBalance(
                    contractProtocolStatus,
                    token,
                    balance
                );
            } else {
                price = ConvertAmount(
                    contractProtocolStatus,
                    tokenId,
                    "USD",
                    10n ** 18n,
                    tokenKey
                );
                balanceUSD = getPortfolioTokenUsdBalance(
                    contractProtocolStatus,
                    token,
                    balance
                );
            }

            // CUSTOM tokens always render as USD-priced rows (no non-USD section)
            const tokenLabel = { ...label };
            if (token.type === "TP" && !token.peggedUSD) {
                tokenLabel.price = tFunc("portfolio.tokensTable.tokensPerUSD");
            }

            const tokenRow = generateTokenRow({
                key: token.uniqueKey || 0,
                label: tokenLabel,
                tokenIcon,
                tokenName: token.fullName || token.name,
                tokenTicker: token.name,
                price,
                balance,
                balanceLoaded,
                balanceUSD,
                visiblePriceDecimals: token.visiblePriceDecimals || 0,
                visibleBalanceDecimals: token.visibleBalanceDecimals || 0,
                visibleBalanceUSDDecimals: token.visibleBalanceUSDDecimals || 0,
                contractProtocolStatus,
                i18n,
            });

            if (token.collateralType !== "coinbase") {
                if (token.type === "TP" && !token.peggedUSD) {
                    newNonUSDpeggedTokenRows.push(tokenRow);
                } else {
                    newUSDpeggedTokenRows.push(tokenRow);
                }
            }
        });
        setUsdPriceTokensData(newUSDpeggedTokenRows);
        setNonUSDPriceTokensData(newNonUSDpeggedTokenRows);
    };

    useEffect(() => {
        if (
            !ready ||
            !contractProtocolStatus.data ||
            !userBalance.data ||
            isProcessingRef.current
        ) {
            return;
        }

        // Serialize current values for comparison (handles BigInt)
        const currentContractData = serializeWithBigInt(
            contractProtocolStatus.data
        );
        const currentUserBalance = serializeWithBigInt(userBalance.data);
        const currentLanguage = i18n.language;

        // Check if data has actually changed
        const contractDataChanged =
            prevContractDataRef.current !== currentContractData;
        const userBalanceChanged =
            prevUserBalanceRef.current !== currentUserBalance;
        const languageChanged = prevLanguageRef.current !== currentLanguage;

        // Only process if something actually changed
        if (contractDataChanged || userBalanceChanged || languageChanged) {
            isProcessingRef.current = true;

            // Update refs with current serialized values
            prevContractDataRef.current = currentContractData;
            prevUserBalanceRef.current = currentUserBalance;
            prevLanguageRef.current = currentLanguage;

            const allTheTokens = createAllTheTokens(settings);
            processTokens(allTheTokens, settings, t);

            // Reset processing flag after state updates complete
            void Promise.resolve().then(() => {
                isProcessingRef.current = false;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        ready,
        contractProtocolStatus.data,
        userBalance.data,
        priceProvider.data,
        i18n.language,
        t,
    ]);

    return ready ? (
        <div className="portfolio-table">
            {/* Display header and body for regular tokens */}
            <div className="table__header">
                <div className="table__cell__name">
                    {t("portfolio.tokensTable.tokenName")}
                </div>
                <div className="table__cell__price">
                    {t("portfolio.tokensTable.priceInUSD")}
                </div>
                {settings.showPriceVariation && (
                    <div className="table__cell__variation">
                        {t("portfolio.tokensTable.variation")}
                    </div>
                )}
                <div className="table__cell__amount">
                    {t("portfolio.tokensTable.balance")}
                </div>
                <div className="table__cell__usdBalance">
                    {t("portfolio.tokensTable.usdBalance")}
                </div>
            </div>
            <div className="table__body">
                {(usdPriceTokensData || []).map((item) => (
                    <div key={item.key} className="token-row">
                        {item.renderRow}
                    </div>
                ))}
            </div>
            {/* If non USD pegged CA tokens are available, display them header & body for them */}
            {nonUSDpriceTokensData.length > 0 && (
                <>
                    <div className="table__header">
                        <div className="table__cell__name">
                            {t("portfolio.tokensTable.tokenName")}
                        </div>
                        <div className="table__cell__price">
                            {t("portfolio.tokensTable.tokensPerUSD")}
                        </div>
                        {settings.showPriceVariation && (
                            <div className="table__cell__variation">
                                {t("portfolio.tokensTable.variation")}
                            </div>
                        )}
                        <div className="table__cell__amount">
                            {t("portfolio.tokensTable.balance")}
                        </div>
                        <div className="table__cell__usdBalance">
                            {t("portfolio.tokensTable.usdBalance")}
                        </div>
                    </div>
                    <div className="table__body">
                        {(nonUSDpriceTokensData || []).map((item) => (
                            <div key={item.key} className="token-row">
                                {item.renderRow}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    ) : (
        <Skeleton active />
    );
}
