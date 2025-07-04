import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../../helpers/translations";
import { AuthenticateContext } from "../../../context/Auth";
import settings from "../../../settings/settings.json";
import { fromContractPrecisionDecimals } from "../../../helpers/Formats";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import PortfolioTable from "../../Tables/PortfolioTable";

interface TokenData {
    key: string;
    decimals: number;
    peggedUSD?: boolean;
}

interface ContractStatusData {
    canOperate: boolean;
    [key: string]: any;
}

interface UserBalanceData {
    CA: { [key: string]: { balance: string } };
    coinbase: string;
    [key: string]: any;
}

export default function Portfolio(): JSX.Element {
    const space: string = "\u00A0";
    const { t, i18n } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    let balance: BigNumber;
    let price: BigNumber;
    let balanceUSD: BigNumber;
    let totalUSD: BigNumber = new BigNumber(0);

    // Total tokens
    if (auth.contractStatusData &&
        auth.userBalanceData ) {

        (settings.tokens.CA as TokenData[]).forEach(function (dataItem: TokenData) {

            ////////////////
            // Tokens CA
            ///////////////

            balance = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.userBalanceData.CA[dataItem.key].balance,
                    settings.tokens.CA[dataItem.key].decimals
                )
            );
            price = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[dataItem.key].PP_CA[0],
                    settings.tokens.CA[dataItem.key].decimals
                )
            );
            balanceUSD = balance.times(price);
            totalUSD = totalUSD.plus(balanceUSD);

            /////////////
            // Token TC
            ////////////
            balance = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.userBalanceData[dataItem.key].TC.balance,
                    settings.tokens.TC[dataItem.key].decimals
                )
            );
            const priceTEC: BigNumber = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[dataItem.key].getPTCac,
                    settings.tokens.TC[dataItem.key].decimals
                )
            );
            const priceCA: BigNumber = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[dataItem.key].PP_CA[0],
                    settings.tokens.CA[dataItem.key].decimals
                )
            );

            if (auth.contractStatusData.canOperate) {
                price = priceTEC.times(priceCA);
                balanceUSD = balance.times(price);
                totalUSD = totalUSD.plus(balanceUSD);
            }

        });
        ///////////////
        // Tokens TP
        //////////////
        (settings.tokens.TP as TokenData[]).forEach(function (dataItem: TokenData) {
            balance = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.userBalanceData.TP[0][dataItem.key].balance,
                    settings.tokens.TP[dataItem.key].decimals
                )
            );
            price = dataItem.peggedUSD
                ? new BigNumber(1)
                : new BigNumber(
                    fromContractPrecisionDecimals(
                        auth.contractStatusData[0].PP_TP[dataItem.key][0],
                        settings.tokens.TP[dataItem.key].decimals
                    )
                );
            balanceUSD = balance.div(price);
            totalUSD = totalUSD.plus(balanceUSD);
        });

        ///////////////
        // Coinbase
        //////////////
        balance = new BigNumber(
            fromContractPrecisionDecimals(
                auth.userBalanceData.coinbase,
                settings.tokens.COINBASE[0].decimals
            )
        );
        price = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData.PP_COINBASE[0],
                settings.tokens.COINBASE[0].decimals
            )
        );
        balanceUSD = balance.times(price);
        totalUSD = totalUSD.plus(balanceUSD);

        /////////////////
        // Fee Token (TF) the price provider is expressed in collateral
        ////////////////
        balance = new BigNumber(
            fromContractPrecisionDecimals(
                auth.userBalanceData[0].FeeToken.balance,
                settings.tokens.TF[0].decimals
            )
        );
        const priceCA_0: BigNumber = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[0].PP_CA[0],
                settings.tokens.CA[0].decimals
            )
        );
        const priceInCA: BigNumber = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[0].PP_FeeToken[0],
                settings.tokens.TF[0].decimals
            )
        );
        balanceUSD = balance.times(priceInCA).times(priceCA_0);
        totalUSD = totalUSD.plus(balanceUSD);
    }


    return (
        <div className="dashboard-portfolio">
            <div className="tokens-card-content">
                <div className="tokens-list-header">
                    <div className="tokens-list-header-title layout-card-title">
                        <h1>{t("portfolio.sectionTitle")}</h1>
                    </div>
                    <div className="tokens-list-header-balance">
                        <div className="tokens-list-header-balance-number">
                            {auth.contractStatusData &&
                            !auth.contractStatusData.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: totalUSD,
                                      token: settings.tokens.COINBASE[0],
                                      decimals: 2,
                                      i18n: i18n,
                                      skipContractConvert: true,
                                  })}
                            {space}
                            {t("portfolio.totalCurrency")}
                        </div>
                        <div className="tokens-list-header-balance-title">
                            {t("portfolio.totalBalance")}
                        </div>
                    </div>
                </div>
                <div className="tokens-list-table">
                    <PortfolioTable />
                </div>
            </div>
        </div>
    );
}
