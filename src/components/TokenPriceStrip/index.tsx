import "./Styles.scss";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import {
    ConvertAmount,
    ConvertPeggedTokenPrice,
} from "../../helpers/currencies";
import { mulPrecision, normalizeToBigInt, WAD } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings";
import type { TokenConfig } from "../../types/hooks";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface TokenPriceItem {
    key: string;
    iconClassName: string;
    price: bigint;
    pricePrefix: string;
    priceCurrency: string;
    token: TokenConfig;
}

interface TokenPriceStripContentProps {
    configuredTokens: string[];
}

const getFirstToken = (tokens: TokenConfig[] | undefined): TokenConfig | null =>
    tokens?.[0] ?? null;

const appSettings = settings;

// v1 (moc-v1) has no caIndex — its protocol status is a flat set of fields,
// not the CA-indexed multicall shape the v3 branch below reads from. See
// project_v1_support_plan memory's Epic 0 fork boundary.
const IS_MOC_V1 =
    import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "moc-v1";

export default function TokenPriceStrip(): JSX.Element | null {
    const configuredTokens = Array.isArray(appSettings.tokenPriceStrip?.tokens)
        ? appSettings.tokenPriceStrip.tokens
        : [];

    if (configuredTokens.length === 0) return null;

    return <TokenPriceStripContent configuredTokens={configuredTokens} />;
}

