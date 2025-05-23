import React, { useContext } from "react";
import { Table } from "antd";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from "../../helpers/Formats";
import { ConvertPeggedTokenPrice } from "../../helpers/currencies";

export default function TokensPeggedMobile() {
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const tokensData = [];
    const columnsData = [];

    const ProvideColumnsTP = [
        {
            // title: t('performance.pegged.colName'),
            // dataIndex: 'data',
            // width: '100%'
        },
    ];

    // Columns
    ProvideColumnsTP.forEach(function (/*dataItem*/) {
        columnsData.push({
            render: (text, record) => (
                <>
                    <div className="token__data__container">
                        <div className="token">
                            <div
                                className={`icon-token-tp_${record.key} token__icon  token--mobile`}
                            ></div>
                            <span className="token__name">
                                {t(`exchange.tokens.TP_${record.key}.label`, {
                                    ns: ns,
                                })}
                            </span>
                            <span className="token__ticker">
                                {t(`exchange.tokens.TP_${record.key}.abbr`, {
                                    ns: ns,
                                })}
                            </span>
                        </div>
                        <div className="token__data__group">
                            <div className="token__data__label">
                                Tokens por USD
                            </div>
                            <div className="token__data__data">
                                {record.tokens_per_usd}
                            </div>
                        </div>
                        <div className="token__data__group">
                            <div className="token__data__label">Minted</div>
                            <div className="token__data__data">
                                {record.minted}
                            </div>
                        </div>
                        <div className="token__data__group">
                            <div className="token__data__label">Mintable</div>
                            <div className="token__data__data">
                                {record.mintable}
                            </div>
                        </div>
                        <div className="token__data__group">
                            <div className="token__data__label">
                                Target Coverage
                            </div>
                            <div className="token__data__data">
                                {record.coverage}
                            </div>
                        </div>
                        <div className="token__data__group">
                            <div className="token__data__label">EMA</div>
                            <div className="token__data__data">
                                {record.ema}
                            </div>
                        </div>
                        <div className="token__data__group">
                            <div className="token__data__label">Target EMA</div>
                            <div className="token__data__data">
                                {record.ctargema}
                            </div>
                        </div>
                    </div>
                </>
            ),
        });
    });

    // Rows
    auth.contractStatusData &&
        settings.tokens.TP.forEach(function (dataItem) {
            let price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[0].PP_TP[dataItem.key][0],
                    settings.tokens.TP[dataItem.key].decimals
                )
            );
            price = ConvertPeggedTokenPrice(auth, 0,dataItem.key, price);

            if (dataItem.peggedUSD) price = new BigNumber(1);

            let tpAvailableToMint = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[0].getTPAvailableToMint[dataItem.key],
                    settings.tokens.TP[dataItem.key].decimals
                )
            );

            if (tpAvailableToMint.lt(0)) tpAvailableToMint = new BigNumber(0);

            tokensData.push({
                key: dataItem.key,
                name: (
                    <div className="token">
                        <div
                            className={`icon-token-tp_${dataItem.key} token__icon`}
                        ></div>
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
                tokens_per_usd: (
                    <div>
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                  amount: price,
                                  token: settings.tokens.TP[dataItem.key],
                                  decimals: 3,
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
                                  amount: auth.contractStatusData[0].pegContainer[
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
                ),
                mintable: (
                    <div>
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                  amount: tpAvailableToMint,
                                  token: settings.tokens.TP[dataItem.key],
                                  decimals: 2,
                                  t: t,
                                  i18n: i18n,
                                  ns: ns,
                                  skipContractConvert: true,
                              })}
                    </div>
                ),
                coverage: (
                    <div className="item-usd">
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                  amount: auth.contractStatusData[0].tpCtarg[
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
                ),
                ema: (
                    <div>
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                  amount: auth.contractStatusData[0].tpEma[
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
                ),
                ctargema: (
                    <div>
                        {!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                  amount: auth.contractStatusData[0]
                                      .getCtargemaCA,
                                  token: settings.tokens.TP[dataItem.key],
                                  decimals: 2,
                                  t: t,
                                  i18n: i18n,
                                  ns: ns,
                                  skipContractConvert: false,
                              })}
                    </div>
                ),
            });
        });

    return (
        <div className="card-tps">
            <div className="layout-card-title">
                <h1>{t("performance.pegged.cardTitle")}</h1>
            </div>

            <Table
                columns={columnsData}
                dataSource={tokensData}
                pagination={false}
                scroll={{ y: "auto" }}
            />
        </div>
    );
}
