import React, { useMemo } from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { adjustedTargetCoverageV1 } from "../../helpers/performanceV1";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

// v1's analogue of components/Performance's multicollateral.tsx — coverage
// ratios only, no CA loop needed since v1 has a single bucket.
export default function GlobalMetricsV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1 } = useWalletContext();
    const status = contractProtocolStatusV1.data;

    const adjustedTargetCoverage = useMemo(
        () => (status ? adjustedTargetCoverageV1(status) : 0n),
        [status]
    );

    return (
        <div className="layout-card section__innerCard--big perfGlobalMetrics">
            <div className="layout-card-title perfCardTitleV1">
                <h1>{t("performance.metrics.globalCardTitle")}</h1>
            </div>

            <div className="metrics">
                <div
                    className="dataGroup"
                    data-testid="performance-v1-coverage"
                >
                    <div className="icon__back">
                        <div className="icon icon__CoverageActual"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.globalCoverage,
                                      token: TokenSettings("CA_0"),
                                      decimals: 4,
                                      i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.metrics.currentCoverage")}
                        </div>
                    </div>
                </div>

                <div
                    className="dataGroup"
                    data-testid="performance-v1-target-coverage"
                >
                    <div className="icon__back">
                        <div className="icon icon__CoverageTarget"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: adjustedTargetCoverage,
                                      token: TokenSettings("CA_0"),
                                      decimals: 4,
                                      i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.metrics.targetCoverage")}
                        </div>
                    </div>
                </div>

                <div
                    className="dataGroup"
                    data-testid="performance-v1-leverage"
                >
                    <div className="icon__back">
                        <div className="icon icon__Leverage"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.b0Leverage,
                                      token: TokenSettings("CA_0"),
                                      decimals: 4,
                                      i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.metrics.leverage")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
