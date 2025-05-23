import React, { useContext, useEffect, useState } from "react";
import { Skeleton } from "antd";
import BigNumber from "bignumber.js";

import { AuthenticateContext } from "../../../context/Auth";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import { fromContractPrecisionDecimals } from "../../../helpers/Formats";
import { ConvertPeggedTokenPrice } from "../../../helpers/currencies";
import { generateTokenRow } from "./renderHelpers";

import "./Styles.scss";

export default function PortfolioTable() {
    const { t, i18n } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const [ready, setReady] = useState(false);

    // Default values for all tokens
    let label = {
        name: t("portfolio.tokensTable.name"),
        price: t("portfolio.tokensTable.priceInUSD"),
        variation: t("portfolio.tokensTable.variation"),
        balance: t("portfolio.tokensTable.balance"),
        usdBalance: t("portfolio.tokensTable.usdBalance"),
    };

    useEffect(() => {
        // Set component ready when contract status data is available
        if (auth.contractStatusData) {
            setReady(true);
        }
    }, [auth]);

    const createAllTheTokens = (settings) => {
        let uniqueKeyCounter = 0;
        let allTheTokens = [];
        let tfTokenNames = new Set(); // Track TF token names

        // Step 1: Collect all tokens
        Object.entries(settings.tokens).forEach(([type, tokens]) => {
            tokens.forEach((token, index) => {
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
                        visibleBalanceDecimals: token.visibleBalanceDecimals,
                        visibleBalanceUSDDecimals: token.visibleBalanceUSDDecimals,
                        peggedUSD:
                            token.peggedUSD !== undefined ? token.peggedUSD : false, // Default to false
                        collateralType: token.collateralType,
                    });
                    tfTokenNames.add(token.name);
                }
            });
        });
        return allTheTokens;
    };
    const allTheTokens = createAllTheTokens(settings);

    // Initialize arrays for token and column data
    const [usdPriceTokensData, setUsdPriceTokensData] = useState([]);
    const [nonUSDpriceTokensData, setNonUSDPriceTokensData] = useState([]);

    const processTokens = (allTheTokens, settings, t) => {
        if (!auth?.contractStatusData) {
            console.warn(
                "⚠️ auth.contractStatusData is missing, skipping processTokens."
            );
            return;
        }
        let newNonUSDpeggedTokenRows = []; // ✅ Store all updated rows
        let newUSDpeggedTokenRows = []; // ✅ Store all updated rows

        allTheTokens.forEach((token) => {
            let balance = new BigNumber(0);
            let price = new BigNumber(0);
            let priceTEC = new BigNumber(0);
            let priceCA = new BigNumber(0);
            let balanceUSD = new BigNumber(0);
            let priceDelta = new BigNumber(0);
            let variation = new BigNumber(0);
            let priceHistory = new BigNumber(0);
            let tokenIcon = "";

            switch (token.type) {
                case "COINBASE":
                    // CALCULATE COINBASE DATA
                    tokenIcon = "icon-token-" + token.type.toLowerCase();

                    balance = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.userBalanceData.coinbase,
                            token.decimals
                        )
                    );

                    price = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.contractStatusData.PP_COINBASE[0],
                            token.decimals
                        )
                    );
                    balanceUSD = balance.times(price);

                    // variation
                    priceHistory = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.contractStatusData.historic.PP_COINBASE[0],
                            token.decimals
                        )
                    );
                    priceDelta = price.minus(priceHistory);
                    variation = priceDelta
                        .abs()
                        .div(priceHistory)
                        .times(100);

                    break;
                case "CA":
                    // CALCULATE TOKENS CA DATA
                    if (
                        auth.contractStatusData &&
                        auth.userBalanceData &&
                        token.collateralType &&
                        token.collateralType !== "coinbase"
                    ) {
                        tokenIcon =
                            "icon-token-" +
                            token.type.toLowerCase() +
                            "_" +
                            token.key;

                        // Convert balance to BigNumber with correct decimal precision
                        balance = new BigNumber(
                            fromContractPrecisionDecimals(
                                auth.userBalanceData.CA[token.key].balance,
                                token.decimals
                            )
                        );
                        price = new BigNumber(
                            fromContractPrecisionDecimals(
                                auth.contractStatusData[token.key].PP_CA[0],
                                token.decimals
                            )
                        );

                        balanceUSD = balance.times(price);

                        // variation
                        priceHistory = new BigNumber(
                            fromContractPrecisionDecimals(
                                auth.contractStatusData.historic[token.key].PP_CA[0],
                                token.decimals
                            )
                        );
                        priceDelta = price.minus(priceHistory);
                        variation = priceDelta.abs().div(priceHistory).times(100);
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

                        balance = new BigNumber(
                            fromContractPrecisionDecimals(
                                auth.userBalanceData.TP[0][token.key].balance,
                                token.decimals
                            )
                        );

                        price = new BigNumber(1);

                        balanceUSD = balance.times(price);

                        // variation
                        priceHistory = new BigNumber(
                            fromContractPrecisionDecimals(
                                auth.contractStatusData.historic[
                                    token.key
                                    ].PP_CA[0],
                                token.decimals
                            )
                        );
                        priceDelta = price.minus(priceHistory);
                        priceDelta = new BigNumber(0);

                        // const variation = priceDelta
                        //     .abs()
                        //     .div(priceHistory)
                        //     .times(100);
                    } else {
                        //CALCULATE TOKENS TP NON-USD-Pegged Tokens DATA
                        balance = new BigNumber(
                            fromContractPrecisionDecimals(
                                auth.userBalanceData.TP[0][token.key].balance,
                                token.decimals
                            )
                        );
                        price = new BigNumber(
                            fromContractPrecisionDecimals(
                                auth.contractStatusData[0].PP_TP[token.key][0],
                                token.decimals
                            )
                        );
                        price = ConvertPeggedTokenPrice(auth, 0,token.key, price);
                        balanceUSD = balance.div(price);

                        //variation
                        priceHistory = new BigNumber(
                            fromContractPrecisionDecimals(
                                auth.contractStatusData.historic[0].PP_TP[
                                    token.key
                                ][0],
                                token.decimals
                            )
                        );
                        priceHistory = ConvertPeggedTokenPrice(
                            auth,
                            0,
                            token.key,
                            priceHistory
                        );
                        priceDelta = price.minus(priceHistory);
                        variation = priceDelta
                            .abs()
                            .div(priceHistory)
                            .times(100);
                        //let signPriceDelta = "";
                        //if (priceDelta.gt(0)) signPriceDelta = "+";
                    }
                    break;
                case "TC":
                    // CALCULATE TOKENS TC DATA
                    tokenIcon =
                        "icon-token-" +
                        token.type.toLowerCase() +
                        "_" +
                        token.key;

                    balance = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.userBalanceData[token.key].TC.balance,
                            token.decimals
                        )
                    );

                    priceTEC = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.contractStatusData[token.key].getPTCac,
                            token.decimals
                        )
                    );
                    priceCA = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.contractStatusData[token.key].PP_CA[0],
                            token.decimals
                        )
                    );
                    price = priceTEC.times(priceCA);
                    balanceUSD = balance.times(price);

                    // variation
                    priceHistory = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.contractStatusData.historic[token.key].getPTCac,
                            token.decimals
                        )
                    ).times(priceCA);

                    priceDelta = price.minus(priceHistory);
                    variation = price
                        .minus(priceHistory)
                        .div(priceHistory)
                        .times(100);
                    break;
                case "TF":
                    // CALCULATE TOKENS TF DATA

                    tokenIcon = "icon-token-" + token.type.toLowerCase();
                    balance = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.userBalanceData[token.key].FeeToken.balance,
                            token.decimals
                        )
                    );

                    // RAW price for balance and variation calculation
                    price = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.contractStatusData[0].PP_FeeToken[0],
                            token.decimals
                        )
                    );

                    priceCA = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.contractStatusData[token.key].PP_CA[0],
                            token.decimals
                        )
                    );
                    balanceUSD = balance.times(price).times(priceCA);

                    // variation
                    priceHistory = new BigNumber(
                        fromContractPrecisionDecimals(
                            auth.contractStatusData.historic.PP_FeeToken[0],
                            token.decimals
                        )
                    );
                    priceDelta = price.minus(priceHistory);
                    variation = priceDelta.abs().div(priceHistory).times(100);

                    // Now that balance and variation is calculated, is multiplied for priceCA for price final value
                    price = price.times(priceCA);

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

            if (token.type === "TP" && token.peggedUSD === false) {
                // Change Price in USD for Tokens per USD for !peggedUSD pegged tokens.
                label.price = t("portfolio.tokensTable.tokensPerUSD");
            }

            const tokenRow = generateTokenRow({
                key: token.uniqueKey,
                label,
                tokenIcon,
                tokenName,
                tokenTicker,
                price,
                balance,
                balanceUSD,
                priceDelta,
                variation,
                decimals: token.decimals,
                visiblePriceDecimals: token.visiblePriceDecimals,
                visibleBalanceDecimals: token.visibleBalanceDecimals,
                visibleBalanceUSDDecimals: token.visibleBalanceUSDDecimals,
                auth,
                i18n,
            });

            if (token.collateralType !== 'coinbase') {
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
        if (ready && auth?.contractStatusData) {
            processTokens(allTheTokens, settings, t);
        }
    }, [ready, auth]); // Runs only when `ready` or `auth` changes

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
                <div className="table__cell__variation">
                    {!settings.showPriceVariation
                        ? null
                        : t("portfolio.tokensTable.variation")}
                </div>
                <div className="table__cell__amount">
                    {t("portfolio.tokensTable.balance")}
                </div>
                <div className="table__cell__usdBalance">
                    {t("portfolio.tokensTable.usdBalance")}
                </div>
            </div>
            <div className="table__body">
                {usdPriceTokensData.map((item) => (
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
                        <div className="table__cell__variation">
                            {!settings.showPriceVariation
                                ? null
                                : t("portfolio.tokensTable.variation")}
                        </div>
                        <div className="table__cell__amount">
                            {t("portfolio.tokensTable.balance")}
                        </div>
                        <div className="table__cell__usdBalance">
                            {t("portfolio.tokensTable.usdBalance")}
                        </div>
                    </div>
                    <div className="table__body">
                        {nonUSDpriceTokensData.map((item) => (
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
