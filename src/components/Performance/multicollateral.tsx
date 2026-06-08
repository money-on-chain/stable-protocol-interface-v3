import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { CheckStatusGlobal } from "../../helpers/checkStatus";
import { divPrecision, mulPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import { PrecisionNumbers } from "../PrecisionNumbers";

export default function MultiCollateral(): JSX.Element {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext();
    const { checkerStatus } = CheckStatusGlobal();

    let leverage = 0n;
    const useCombinedOperationsRedeemableLimit =
        settings.useCombinedOperationsRedeemableLimit === true;
    const globalStatus = checkerStatus().globalStatus;
    const isProtectedMode = globalStatus === 3;
    const redeemableLimitLabel = isProtectedMode
        ? t("performance.pegged.redeemableNoLimitWithFootnote", {
              defaultValue: "No Limit*",
          })
        : t("performance.pegged.redeemableNoLimit", {
              defaultValue: "No Limit",
          });
    const tpMintableTotals = settings.tokens.TP.map((tpToken) => {
        const total = settings.tokens.CA.reduce((sum, _caToken, caIndex) => {
            let mintable =
                contractProtocolStatus.data?.[caIndex]
                    ?.getRealTPAvailableToMint?.[tpToken.key] ?? 0n;

            if (mintable < 0n) {
                mintable = 0n;
            }

            return sum + mintable;
        }, 0n);

        return {
            token: tpToken,
            total,
        };
    });
    const tpRedeemableLimits = useCombinedOperationsRedeemableLimit
        ? settings.tokens.TP.filter((tpToken) => tpToken.peggedUSD === true)
        : [];
    const showRedeemableFootnote =
        tpRedeemableLimits.length > 0 && isProtectedMode;

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
                <h1>{t("performance.metrics.globalCardTitle")}</h1>
            </div>

            <div className="metrics">
                <div
                    data-testid="performance-global-group-coverage"
                    className="dataGroup"
                >
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
                        <div className="label">
                            {t("performance.metrics.currentCoverage")}
                        </div>
                    </div>
                </div>
                <div
                    data-testid="performance-global-group-target-coverage-adjusted"
                    className="dataGroup"
                >
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
                        <div className="label">
                            {t("performance.metrics.targetCoverage")}
                        </div>
                    </div>
                </div>
                <div
                    data-testid="performance-global-group-leverage"
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
                                      token: TokenSettings("CA_0"),
                                      decimals: 4,
                                      i18n: i18n,
                                      compact: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.metrics.leverage")}
                        </div>
                    </div>
                </div>
                {tpMintableTotals.map(({ token, total }) => (
                    <div
                        data-testid={`performance-global-group-tp-${token.key}-mintable`}
                        className="dataGroup"
                        key={token.key}
                    >
                        <div className="icon__back">
                            <div
                                className={`icon-token-tp_${token.key} token__icon`}
                            />
                        </div>
                        <div className="info">
                            <div className="amount">
                                {total !== 0n
                                    ? PrecisionNumbers({
                                          amount: total,
                                          token,
                                          decimals: token.visibleBalanceDecimals,
                                          i18n: i18n,
                                          compact: true,
                                      })
                                    : "--"}
                            </div>
                            <div className="label">
                                {t("performance.metrics.tpMintable", {
                                    ticker: token.name,
                                })}
                            </div>
                        </div>
                    </div>
                ))}
                {tpRedeemableLimits.map((token) => (
                    <div
                        data-testid={`performance-global-group-tp-${token.key}-redeemable`}
                        className="dataGroup"
                        key={`redeemable-${token.key}`}
                    >
                        <div className="icon__back">
                            <div
                                className={`icon-token-tp_${token.key} token__icon`}
                            />
                        </div>
                        <div className="info">
                            <div className="amount">
                                {redeemableLimitLabel}
                            </div>
                            <div className="label">
                                {t("performance.metrics.tpRedeemable", {
                                    ticker: token.name,
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {showRedeemableFootnote && (
                <div className="token-table__footnote perfGlobalMetrics__footnote">
                    {t("performance.pegged.redeemableCombinedOperationsFootnote")}
                </div>
            )}
        </div>
    );
}
