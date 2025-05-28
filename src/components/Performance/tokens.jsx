import React, { useContext } from "react";
import { Table } from "antd";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from "../../helpers/Formats";
import { ConvertPeggedTokenPrice } from "../../helpers/currencies";

export default function Tokens(props) {
    const { caIndex } = props;
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const tokensData = [];
    const columnsData = [];

    const ProvideColumns = [
        {
            title: t("performance.pegged.colName"),
            dataIndex: "name",
            align: "left",
            width: 210,
        },
        {
            title: "Price",
            dataIndex: "price",
            align: "right",
            width: 160,
        },
        {
            title: t("performance.pegged.colEMA"),
            dataIndex: "ema",
            align: "right",
            width: 100,
        },
        {
            title: t("performance.pegged.colMinted"),
            dataIndex: "minted",
            align: "right",
            width: 140,
        },
        {
            title: t("performance.pegged.colMintable"),
            dataIndex: "mintable",
            align: "right",
            width: 160,
        },
        {
            title: "Redeem",
            dataIndex: "redeemable",
            align: "right",
            width: 160,
        },
        {
            title: t("performance.pegged.colTargetCoverage"),
            dataIndex: "coverage",
            align: "right",
            width: 140,
        }
    ];

    // Columns
    ProvideColumns.forEach(function (dataItem) {
        columnsData.push({
            title: dataItem.title,
            dataIndex: dataItem.dataIndex,
            align: dataItem.align,
            width: dataItem.width,
        });
    });

    // Rows
    let price
    if (auth.contractStatusData) {

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
        price = priceTEC.times(priceCA);

        // TC
        tokensData.push({
            key: caIndex,
            name: (
                <div className="token">
                    <div
                        className={`icon-token-tc_${caIndex} token__icon`}
                    ></div>{" "}
                    <span className="token__name">
                        {t(`exchange.tokens.TC_${caIndex}.label`, {
                            ns: ns,
                        })}
                    </span>
                    <span className="token__ticker">
                        {t(`exchange.tokens.TC_${caIndex}.abbr`, {
                            ns: ns,
                        })}
                    </span>
                </div>
            ),
            price: (
                <div>
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                              amount: price,
                              token: settings.tokens.TC[caIndex],
                              decimals: 3,
                              i18n: i18n,
                              skipContractConvert: true,
                          })}
                </div>
            ),
            ema: <div>--</div>,
            minted: (
                <div>
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                              amount: auth.contractStatusData
                                  ? auth.contractStatusData[caIndex].nTCcb
                                  : new BigNumber(0),
                              token: settings.tokens.TC[caIndex],
                              decimals: settings.tokens.CA[caIndex].visibleDecimals,
                              i18n: i18n,
                              skipContractConvert: false,
                          })}
                </div>
            ),
            mintable: <div>No limit</div>,
            redeemable: (
                <div>
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                              amount: auth.contractStatusData
                                  ? auth.contractStatusData[caIndex].getRealTCAvailableToRedeem
                                  : new BigNumber(0),
                              token: settings.tokens.TC[caIndex],
                              decimals: settings.tokens.CA[caIndex].visibleDecimals,
                              i18n: i18n,
                              skipContractConvert: false,
                          })}
                </div>
            ),
            coverage: <div className="item-usd">--</div>
        });

        // TP
        let tpEMA
        settings.tokens.TP.forEach(function (dataItem) {
            let price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].PP_TP[dataItem.key][0],
                    settings.tokens.TP[dataItem.key].decimals
                )
            );

            price = ConvertPeggedTokenPrice(auth, caIndex,dataItem.key, price, true);

            if (dataItem.peggedUSD) price = new BigNumber(1);

            let tpAvailableToMint = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getRealTPAvailableToMint[dataItem.key],
                    settings.tokens.TP[dataItem.key].decimals
                )
            );

            if (tpAvailableToMint.lt(0)) tpAvailableToMint = new BigNumber(0);

            tpEMA = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].tpEma[dataItem.key],
                    settings.tokens.TP[dataItem.key].decimals
                )
            );

            tpEMA = ConvertPeggedTokenPrice(auth, caIndex,dataItem.key, tpEMA, true);

            tokensData.push({
                key: dataItem.key+1,
                name: (
                    <div className="token">
                        <div
                            className={`icon-token-tp_${dataItem.key} token__icon`}
                        ></div>{" "}
                        <span className="token__name">
                            {t(`exchange.tokens.TP_${dataItem.key}.label`, {
                                ns: ns,
                            })}
                        </span>
                        <span className="token__ticker">
                            {t(`exchange.tokens.TP_${dataItem.key}.abbr`, {
                                ns: ns,
                            })}
                        </span>
                    </div>
                ),
                price: (
                    <div>
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                amount: price,
                                token: settings.tokens.TP[dataItem.key],
                                decimals: settings.tokens.TP[dataItem.key].visiblePriceUSD,
                                i18n: i18n,
                                skipContractConvert: true,
                            })}
                    </div>
                ),
                ema: (
                    <div>
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                amount: tpEMA,
                                token: settings.tokens.TP[dataItem.key],
                                decimals: settings.tokens.TP[dataItem.key].visiblePriceUSD,
                                t: t,
                                i18n: i18n,
                                ns: ns,
                                skipContractConvert: true,
                            })}
                    </div>
                ),
                minted: (
                    <div>
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                amount: auth.contractStatusData[caIndex].pegContainer[
                                    dataItem.key
                                    ],
                                token: settings.tokens.TP[dataItem.key],
                                decimals: settings.tokens.TP[caIndex].visibleBalanceDecimals,
                                i18n: i18n,
                                skipContractConvert: false,
                            })}
                    </div>
                ),
                mintable: (
                    <div>
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                amount: tpAvailableToMint,
                                token: settings.tokens.TP[dataItem.key],
                                decimals: settings.tokens.TP[caIndex].visibleBalanceDecimals,
                                t: t,
                                i18n: i18n,
                                ns: ns,
                                skipContractConvert: true,
                            })}
                    </div>
                ),
                redeemable: (
                    <div>
                        No limit
                    </div>
                ),
                coverage: (
                    <div className="item-usd">
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                amount: auth.contractStatusData[caIndex].tpCtarg[
                                    dataItem.key
                                    ],
                                token: settings.tokens.TP[dataItem.key],
                                decimals: 2,
                                t: t,
                                i18n: i18n,
                                ns: ns,
                                skipContractConvert: false,
                            })}
                    </div>
                )
            });
        });

    }

    return (
        <Table
            columns={columnsData}
            dataSource={tokensData}
            pagination={false}
            scroll={{ y: 240 }}
        />
    );
}
