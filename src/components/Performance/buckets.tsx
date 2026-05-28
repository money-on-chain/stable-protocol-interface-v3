import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { divPrecision, normalizeToBigInt } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings";
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
        lckAC =
            normalizeToBigInt(contractProtocolStatus.data[caIndex].getLckAC) ??
            0n;
        nACcb =
            normalizeToBigInt(contractProtocolStatus.data[caIndex].nACcb) ?? 0n;
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
                <div
                    data-testid={`performance-bucket-${caIndex}-group-amount-in-protocol`}
                    className="dataGroup"
                >
                    <div className="icon__back">
                        <div className="icon icon__Total"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {contractProtocolStatus.data?.[caIndex]
                                ?.getACBalance
                                ? PrecisionNumbers({
                                      amount:
                                          normalizeToBigInt(
                                              contractProtocolStatus.data[
                                                  caIndex
                                              ].getACBalance
                                          ) ?? 0n,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals:
                                          (settings.tokens.CA as TokenConfig[])[
                                              caIndex
                                          ]?.visibleDecimals || 6,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">Amount in protocol</div>
                    </div>
                </div>
                <div
                    data-testid={`performance-bucket-${caIndex}-group-coverage`}
                    className="dataGroup"
                >
                    <div className="icon__back">
                        <div className="icon icon__CoverageActual"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {contractProtocolStatus.data?.[caIndex]?.getCglb
                                ? PrecisionNumbers({
                                      amount:
                                          normalizeToBigInt(
                                              contractProtocolStatus.data[
                                                  caIndex
                                              ].getCglb
                                          ) ?? 0n,
                                      token: settings.tokens.CA[caIndex],
                                      decimals: 4,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">Coverage</div>
                    </div>
                </div>
                <div
                    data-testid={`performance-bucket-${caIndex}-group-target-coverage-adjusted`}
                    className="dataGroup"
                >
                    <div className="icon__back">
                        <div className="icon icon__CoverageTarget"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {contractProtocolStatus.data?.[caIndex]
                                ?.getCtargemaCA
                                ? PrecisionNumbers({
                                      amount:
                                          normalizeToBigInt(
                                              contractProtocolStatus.data[
                                                  caIndex
                                              ].getCtargemaCA
                                          ) ?? 0n,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals: 4,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">Target Coverage Adjusted</div>
                    </div>
                </div>
                <div
                    data-testid={`performance-bucket-${caIndex}-group-leverage`}
                    className="dataGroup"
                >
                    <div className="icon__back">
                        <div className="icon icon__Leverage"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {leverage !== 0n
                                ? PrecisionNumbers({
                                      amount: leverage,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals: 4,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">Leverage</div>
                    </div>
                </div>
                <div
                    data-testid={`performance-bucket-${caIndex}-group-locked-collateral`}
                    className="dataGroup"
                >
                    <div className="icon__back">
                        <div className="icon icon__CoverageActual"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {lckAC !== 0n
                                ? PrecisionNumbers({
                                      amount: lckAC,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      decimals:
                                          (settings.tokens.CA as TokenConfig[])[
                                              caIndex
                                          ]?.visibleDecimals || 6,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
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
