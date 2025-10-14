import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { divPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import type { TokenConfig } from "../../types/hooks";
import { PrecisionNumbers } from "../PrecisionNumbers";
import Tokens from "./tokens";

// Type definitions
interface BucketsProps {
    caIndex: number;
}

export default function Buckets(props: BucketsProps): JSX.Element {
    const { caIndex } = props;
    const { t, i18n, ns } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext();
    const space = "\u00A0";

    let lckAC: bigint = 0n;
    let nACcb: bigint = 0n;
    let leverage: bigint = 0n;

    if (
        contractProtocolStatus.data &&
        contractProtocolStatus.data[caIndex] &&
        contractProtocolStatus.data[caIndex].getLckAC &&
        contractProtocolStatus.data[caIndex].nACcb
    ) {
        lckAC = contractProtocolStatus.data[caIndex].getLckAC;
        nACcb = contractProtocolStatus.data[caIndex].nACcb;
        // Prevent division by zero
        if (nACcb - lckAC !== 0n) {
            leverage = divPrecision(nACcb, nACcb - lckAC);
        }
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
                            {!contractProtocolStatus.data?.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: contractProtocolStatus.data
                                          ? contractProtocolStatus.data[caIndex]
                                                .getACBalance
                                          : 0n,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals:
                                          (settings.tokens.CA as TokenConfig[])[
                                              caIndex
                                          ]?.visibleDecimals || 6,
                                      i18n: i18n,
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
                            {!contractProtocolStatus.data?.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: contractProtocolStatus.data
                                          ? contractProtocolStatus.data[caIndex]
                                                .getCglb
                                          : 0n,
                                      token: settings.tokens.CA[caIndex],
                                      decimals: 4,
                                      i18n: i18n,
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
                            {!contractProtocolStatus.data?.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: contractProtocolStatus.data
                                          ? contractProtocolStatus.data[caIndex]
                                                .getCtargemaCA
                                          : 0n,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals: 4,
                                      i18n: i18n,
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
                            {!contractProtocolStatus.data?.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: contractProtocolStatus.data
                                          ? leverage
                                          : 0n,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals: 4,
                                      i18n: i18n,
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
                            {!contractProtocolStatus.data?.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: contractProtocolStatus.data
                                          ? lckAC
                                          : 0n,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals:
                                          (settings.tokens.CA as TokenConfig[])[
                                              caIndex
                                          ]?.visibleDecimals || 6,
                                      i18n: i18n,
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
