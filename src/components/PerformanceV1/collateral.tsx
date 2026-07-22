import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

// v1's collateral metrics (RBTC price/EMA/total) — coverage ratios moved out
// to ./globalMetrics.tsx (their own "Global Metrics" card).
export default function CollateralV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1 } = useWalletContext();
    const status = contractProtocolStatusV1.data;

    return (
        <div className="layout-card section__innerCard--big perfGlobalMetrics">
            <div className="layout-card-title">
                <h1>{t("performance.collateral.cardTitle")}</h1>
            </div>

            <div className="metrics">
                <div className="dataGroup" data-testid="performance-v1-rbtc-price">
                    <div className="icon__back">
                        <div className="icon-token-ca_0 token__icon"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.getBitcoinPrice,
                                      token: TokenSettings("CA_0"),
                                      decimals: 2,
                                      i18n,
                                      isUSD: true,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.v1.rbtcPrice")}
                        </div>
                    </div>
                </div>

                <div className="dataGroup" data-testid="performance-v1-rbtc-ema">
                    <div className="icon__back">
                        <div className="icon icon__Ema"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.getBitcoinMovingAverage,
                                      token: TokenSettings("CA_0"),
                                      decimals: 2,
                                      i18n,
                                      isUSD: true,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.v1.rbtcEma")}
                        </div>
                    </div>
                </div>

                <div className="dataGroup" data-testid="performance-v1-total-rbtc">
                    <div className="icon__back">
                        <div className="icon icon__Total"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.getBucketNBTC,
                                      token: TokenSettings("CA_0"),
                                      decimals: 6,
                                      i18n,
                                      compact: true,
                                      useNoLimit: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.v1.totalRbtc")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
