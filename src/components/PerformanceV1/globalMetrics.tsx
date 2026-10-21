import React, { useMemo } from "react";
import { formatUnits } from "viem";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import {
    adjustedTargetCoverageV1,
    collateralDistributionV1,
} from "../../helpers/performanceV1";
import { tokenChartColors } from "../../helpers/tokenColors";
import { useProjectTranslation } from "../../helpers/translations";
import DistributionPieChart, {
    type DistributionPieSlice,
} from "../Charts/DistributionPieChart";
import { PrecisionNumbers } from "../PrecisionNumbers";

// same visible precision as the "Total RBTC" figure in ./collateral.tsx
const RBTC_FORMAT = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
});

// v1's analogue of components/Performance's multicollateral.tsx — coverage
// ratios plus the RBTC collateral distribution pie (legacy dapp's Metrics
// "Total RBTC in the system" card), no CA loop needed since v1 has a single bucket.
export default function GlobalMetricsV1(): React.ReactElement {
    const { t, i18n, ns } = useProjectTranslation();
    const { contractProtocolStatusV1 } = useWalletContext();
    const status = contractProtocolStatusV1.data;

    const adjustedTargetCoverage = useMemo(
        () => (status ? adjustedTargetCoverageV1(status) : 0n),
        [status]
    );

    const rbtcAbbr = t("exchange.tokens.CA_0.abbr", { ns });
    const distributionSlices: DistributionPieSlice[] = useMemo(() => {
        if (!status) return [];
        const rows = collateralDistributionV1(status);
        const colors = tokenChartColors(
            rows.map((row) => TokenSettings(row.token).name)
        );
        return rows.map((row) => {
            const label = t(`exchange.tokens.${row.token}.label`, {
                ns,
            });
            const abbr = t(`exchange.tokens.${row.token}.abbr`, {
                ns,
            });
            return {
                id: row.token,
                label:
                    label.toUpperCase() !== abbr.toUpperCase()
                        ? `${label} (${abbr})`
                        : abbr,
                value: row.percent,
                detail: `${RBTC_FORMAT.format(
                    parseFloat(formatUnits(row.rbtc, 18))
                )} ${rbtcAbbr}`,
                color: colors.get(TokenSettings(row.token).name.toUpperCase()),
            };
        });
    }, [status, t, ns, rbtcAbbr]);

    return (
        <div className="perfGlobalMetrics perfGlobalMetricsSplit">
            <div className="layout-card perfGlobalMetricsSplit__metrics">
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
            <div
                className="layout-card collateralDistribution"
                data-testid="performance-v1-collateral-distribution"
            >
                <div className="layout-card-title perfCardTitleV1">
                    <h1>
                        {t("performance.collateral.distributionTitle", {
                            ticker: rbtcAbbr,
                        })}
                    </h1>
                </div>
                <DistributionPieChart
                    slices={distributionSlices}
                    size={224}
                    displaySize={184}
                    gap={16}
                    sliceGap={1}
                    legendPosition="right"
                    legendLayout="column"
                    legendFlexBasis="auto"
                    legendMaxWidth="100%"
                    justifyContent="center"
                    valueFormatter={(value) => `${value.toFixed(2)}%`}
                />
            </div>
        </div>
    );
}
