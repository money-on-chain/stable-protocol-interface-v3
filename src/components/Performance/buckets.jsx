import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from '../../helpers/Formats';
import Tokens from "./tokens";


export default function Buckets(props) {
    const { caIndex } = props;
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    let lckAC
    let nACcb
    let leverage

    if (auth.contractStatusData) {

        lckAC = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].getLckAC,
                settings.tokens.CA[caIndex].decimals
            )
        );

        nACcb = new BigNumber(
            fromContractPrecisionDecimals(
                auth.contractStatusData[caIndex].nACcb,
                settings.tokens.CA[caIndex].decimals
            )
        );

        leverage = nACcb.div(nACcb.minus(lckAC))

    }

    return (
        <div className="section__innerCard--big dash__perfBucket">
            <div className="token">
                <div className={`icon-token-ca_${caIndex} token__icon`}></div>
                <div className="token__name">
                    {t(`exchange.tokens.CA_${caIndex}.label`, { ns: ns })} Collateral
                </div>
            </div>

            <div className="card-content">

                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: auth.contractStatusData
                                ? auth.contractStatusData[caIndex]
                                    .getACBalance
                                : new BigNumber(0),
                            token: TokenSettings(`CA_${caIndex}`),
                            decimals: settings.tokens.CA[caIndex].visibleDecimals,
                            i18n: i18n,
                            skipContractConvert: false,
                        })}{" "}
                    <div className="caption">
                        Amount in protocol
                    </div>
                </div>
                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: auth.contractStatusData
                                ? auth.contractStatusData[caIndex].getCglb
                                : new BigNumber(0),
                            token: settings.tokens.CA[caIndex],
                            decimals: 4,
                            i18n: i18n,
                            skipContractConvert: false,
                        })}
                    <div className="caption">
                        Coverage
                    </div>
                </div>
                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: auth.contractStatusData
                                ? auth.contractStatusData[caIndex].getCtargemaCA
                                : new BigNumber(0),
                            token: TokenSettings(`CA_${caIndex}`),
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
                            amount: auth.contractStatusData
                                ? leverage
                                : new BigNumber(0),
                            token: TokenSettings("CA_${caIndex}"),
                            decimals: 4,
                            i18n: i18n,
                            skipContractConvert: true,
                        })}
                    <div className="caption">
                        Leverage
                    </div>
                </div>
                <div className="amount">
                    {!auth.contractStatusData.canOperate
                        ? "--"
                        : PrecisionNumbers({
                            amount: auth.contractStatusData
                                ? lckAC
                                : new BigNumber(0),
                            token: TokenSettings("CA_${caIndex}"),
                            decimals: settings.tokens.CA[caIndex].visibleDecimals,
                            i18n: i18n,
                            skipContractConvert: true,
                        })}
                    <div className="caption">
                        Locked
                    </div>
                </div>


            </div>

            {/* Tokens Performance Table */}
            <div className="section__innerCard--big dash__perfPegged">
                <div className="desktop-only">
                    <Tokens caIndex={caIndex} />
                </div>
                <div className="mobile-only">
                    <Tokens caIndex={caIndex} />
                </div>
            </div>
        </div>
    );
}
