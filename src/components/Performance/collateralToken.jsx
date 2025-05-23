import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from '../../helpers/Formats';


export default function CollateralToken(props) {
    const { caIndex } = props;
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    let priceTEC
    let priceCA
    let price

    if (auth.contractStatusData) {

        priceTEC = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].getPTCac,
                settings.tokens.TC[caIndex].decimals
            )
        );

        priceCA = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].PP_CA[0],
                settings.tokens.CA[caIndex].decimals
            )
        );
        price = priceTEC.times(priceCA);
    }

    return (
        <div className="section__innerCard--small dash__perfLeveraged">
            <div className="token">
                <div className={`icon-token-tc_${caIndex} token__icon`}></div>
                <div className="token__name">
                    {t(`exchange.tokens.TC_${caIndex}.label`, { ns: ns })}
                </div>
            </div>

            <div className="card-content">
                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: price,
                            token: settings.tokens.TC[caIndex],
                            decimals: 8,
                            i18n: i18n,
                            skipContractConvert: true,
                        })}
                    <div className="caption">
                        {t("performance.tc.priceIn")}
                    </div>
                </div>
                <div className="amount">
                    {/*!auth.contractStatusData.canOperate
                            ? "--"
                            : PrecisionNumbers({
                                  amount: auth.contractStatusData
                                      ? auth.contractStatusData.getLeverageTC
                                      : new BigNumber(0),
                                  token: TokenSettings("TC"),
                                  decimals: 8,
                                  i18n: i18n,
                                  skipContractConvert: false,
                              })*/}
                    <div className="caption">
                        {t("performance.tc.currentLeverage")}
                    </div>
                </div>
                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: auth.contractStatusData
                                ? auth.contractStatusData[caIndex].nTCcb
                                : new BigNumber(0),
                            token: TokenSettings(`TC_${caIndex}`),
                            decimals: 2,
                            i18n: i18n,
                            skipContractConvert: false,
                        })}
                    <div className="caption">
                        {t("performance.tc.totalInSystem")}
                    </div>
                </div>
                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: auth.contractStatusData
                                ? auth.contractStatusData[caIndex]
                                    .getTCAvailableToRedeem
                                : new BigNumber(0),
                            token: TokenSettings(`TC_${caIndex}`),
                            decimals: 2,
                            i18n: i18n,
                            skipContractConvert: false,
                        })}{" "}
                    <div className="caption">
                        {t("performance.tc.redeemable")}
                    </div>
                </div>
            </div>
        </div>
    );
}
