import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from "../../helpers/Formats";

export default function MultiCollateral() {
    const { i18n } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    let leverage = new BigNumber(0);
    if (auth.contractStatusData) {
        const normalizationFactors =
            auth.contractStatusData.getNormalizationFactors;
        let factor;
        let bucketLckAC;
        let bucketAC;
        let tvl = new BigNumber(0);
        let lckAC = new BigNumber(0);
        for (
            let caIndex = 0;
            caIndex < normalizationFactors.length;
            caIndex++
        ) {
            factor = fromContractPrecisionDecimals(
                normalizationFactors[caIndex],
                settings.tokens.CA[caIndex].decimals
            );

            bucketLckAC = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getLckAC,
                    settings.tokens.CA[caIndex].decimals
                )
            );

            bucketAC = new BigNumber(
                fromContractPrecisionDecimals(
                    auth.contractStatusData[caIndex].getTotalACavailable,
                    settings.tokens.CA[caIndex].decimals
                )
            );

            //tvl += bucketAC * factor;
            //lckAC += bucketLckAC * factor;
            tvl = tvl.plus(bucketAC.times(factor));
            lckAC = lckAC.plus(bucketLckAC.times(factor));
        }

        //leverage = tvl / (tvl - lckAC);
        leverage = tvl.div(tvl.minus(lckAC));
    }

    return (
        <div className="layout-card section__innerCard--big perfGlobalMetrics">
            <div className="layout-card-title">
                <h1>Global Metrics</h1>
            </div>

            <div className="metrics">
                <div className="dataGroup">
                    <div className="icon__back">
                        <div className="icon icon__CoverageActual"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {!auth.contractStatusData.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: auth.contractStatusData
                                          ? auth.contractStatusData
                                                .getCombinedCglb
                                          : new BigNumber(0),
                                      token: TokenSettings("CA_0"),
                                      decimals: 4,
                                      i18n: i18n,
                                      skipContractConvert: false,
                                  })}
                        </div>
                        <div className="label">Coverage</div>
                    </div>
                </div>
                <div className="dataGroup">
                    <div className="icon__back">
                        <div className="icon icon__CoverageTarget"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {!auth.contractStatusData.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: auth.contractStatusData
                                          ? auth.contractStatusData
                                                .getCombinedCtargemaCA
                                          : new BigNumber(0),
                                      token: settings.tokens.CA[0],
                                      decimals: 4,
                                      i18n: i18n,
                                      skipContractConvert: false,
                                  })}
                        </div>
                        <div className="label">Target Coverage Adjusted</div>
                    </div>
                </div>
                <div className="dataGroup">
                    <div className="icon__back">
                        <div className="icon icon__Leverage"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {!auth.contractStatusData.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: leverage,
                                      token: TokenSettings("CA_0"),
                                      decimals: 4,
                                      i18n: i18n,
                                      skipContractConvert: true,
                                  })}
                        </div>
                        <div className="label">Leverage</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
