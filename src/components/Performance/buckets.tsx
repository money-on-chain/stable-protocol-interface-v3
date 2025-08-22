import React from "react";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import settings from "../../settings/settings.json";
import Tokens from "./tokens";
import { useWalletContext } from "../../context/Wallet";
import { divPrecision } from "../../helpers/precision";

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

    if (contractProtocolStatus.data) {
        lckAC = contractProtocolStatus.data[caIndex].getLckAC;
        nACcb = contractProtocolStatus.data[caIndex].nACcb;
        leverage = divPrecision(nACcb, nACcb - lckAC);
    }

    return (
        <div className="layout-card section__innerCard--big perfGlobalMetrics">
            <div className="layout-card-title">
                <h1>
                    {t(`exchange.tokens.CA_${caIndex}.label`, {
                        ns: ns,
                    })}
                    {space} {t("performance.collateral.cardTitle")}
                </h1>
            </div>

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
                                          settings.tokens.CA[caIndex]
                                              .visibleDecimals,
                                      i18n: i18n,
                                  })}
                        </div>
                        <div className="label">
                            {t("performance.collateral.labelAmountInProtocol")}
                        </div>
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
                        <div className="label">
                            {t("performance.collateral.labelAmountInProtocol")}
                        </div>
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
                        <div className="label">
                            {t("performance.collateral.labelTargetAdjusted")}
                        </div>
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
                        <div className="label">
                            {t("performance.collateral.labelLeverage")}
                        </div>
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
                                          settings.tokens.CA[caIndex]
                                              .visibleDecimals,
                                      i18n: i18n,
                                  })}
                        </div>
                        <div className="label">
                            {t("performance.collateral.labelLocked")}
                        </div>
                    </div>
                </div>
            </div>
            {/* </div> */}

            {/* Tokens Performance Table */}
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
