import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from "../../helpers/Formats";
import { ConvertPeggedTokenPrice } from "../../helpers/currencies";

export default function Tokens({ caIndex }) {
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const tokensData = [];

    const columns = [
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

    const renderTokenRow = (token, index) => (
        <tr key={index}>
            {columns.map((col) => (
                <td key={col.key}>{token[col.key]}</td>
            ))}
        </tr>
    );

    if (auth.contractStatusData) {
        // TC row
        const priceTEC = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].getPTCac,
                settings.tokens.TC[caIndex].decimals
            )
        );
        const priceCA = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].PP_CA[0],
                settings.tokens.CA[caIndex].decimals
            )
        );
        const price = priceTEC.times(priceCA);

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
            price: !auth.contractStatusData.canOperate
                ? "--"
                : PrecisionNumbers({
                      amount: price,
                      token: settings.tokens.TC[caIndex],
                      decimals: 3,
                      i18n,
                      skipContractConvert: true,
                  }),
            ema: "--",
            minted: !auth.contractStatusData.canOperate
                ? "--"
                : PrecisionNumbers({
                      amount: auth.contractStatusData[caIndex].nTCcb,
                      token: settings.tokens.TC[caIndex],
                      decimals: settings.tokens.CA[caIndex].visibleDecimals,
                      i18n,
                      skipContractConvert: false,
                  }),
            mintable: "No limit",
            redeemable: !auth.contractStatusData.canOperate
                ? "--"
                : PrecisionNumbers({
                      amount: auth.contractStatusData[caIndex]
                          .getRealTCAvailableToRedeem,
                      token: settings.tokens.TC[caIndex],
                      decimals: settings.tokens.CA[caIndex].visibleDecimals,
                      i18n,
                      skipContractConvert: false,
                  }),
            coverage: <div className="item-usd">--</div>,
        });

        // TP rows
        settings.tokens.TP.forEach((dataItem) => {
            let price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].PP_TP[dataItem.key][0],
                    settings.tokens.TP[dataItem.key].decimals
                )
            );
            price = ConvertPeggedTokenPrice(
                auth,
                caIndex,
                dataItem.key,
                price,
                true
            );

            if (dataItem.peggedUSD) price = new BigNumber(1);

            let tpAvailableToMint = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getRealTPAvailableToMint[
                        dataItem.key
                    ],
                    settings.tokens.TP[dataItem.key].decimals
                )
            );
            if (tpAvailableToMint.lt(0)) tpAvailableToMint = new BigNumber(0);

            let tpEMA = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].tpEma[dataItem.key],
                    settings.tokens.TP[dataItem.key].decimals
                )
            );
            tpEMA = ConvertPeggedTokenPrice(
                auth,
                caIndex,
                dataItem.key,
                tpEMA,
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
                price: !auth.contractStatusData.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: price,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[dataItem.key].visiblePriceUSD,
                          i18n,
                          skipContractConvert: true,
                      }),
                ema: !auth.contractStatusData.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: tpEMA,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[dataItem.key].visiblePriceUSD,
                          t,
                          i18n,
                          ns,
                          skipContractConvert: true,
                      }),
                minted: !auth.contractStatusData.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: auth.contractStatusData[caIndex].pegContainer[
                              dataItem.key
                          ],
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[caIndex]
                                  .visibleBalanceDecimals,
                          i18n,
                          skipContractConvert: false,
                      }),
                mintable: !auth.contractStatusData.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: tpAvailableToMint,
                          token: settings.tokens.TP[dataItem.key],
                          decimals:
                              settings.tokens.TP[caIndex]
                                  .visibleBalanceDecimals,
                          t,
                          i18n,
                          ns,
                          skipContractConvert: true,
                      }),
                redeemable: "No limit",
                coverage: !auth.contractStatusData.canOperate
                    ? "--"
                    : PrecisionNumbers({
                          amount: auth.contractStatusData[caIndex].tpCtarg[
                              dataItem.key
                          ],
                          token: settings.tokens.TP[dataItem.key],
                          decimals: 2,
                          t,
                          i18n,
                          ns,
                          skipContractConvert: false,
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
