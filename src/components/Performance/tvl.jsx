import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from '../../helpers/Formats';


export default function TVL() {
    const { t, i18n } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    let collateralTotalInUSD = new BigNumber(0);
    let collateralInUSD;

    if (auth.contractStatusData) {
        settings.tokens.CA.forEach(function (dataItem) {

            const priceCA = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[dataItem.key].PP_CA[0],
                    settings.tokens.CA[dataItem.key].decimals
                )
            );

            const nACcb = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[dataItem.key].nACcb,
                    settings.tokens.TC[dataItem.key].decimals
                )
            );
            collateralInUSD = nACcb.times(priceCA);
            collateralTotalInUSD = collateralTotalInUSD.plus(collateralInUSD);

        })
    }

    return (
        <div className="section__innerCard--small dash__perfTVL">
            <div className="layout-card-title">
                <h1>{t("performance.tvl.cardTitle")}</h1>
            </div>

            <div className="card-content">
                <div className="big-number">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: collateralTotalInUSD
                                ? collateralTotalInUSD
                                : new BigNumber(0),
                            token: TokenSettings("CA_0"),
                            decimals: 2,
                            i18n: i18n,
                            skipContractConvert: true,
                        })}
                </div>
                <div className="caption">
                    {t("performance.tvl.expressedIn")}
                </div>
            </div>
        </div>
    );
}
