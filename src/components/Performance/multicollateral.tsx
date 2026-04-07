import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { divPrecision, mulPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import { PrecisionNumbers } from "../PrecisionNumbers";

export default function MultiCollateral(): JSX.Element {
    const { i18n } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext();

    let leverage = 0n;
    if (
        contractProtocolStatus.data &&
        contractProtocolStatus.data.getNormalizationFactors
    ) {
        const normalizationFactors =
            contractProtocolStatus.data.getNormalizationFactors;

        // Check if normalizationFactors exists and is an array
        if (!normalizationFactors || !Array.isArray(normalizationFactors)) {
            leverage = 0n;
        } else {
            let factor: bigint;
            let bucketLckAC: bigint;
            let bucketAC: bigint;
            let tvl = 0n;
            let lckAC = 0n;
            for (
                let caIndex = 0;
                caIndex < normalizationFactors.length;
                caIndex++
            ) {
                // Check if the required data exists before accessing it
                if (
                    !contractProtocolStatus.data?.[caIndex] ||
                    !normalizationFactors[caIndex]
                ) {
                    continue;
                }

                factor = normalizationFactors[caIndex];
                bucketLckAC =
                    contractProtocolStatus.data[caIndex].getLckAC || 0n;
                bucketAC =
                    contractProtocolStatus.data[caIndex].getTotalACavailable ||
                    0n;

                //tvl += bucketAC * factor;
                //lckAC += bucketLckAC * factor;
                tvl = tvl + mulPrecision(bucketAC, factor);
                lckAC = lckAC + mulPrecision(bucketLckAC, factor);
            }

            //leverage = tvl / (tvl - lckAC);
            // Prevent division by zero
            if (tvl - lckAC !== 0n) {
                leverage = divPrecision(tvl, tvl - lckAC);
            }
        }
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
                            {contractProtocolStatus.data?.getCombinedCglb
                                ? PrecisionNumbers({
                                      amount: contractProtocolStatus.data
                                          .getCombinedCglb,
                                      token: TokenSettings("CA_0"),
                                      decimals: 4,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
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
                            {contractProtocolStatus.data?.getCombinedCtargemaCA
                                ? PrecisionNumbers({
                                      amount: contractProtocolStatus.data
                                          .getCombinedCtargemaCA,
                                      token: settings.tokens.CA[0],
                                      decimals: 4,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
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
                            {leverage !== 0n
                                ? PrecisionNumbers({
                                      amount: leverage,
                                      token: TokenSettings("CA_0"),
                                      decimals: 4,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">Leverage</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
