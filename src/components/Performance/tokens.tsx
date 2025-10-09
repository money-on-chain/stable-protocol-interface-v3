import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { ConvertPeggedTokenPrice } from "../../helpers/currencies";
import { mulPrecision, normalizeToBigInt } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
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
        {
            key: "coverage",
            title: t("performance.pegged.colTargetCoverage"),
        },
    ];

    const renderTokenRow = (token: TokenData, index: number): JSX.Element => (
        <tr key={index}>
            {columns.map((col) => (
                <td key={col.key}>{token[col.key]}</td>
            ))}
        </tr>
    );

    if (contractProtocolStatus.data) {
        // TC row
        const priceTEC = contractProtocolStatus.data[caIndex].getPTCac || 0n;
        const priceCA =
            normalizeToBigInt(contractProtocolStatus.data[caIndex].PP_CA[0]) ||
            0n;
        const price = mulPrecision(priceTEC, priceCA);

        tokensData.push({
            name: (
                <div className="token">
                    <div className={`icon-token-tc_${caIndex} token__icon`} />
                    <span className="token__name">
                        {t(`exchange.tokens.TC_${caIndex}.label`, { ns })}
                    </span>
                    <span className="token__ticker">
                        {t(`exchange.tokens.TC_${caIndex}.abbr`, { ns })}
                    </span>
                </div>
            ),
            price: !contractProtocolStatus.data.canOperate
                ? "--"
                : PrecisionNumbers({
                      amount: price,
                      token: settings.tokens.TC[caIndex],
                      decimals: 3,
                      i18n,
                  }),
            ema: "--",
            minted: !contractProtocolStatus.data.canOperate
                ? "--"
                : PrecisionNumbers({
                      amount: contractProtocolStatus.data[caIndex].nTCcb,
                      token: settings.tokens.TC[caIndex],
                      decimals: settings.tokens.CA[caIndex].visibleDecimals,
                      i18n,
                  }),
            mintable: "No limit",
            redeemable: !contractProtocolStatus.data.canOperate
                ? "--"
                : PrecisionNumbers({
                      amount: contractProtocolStatus.data[caIndex]
                          .getRealTCAvailableToRedeem,
                      token: settings.tokens.TC[caIndex],
                      decimals: settings.tokens.CA[caIndex].visibleDecimals,
                      i18n,
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
                    contractProtocolStatus.data[caIndex].PP_TP[dataItem.key][0]
                ) || 0n;
            price = ConvertPeggedTokenPrice(
                contractProtocolStatus,
                caIndex,
                dataItem.key,
                price,
                true
            );

            if (dataItem.peggedUSD) price = 1n;

            let tpAvailableToMint =
                contractProtocolStatus.data[caIndex].getRealTPAvailableToMint[
                    dataItem.key
                ];
            if (tpAvailableToMint < 0) tpAvailableToMint = 0n;

            const tpEMARaw =
                contractProtocolStatus.data[caIndex].tpEma[dataItem.key];

            const tpEMA = ConvertPeggedTokenPrice(
                contractProtocolStatus,
                caIndex,
                dataItem.key,
                tpEMARaw[0], // 0: EMA 1: SF
                true
            );

            tokensData.push({
                name: (
                    <div className="token">
                        <div
                            className={`icon-token-tp_${dataItem.key} token__icon`}
                        />
                        <span className="token__name">
                            {t(`exchange.tokens.TP_${dataItem.key}.label`, {
                                ns,
                            })}
                        </span>
                        <span className="token__ticker">
                            {t(`exchange.tokens.TP_${dataItem.key}.abbr`, {
                                ns,
                            })}
                        </span>
                    </div>
                ),
                price: !contractProtocolStatus.data.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: price,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[dataItem.key].visiblePriceUSD,
                          i18n,
                      }),
                ema: !contractProtocolStatus.data.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: tpEMA,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[dataItem.key].visiblePriceUSD,
                          i18n,
                      }),
                minted: !contractProtocolStatus.data.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: contractProtocolStatus.data[caIndex]
                              .pegContainer[dataItem.key][0],
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[caIndex]
                                  .visibleBalanceDecimals,
                          i18n,
                      }),
                mintable: !contractProtocolStatus.data.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: tpAvailableToMint,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[caIndex]
                                  .visibleBalanceDecimals,
                          i18n,
                      }),
                redeemable: "No limit",
                coverage: !contractProtocolStatus.data.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: contractProtocolStatus.data[caIndex].tpCtarg[
                              dataItem.key
                          ],
                          token: settings.tokens.TP[dataItem.key],
                          decimals: 2,
                          i18n,
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
