import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from '../../helpers/Formats';


export default function MultiCollateral() {
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    let lckAC
    let nACcb
    let leverage

    if (auth.contractStatusData) {

        console.log("DEBUG>>>")
        const normalizationFactors = auth.contractStatusData.getNormalizationFactors
        let factor
        for (let i = 0; i < normalizationFactors.length; i++) {
            factor = fromContractPrecisionDecimals(
                normalizationFactors[i],
                settings.tokens.CA[0].decimals
            )
            console.log(factor.toString())
        }


        /*
        nACcb = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].nACcb,
                settings.tokens.CA[caIndex].decimals
            )
        );

        leverage = nACcb.div(nACcb.minus(lckAC))*/

    }

    return (
        <div className="section__innerCard--big dash__perfBucket">
            <div className="token">
                <div className="token__name">
                    Global status
                </div>
            </div>

            <div className="card-content">

                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: auth.contractStatusData
                                ? auth.contractStatusData.getCombinedCglb
                                : new BigNumber(0),
                            token: TokenSettings("CA_0"),
                            decimals: 4,
                            i18n: i18n,
                            skipContractConvert: false,
                        })}{" "}
                    <div className="caption">
                        Coverage
                    </div>
                </div>
                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: auth.contractStatusData
                                ? auth.contractStatusData.getCombinedCtargemaCA
                                : new BigNumber(0),
                            token: settings.tokens.CA[0],
                            decimals: 4,
                            i18n: i18n,
                            skipContractConvert: false,
                        })}
                    <div className="caption">
                        Target Coverage Adjusted
                    </div>
                </div>
                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: new BigNumber(0),
                            token: TokenSettings("CA_0"),
                            decimals: 4,
                            i18n: i18n,
                            skipContractConvert: false,
                        })}
                    <div className="caption">
                        Leverage
                    </div>
                </div>

            </div>


        </div>
    );
}
