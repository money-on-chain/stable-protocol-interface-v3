import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { ConvertPeggedTokenPrice } from "../../helpers/currencies";
import { mulPrecision, normalizeToBigInt } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import type { TokenConfig } from "../../types/hooks";
import { PrecisionNumbers } from "../PrecisionNumbers";

// Type definitions
interface TokensProps {
    caIndex: number;
}

interface Column {
    key: string;
    title: string;
}

interface TokenData {
    name: JSX.Element;
    price: React.ReactNode;
    ema: string | React.ReactNode;
    minted: React.ReactNode;
    mintable: string | React.ReactNode;
    redeemable: React.ReactNode;
    coverage: React.ReactNode;
    [key: string]: React.ReactNode | string;
}

export default function Tokens({ caIndex }: TokensProps): JSX.Element {
    const { t, i18n, ns } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext();
    const tokensData: TokenData[] = [];
    const noLimitLabel = t("numberFormat.noLimit", {
        defaultValue: "No limit",
    });

    const {
        visiblePriceDecimals: defaultVisiblePriceDecimals,
        visibleDecimals: defaultVisibleDecimals,
        visibleBalanceDecimals: defaultVisibleBalanceDecimals,
    } = settings.defaults.tokens;

    const columns: Column[] = [
        {
            key: "name",
            title: t("performance.pegged.colName"),
        },
        {
            key: "price",
            title: "Price",
        },
        {
            key: "ema",
            title: t("performance.pegged.colEMA"),
        },
        {
            key: "minted",
            title: t("performance.pegged.colMinted"),
        },
        {
            key: "mintable",
            title: t("performance.pegged.colMintable"),
        },
        {
            key: "redeemable",
            title: "Redeem",
        },
        // {
        //     key: "coverage",
        //     title: t("performance.pegged.colTargetCoverage"),
        // },
    ];

    const renderTokenRow = (token: TokenData, index: number): JSX.Element => (
        <tr key={index}>
            {columns.map((col) => (
                <td key={col.key}>{token[col.key]}</td>
            ))}
        </tr>
    );

    if (
        contractProtocolStatus.data &&
        contractProtocolStatus.data[caIndex] &&
        contractProtocolStatus.data[caIndex].getPTCac
    ) {
        // TC row
        const priceTEC =
            normalizeToBigInt(contractProtocolStatus.data[caIndex].getPTCac) ??
            0n;
        const priceCA =
            normalizeToBigInt(
                contractProtocolStatus.data[caIndex].PP_CA?.[0]
            ) ?? 0n;
        const price = mulPrecision(priceTEC, priceCA);

        tokensData.push({
            name: (
                <div className="token">
                    <div className={`icon-token-tc_${caIndex} token__icon`} />
                    <span className="token__name">
                        {settings.tokens.TC[caIndex].fullName}
                    </span>
                    <span className="token__ticker">
                        {settings.tokens.TC[caIndex].name}
                    </span>
                </div>
            ),
            price: !price
                ? "--"
                : PrecisionNumbers({
                      amount: price,
                      token: settings.tokens.TC[caIndex],
                      decimals:
                          settings.tokens.TC[caIndex]?.visiblePriceDecimals ??
                          defaultVisiblePriceDecimals,
                      i18n,
                      compact: true,
                  }),
            ema: "--",
            minted: !contractProtocolStatus.data[caIndex]?.nTCcb
                ? "--"
                : PrecisionNumbers({
                      amount: contractProtocolStatus.data[caIndex].nTCcb,
                      token: settings.tokens.TC[caIndex],
                      decimals:
                          (settings.tokens.CA as TokenConfig[])[caIndex]
                              ?.visibleDecimals || 6,
                      i18n,
                      compact: true,
                  }),
            mintable: noLimitLabel,
            redeemable: !contractProtocolStatus.data[caIndex]
                ?.getRealTCAvailableToRedeem
                ? "--"
                : PrecisionNumbers({
                      amount: contractProtocolStatus.data[caIndex]
                          .getRealTCAvailableToRedeem,
                      token: settings.tokens.TC[caIndex],
                      decimals:
                          (settings.tokens.CA as TokenConfig[])[caIndex]
                              ?.visibleDecimals || 6,
                      i18n,
                      compact: true,
                  }),
            coverage: <div className="item-usd">--</div>,
        });

        // TP rows
        settings.tokens.TP.forEach((dataItem) => {
            if (!contractProtocolStatus.data) return;
            if (!contractProtocolStatus.data[caIndex]) return;

            // Check if the required data exists before accessing it
            if (
                !contractProtocolStatus.data[caIndex].PP_TP?.[dataItem.key] ||
                !contractProtocolStatus.data[caIndex].getRealTPAvailableToMint
            ) {
                return;
            }

            let price =
                normalizeToBigInt(
                    contractProtocolStatus.data[caIndex].PP_TP?.[
                        dataItem.key
                    ]?.[0]
                ) || 0n;
            price = ConvertPeggedTokenPrice(
                contractProtocolStatus,
                caIndex,
                dataItem.key,
                price,
                true
            );

            if (dataItem.peggedUSD) price = 1n * 10n ** 18n; // 1 USD

            let tpAvailableToMint =
                contractProtocolStatus.data[caIndex].getRealTPAvailableToMint?.[
                    dataItem.key
                ] || 0n;
            if (tpAvailableToMint < 0) tpAvailableToMint = 0n;

            const tpEMARaw =
                contractProtocolStatus.data[caIndex].tpEma?.[dataItem.key];

            const tpEMA = tpEMARaw?.[0]
                ? ConvertPeggedTokenPrice(
                      contractProtocolStatus,
                      caIndex,
                      dataItem.key,
                      tpEMARaw[0], // 0: EMA 1: SF
                      true
                  )
                : 0n;

            tokensData.push({
                name: (
                    <div className="token">
                        <div
                            className={`icon-token-tp_${dataItem.key} token__icon`}
                        />
                        <span className="token__name">
                            {settings.tokens.TP[dataItem.key].fullName}
                        </span>
                        <span className="token__ticker">
                            {settings.tokens.TP[dataItem.key].name}
                        </span>
                    </div>
                ),
                price: !price
                    ? "--"
                    : PrecisionNumbers({
                          amount: price,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[dataItem.key]
                                  .visiblePriceDecimals,
                          i18n,
                          compact: true,
                      }),
                ema: !tpEMARaw?.[0]
                    ? "--"
                    : PrecisionNumbers({
                          amount: tpEMA,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[dataItem.key]
                                  .visiblePriceDecimals,
                          i18n,
                          compact: true,
                      }),
                minted: !contractProtocolStatus.data[caIndex]?.pegContainer?.[
                    dataItem.key
                ]?.[0]
                    ? "--"
                    : PrecisionNumbers({
                          amount: contractProtocolStatus.data[caIndex]
                              .pegContainer[dataItem.key][0],
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[dataItem.key]
                                  .visibleBalanceDecimals,
                          i18n,
                          compact: true,
                      }),
                mintable: !tpAvailableToMint
                    ? "--"
                    : PrecisionNumbers({
                          amount: tpAvailableToMint,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[dataItem.key]
                                  .visibleBalanceDecimals,
                          i18n,
                          compact: true,
                      }),
                redeemable: noLimitLabel,
                coverage: !contractProtocolStatus.data[caIndex]?.tpCtarg?.[
                    dataItem.key
                ]
                    ? "--"
                    : PrecisionNumbers({
                          amount: contractProtocolStatus.data[caIndex].tpCtarg[
                              dataItem.key
                          ],
                          token: settings.tokens.TP[dataItem.key],
                          decimals: 2,
                          i18n,
                          compact: true,
                      }),
            });
        });
    }

    return (
        <table className="token-table">
            <thead>
                <tr className="token-table__header-row">
                    {columns.map((col) => (
                        <th
                            key={col.key}
                            className={`token-table__header token-table__header--${col.key}`}
                        >
                            {col.title}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {tokensData.map((token, index) => (
                    <tr key={index} className="token-table__row">
                        {columns.map((col) => (
                            <td
                                key={col.key}
                                className={`token-table__cell token-table__cell--${col.key}`}
                            >
                                {token[col.key]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