function TokenPriceStripContent({
    configuredTokens,
}: TokenPriceStripContentProps): JSX.Element | null {
    const { contractProtocolStatus, contractProtocolStatusV1 } =
        useWalletContext();
    const { i18n } = useProjectTranslation();
    const data = contractProtocolStatus.data;
    const dataV1 = contractProtocolStatusV1.data;
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = useState({
        hasOverflow: false,
        canScrollLeft: false,
        canScrollRight: false,
    });

    const getIndexedToken = (
        tokens: TokenConfig[],
        tokenId: string
    ): TokenConfig | null => {
        const [, indexValue] = tokenId.split("_");
        const index = Number(indexValue);
        if (!Number.isInteger(index)) return null;

        return tokens[index] ?? null;
    };

    // v1's protocol status is a flat set of fields (getBitcoinPrice/
    // bproUsdPrice/mocUsdPrice, DOC pegged to WAD) — no caIndex, no per-token
    // multicall lookup, unlike the v3 branch below. Mirrors the price sourcing
    // already used by helpers/exchangeV1.ts's tokenUsdPriceV1.
    const getTokenPriceItemV1 = (tokenId: string): TokenPriceItem | null => {
        const [type] = tokenId.split("_");

        switch (type) {
            case "COINBASE":
            case "CA": {
                const token =
                    type === "COINBASE"
                        ? getFirstToken(appSettings.tokens.COINBASE)
                        : getFirstToken(appSettings.tokens.CA);
                if (!token) return null;

                return {
                    key: tokenId,
                    iconClassName:
                        type === "COINBASE"
                            ? "icon-token-coinbase"
                            : "icon-token-ca_0",
                    price: dataV1?.getBitcoinPrice ?? 0n,
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            case "TC": {
                const token = getFirstToken(appSettings.tokens.TC);
                if (!token) return null;

                return {
                    key: tokenId,
                    iconClassName: "icon-token-tc_0",
                    price: dataV1?.bproUsdPrice ?? 0n,
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            case "TP": {
                const token = getFirstToken(appSettings.tokens.TP);
                if (!token) return null;

                return {
                    key: tokenId,
                    iconClassName: "icon-token-tp_0",
                    price: WAD,
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            case "TG": {
                const token = getFirstToken(appSettings.tokens.TG);
                if (!token) return null;

                return {
                    key: tokenId,
                    iconClassName: "icon-token-tg",
                    price: dataV1?.mocUsdPrice ?? 0n,
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            default:
                return null;
        }
    };

    const getTokenPriceItem = (tokenId: string): TokenPriceItem | null => {
        if (IS_MOC_V1) return getTokenPriceItemV1(tokenId);

        const [type, indexValue] = tokenId.split("_");
        const index = Number(indexValue);

        switch (type) {
            case "COINBASE": {
                const token = getFirstToken(appSettings.tokens.COINBASE);
                if (!token) return null;

                return {
                    key: tokenId,
                    iconClassName: "icon-token-coinbase",
                    price: normalizeToBigInt(data?.PP_COINBASE?.[0]) ?? 0n,
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            case "CA": {
                const token = getIndexedToken(appSettings.tokens.CA, tokenId);
                if (!token || !Number.isInteger(index)) return null;

                return {
                    key: tokenId,
                    iconClassName: `icon-token-ca_${index}`,
                    price: normalizeToBigInt(data?.[index]?.PP_CA?.[0]) ?? 0n,
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            case "TC": {
                const token = getIndexedToken(appSettings.tokens.TC, tokenId);
                if (!token || !Number.isInteger(index)) return null;

                const caPrice =
                    normalizeToBigInt(data?.[index]?.PP_CA?.[0]) ?? 0n;
                const tcPriceInCA =
                    normalizeToBigInt(data?.[index]?.getPTCac) ?? 0n;

                return {
                    key: tokenId,
                    iconClassName: `icon-token-tc_${index}`,
                    price: mulPrecision(tcPriceInCA, caPrice),
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            case "TP": {
                const token = getIndexedToken(appSettings.tokens.TP, tokenId);
                if (!token || !Number.isInteger(index)) return null;

                const tpRawPrice =
                    normalizeToBigInt(data?.[0]?.PP_TP?.[index]?.[0]) ?? 0n;

                return {
                    key: tokenId,
                    iconClassName: `icon-token-tp_${index}`,
                    price: token.peggedUSD
                        ? WAD
                        : ConvertPeggedTokenPrice(
                              contractProtocolStatus,
                              0,
                              token.key ?? index,
                              tpRawPrice
                          ),
                    pricePrefix: token.peggedUSD ? "$" : "",
                    priceCurrency: token.peggedUSD
                        ? "USD"
                        : `${token.name}/USD`,
                    token,
                };
            }
            case "TF": {
                const token = getIndexedToken(appSettings.tokens.TF, tokenId);
                if (!token || !Number.isInteger(index)) return null;

                return {
                    key: tokenId,
                    iconClassName: "icon-token-tf",
                    price: ConvertAmount(
                        contractProtocolStatus,
                        "TF",
                        "USD",
                        WAD,
                        index
                    ),
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            case "TG": {
                const token = getFirstToken(appSettings.tokens.TG);
                if (!token) return null;

                return {
                    key: tokenId,
                    iconClassName: "icon-token-tg",
                    price: ConvertAmount(
                        contractProtocolStatus,
                        "TG",
                        "USD",
                        WAD,
                        0
                    ),
                    pricePrefix: "$",
                    priceCurrency: "USD",
                    token,
                };
            }
            default:
                return null;
        }
    };

    const items = configuredTokens
        .map(getTokenPriceItem)
        .filter(Boolean) as TokenPriceItem[];
    const itemsSignature = items
        .map((item) => `${item.key}:${item.price.toString()}`)
        .join("|");

    const updateScrollState = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
        const nextScrollState = {
            hasOverflow: maxScrollLeft > 1,
            canScrollLeft: viewport.scrollLeft > 1,
            canScrollRight: viewport.scrollLeft < maxScrollLeft - 1,
        };

        setScrollState((prevScrollState) => {
            if (
                prevScrollState.hasOverflow === nextScrollState.hasOverflow &&
                prevScrollState.canScrollLeft ===
                    nextScrollState.canScrollLeft &&
                prevScrollState.canScrollRight ===
                    nextScrollState.canScrollRight
            ) {
                return prevScrollState;
            }

            return nextScrollState;
        });
    }, []);

    const scrollPrices = (direction: -1 | 1): void => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        viewport.scrollBy({
            left: direction * Math.max(viewport.clientWidth * 0.8, 160),
            behavior: "smooth",
        });
    };

    useEffect(() => {
        updateScrollState();
        const animationFrameId =
            window.requestAnimationFrame(updateScrollState);

        const viewport = viewportRef.current;
        if (!viewport) {
            window.cancelAnimationFrame(animationFrameId);
            return;
        }

        const resizeObserver = new ResizeObserver(updateScrollState);
        resizeObserver.observe(viewport);
        window.addEventListener("resize", updateScrollState);

        return () => {
            window.cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateScrollState);
        };
    }, [items.length, itemsSignature, updateScrollState]);

    if (items.length === 0) return null;

    const stripClassName = [
        "token-price-strip",
        scrollState.hasOverflow ? "token-price-strip--overflow" : "",
        scrollState.canScrollLeft ? "token-price-strip--can-scroll-left" : "",
        scrollState.canScrollRight ? "token-price-strip--can-scroll-right" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={stripClassName} aria-label="Token prices">
            {scrollState.hasOverflow && (
                <button
                    type="button"
                    className="token-price-strip__arrow token-price-strip__arrow--left"
                    aria-label="Scroll token prices left"
                    onClick={() => scrollPrices(-1)}
                    disabled={!scrollState.canScrollLeft}
                >
                    <span className="icon__scroll__left" />
                </button>
            )}
            <div
                className="token-price-strip__viewport"
                ref={viewportRef}
                onScroll={updateScrollState}
            >
                {items.map((item) => (
                    <div className="token-price-strip__item" key={item.key}>
                        <div
                            className={`${item.iconClassName} token-price-strip__icon`}
                            aria-hidden="true"
                        />
                        <span className="token-price-strip__ticker">
                            {item.token.name}
                        </span>
                        <span className="token-price-strip__price">
                            <span className="token-price-strip__price-value">
                                {item.pricePrefix}
                                {item.price > 0n ? (
                                    <PrecisionNumbers
                                        amount={item.price}
                                        token={{
                                            name: "",
                                            decimals: 18,
                                            visibleDecimals:
                                                item.token
                                                    .visiblePriceDecimals ?? 2,
                                        }}
                                        decimals={
                                            item.token.visiblePriceDecimals ?? 2
                                        }
                                        i18n={i18n}
                                        compact={true}
                                    />
                                ) : (
                                    "--"
                                )}
                            </span>
                            <span className="token-price-strip__price-currency">
                                {item.priceCurrency}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
            {scrollState.hasOverflow && (
                <button
                    type="button"
                    className="token-price-strip__arrow token-price-strip__arrow--right"
                    aria-label="Scroll token prices right"
                    onClick={() => scrollPrices(1)}
                    disabled={!scrollState.canScrollRight}
                >
                    <span className="icon__scroll__right" />
                </button>
            )}
        </div>
    );
}
