import "./Styles.scss";

import { Skeleton } from "antd";
import React, { useEffect, useRef, useState } from "react";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertPeggedTokenPrice, ConvertAmount } from "../../../helpers/currencies";
import {    
    divPrecision,
    mulPrecision,
    normalizeToBigInt,
} from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import type { Settings, TokenConfig } from "../../../types/hooks";
import { generateTokenRow } from "./renderHelpers";

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
    const { contractProtocolStatus, userBalance, userBaseCoinBalance } =
        useWalletContext();
    const [ready, setReady] = useState<boolean>(false);

    // Refs to track previous values and prevent infinite loops
    const prevContractDataRef = useRef<unknown>(null);
    const prevUserBalanceRef = useRef<unknown>(null);
    const prevLanguageRef = useRef<string>(i18n.language);
    const isProcessingRef = useRef<boolean>(false);

    // Default values for all tokens
    const label: Label = {
        name: t("portfolio.tokensTable.name"),
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
            userBaseCoinBalance.balance
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
        const tfTokenNames = new Set<string>(); // Track TF token names

        // Step 1: Collect all tokens
        Object.entries(settings.tokens).forEach(([type, tokens]) => {
            (tokens as TokenConfig[]).forEach(
                (token: TokenConfig, index: number) => {
                    // Remove duplicated token names
                    if (!tfTokenNames.has(token.name)) {
                        allTheTokens.push({
                            uniqueKey: uniqueKeyCounter++,
                            key: token.key !== undefined ? token.key : index, // Fallback if key is missing
                            type,
                            name: token.name,
                            fullName: token.fullName || token.name, // Use name if fullName is missing
                            decimals: token.decimals,
                            visiblePriceDecimals: token.visiblePriceDecimals,
                            visibleBalanceDecimals:
                                token.visibleBalanceDecimals,
                            visibleBalanceUSDDecimals:
                                token.visibleBalanceUSDDecimals,
                            peggedUSD:
                                token.peggedUSD !== undefined
                                    ? token.peggedUSD
                                    : false, // Default to false
                            collateralType: token.collateralType,
                        });
                        tfTokenNames.add(token.name);
                    }
                }
            );
        });
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
        const newNonUSDpeggedTokenRows: TokenRow[] = []; // ✅ Store all updated rows
        const newUSDpeggedTokenRows: TokenRow[] = []; // ✅ Store all updated rows

        allTheTokens.forEach((token: TokenConfig) => {
            let balance = 0n;
            let price = 0n;
            let priceTEC = 0n;
            let priceCA = 0n;
            let balanceUSD = 0n;
            let tokenIcon = "";

            switch (token.type) {
                case "COINBASE":
                    // CALCULATE COINBASE DATA
                    tokenIcon = "icon-token-" + token.type.toLowerCase();

                    balance = BigInt(userBaseCoinBalance.balance || 0);

                    price = normalizeToBigInt(contractProtocolStatus.data.PP_COINBASE?.[0]) ?? 0n;

                    balanceUSD = ConvertAmount(contractProtocolStatus, "COINBASE", "USD", balance, 0);
                    
                    break;
                case "CA":
                    // CALCULATE TOKENS CA DATA
                    if (
                        contractProtocolStatus.data &&
                        userBalance.data &&
                        token.collateralType &&
                        token.collateralType !== "coinbase"
                    ) {
                        tokenIcon =
                            "icon-token-" +
                            token.type.toLowerCase() +
                            "_" +
                            token.key;

                        // Convert balance to BigNumber with correct decimal precision
                        balance =
                            normalizeToBigInt(
                                userBalance.data?.CA?.[token.key || 0]?.balance
                            ) || 0n;
                        price =
                            normalizeToBigInt(contractProtocolStatus.data?.[token.key || 0]?.PP_CA?.[0]) ?? 0n;

                        balanceUSD = ConvertAmount(contractProtocolStatus, "CA", "USD", balance, token.key || 0);
                    }

                    break;
                case "TP":
                    tokenIcon =
                        "icon-token-" +
                        token.type.toLowerCase() +
                        "_" +
                        token.key;

                    if (token.peggedUSD) {
                        // CALCULATE TOKENS TP USD-Pegged Tokens DATA

                        balance =
                            normalizeToBigInt(
                                userBalance.data?.TP?.[0]?.[token.key || 0]
                                    ?.balance
                            ) || 0n;

                        price = 1n;

                        balanceUSD = mulPrecision(balance, price);


                    } else {
                        //CALCULATE TOKENS TP NON-USD-Pegged Tokens DATA
                        balance =
                            normalizeToBigInt(
                                userBalance.data?.TP?.[0]?.[token.key || 0]
                                    ?.balance
                            ) || 0n;
                        price =
                            normalizeToBigInt(contractProtocolStatus.data[0]?.PP_TP?.[token.key || 0]?.[0]) ?? 0n;                        

                            price = ConvertPeggedTokenPrice(
                                contractProtocolStatus,
                                0,
                                token.key || 0,
                                price
                            );
    
                            if (price > 0n) {
                                balanceUSD = divPrecision(balance, price);
                            } else {
                                balanceUSD = 0n;
                            }
                    }
                    break;
                case "TC":
                    // CALCULATE TOKENS TC DATA
                    tokenIcon =
                        "icon-token-" +
                        token.type.toLowerCase() +
                        "_" +
                        token.key;

                    balance =
                        normalizeToBigInt(
                            userBalance.data?.[token.key || 0]?.TC?.balance
                        ) || 0n;

                    priceTEC =
                        normalizeToBigInt(
                            contractProtocolStatus.data?.[token.key || 0]
                                ?.getPTCac
                        ) || 0n;
                    priceCA =
                        normalizeToBigInt(contractProtocolStatus.data?.[token.key || 0]?.PP_CA?.[0]) ?? 0n;
                    price = mulPrecision(priceTEC, priceCA);
                    balanceUSD = ConvertAmount(contractProtocolStatus, "TC", "USD", balance, token.key || 0);

                    
                    break;
                case "TF":
                    // CALCULATE TOKENS TF DATA

                    tokenIcon = "icon-token-" + token.type.toLowerCase();
                    balance =
                        normalizeToBigInt(
                            userBalance.data[token.key || 0]?.FeeToken?.balance
                        ) || 0n;

                    // RAW price for balance and variation calculation
                    price =
                        normalizeToBigInt(contractProtocolStatus.data[0]?.PP_FeeToken?.[0]) ?? 0n;

                    priceCA =
                        normalizeToBigInt(contractProtocolStatus.data[token.key || 0]?.PP_CA?.[0]) ?? 0n;
                    balanceUSD = ConvertAmount(contractProtocolStatus, "TF", "USD", balance, token.key || 0);
                    
                    // Now that balance and variation is calculated, is multiplied for priceCA for price final value
                    price = divPrecision(price, priceCA);

                    break;
                case "TG":
                    // console.log(`Processing ${token.name} (TG)`);
                    // CALCULATE TOKENS TG DATA

                    break;
                default:
                    // console.log(`Unknown token type for ${token.name}`);
                    break;
            }
            // const label = token.fullName || token.name;
            const tokenName = token.fullName || token.name;
            const tokenTicker = token.name;

            // Create a copy of label for this specific token
            const tokenLabel = { ...label };
            if (token.type === "TP" && token.peggedUSD === false) {
                // Change Price in USD for Tokens per USD for !peggedUSD pegged tokens.
                tokenLabel.price = tFunc("portfolio.tokensTable.tokensPerUSD");
            }

            const tokenRow = generateTokenRow({
                key: token.uniqueKey || 0,
                label: tokenLabel,
                tokenIcon,
                tokenName,
                tokenTicker,
                price,
                balance,
                balanceUSD,
                visiblePriceDecimals: token.visiblePriceDecimals || 0,
                visibleBalanceDecimals: token.visibleBalanceDecimals || 0,
                visibleBalanceUSDDecimals: token.visibleBalanceUSDDecimals || 0,
                contractProtocolStatus,
                i18n,
            });

            if (token.collateralType !== "coinbase") {
                // Skip coinbase token when collateral is coinbase
                if (token.type === "TP" && token.peggedUSD === false) {
                    newNonUSDpeggedTokenRows.push(tokenRow); // ✅ Store updated token Rows for nonUSDpegged
                } else {
                    newUSDpeggedTokenRows.push(tokenRow); // ✅ Store updated token Rows for USDpegged
                }
            }
        });
        setUsdPriceTokensData(newUSDpeggedTokenRows); // ✅ Overwrite the state instead of appending
        setNonUSDPriceTokensData(newNonUSDpeggedTokenRows); // ✅ Overwrite the state instead of appending
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
