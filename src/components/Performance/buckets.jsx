import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";
import { fromContractPrecisionDecimals } from "../../helpers/Formats";
import Tokens from "./tokens";

export default function Buckets(props) {
    const { caIndex } = props;
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const space = "\u00A0";

    let lckAC;
    let nACcb;
    let leverage;

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

        leverage = nACcb.div(nACcb.minus(lckAC));
    }

    return (
        // <div className="section__innerCard--big dash__perfBucket">
        <div className="layout-card section__innerCard--big perfGlobalMetrics">
            {/* <div className="token"> */}
            {/* <div
                        className={`icon-token-ca_${caIndex} token__icon`}
                    ></div> */}
            <div className="layout-card-title">
                <h1>
                    {t(`exchange.tokens.CA_${caIndex}.label`, {
                        ns: ns,
                    })}
                    {space} Collateral
                </h1>
            </div>
            {/* </div> */}

            <div className="metrics">
                <div className="dataGroup">
                    <div className="icon__back">
                        <div className="icon icon__Total"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {!auth.contractStatusData.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: auth.contractStatusData
                                          ? auth.contractStatusData[caIndex]
                                                .getACBalance
                                          : new BigNumber(0),
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals:
                                          settings.tokens.CA[caIndex]
                                              .visibleDecimals,
                                      i18n: i18n,
                                      skipContractConvert: false,
                                  })}
                        </div>
                        <div className="label">Amount in protocol</div>
                    </div>
                </div>
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
                                          ? auth.contractStatusData[caIndex]
                                                .getCglb
                                          : new BigNumber(0),
                                      token: settings.tokens.CA[caIndex],
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
                                          ? auth.contractStatusData[caIndex]
                                                .getCtargemaCA
                                          : new BigNumber(0),
                                      token: TokenSettings(`CA_${caIndex}`),
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
                                      amount: auth.contractStatusData
                                          ? leverage
                                          : new BigNumber(0),
                                      token: TokenSettings("CA_${caIndex}"),
                                      decimals: 4,
                                      i18n: i18n,
                                      skipContractConvert: true,
                                  })}
                        </div>
                        <div className="label">Leverage</div>
                    </div>
                </div>
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
                                          ? lckAC
                                          : new BigNumber(0),
                                      token: TokenSettings("CA_${caIndex}"),
                                      decimals:
                                          settings.tokens.CA[caIndex]
                                              .visibleDecimals,
                                      i18n: i18n,
                                      skipContractConvert: true,
                                  })}
                        </div>
                        <div className="label">Locked Collateral</div>
                    </div>
                </div>
            </div>
            {/* </div> */}

            {/* Tokens Performance Table */}
            {/* <div className="section__innerCard--big dash__perfPegged"> */}
            <div className="buckets">
                <div className="desktop-only">
                    <Tokens caIndex={caIndex} />
                </div>
                <div className="mobile-only">
                    <Tokens caIndex={caIndex} />
                </div>
                {/* </div> */}
            </div>
        </div>
    );
}
