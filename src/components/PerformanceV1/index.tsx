import "./Styles.scss";

import React, { useMemo } from "react";

import { useWalletContext } from "../../context/Wallet";
import { systemStatusV1 } from "../../helpers/performanceV1";
import { useProjectTranslation } from "../../helpers/translations";
import CollateralV1 from "./collateral";
import GlobalMetricsV1 from "./globalMetrics";
import TokensV1 from "./tokens";
import TVLV1 from "./tvl";

// v1 port of components/Performance, following the same card layout (system
// status + dataGroup metric cards) but sourced from contractProtocolStatusV1's
// flat, single-bucket data instead of v3's caIndex-indexed one. The legacy
// dapp's Metrics page had no details modal for system status — it listed
// available operations inline instead — so that's kept here too (see
// helpers/performanceV1.ts's systemStatusV1 for the mint/redeem availability
// per coverage band).
export default function PerformanceV1(): React.ReactElement {
    const space = " ";
    const { t } = useProjectTranslation();
    const { contractProtocolStatusV1, blockNumber } = useWalletContext();

    const status = useMemo(
        () => systemStatusV1(contractProtocolStatusV1.data),
        [contractProtocolStatusV1.data]
    );

    return (
        <div className="section sectionPerformance">
            {/* System Status */}
            <div className="section__innerCard--small dash__perfSystemStatus">
                <div className="card-system-status">
                    <div className="layout-card-title">
                        <h1>{t("performance.status.cardTitle")}</h1>
                    </div>

                    <div className="card-content">
                        <div className="coll-1">
                            <div className="stat-icon">
                                <div className="status-lights-container">
                                    <div
                                        className={`icon-status-lights-lamp icon-status-lights-${status.statusLabelClass}`}
                                    ></div>
                                    <div className="icon-status-lights"></div>
                                </div>
                                <div
                                    className={`stat-label ${status.statusLabelClass}`}
                                >
                                    {t(status.titleKey)}
                                    <div className="block-info">
                                        {t("performance.status.showingBlock")}
                                        {space}
                                        {blockNumber
                                            ? blockNumber.toString()
                                            : "--"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="coll-2">
                            <div className="status-text">
                                {t(status.descriptionKey)}
                            </div>
                        </div>
                    </div>

                    <div className="systemOperationsV1">
                        <h2 className="systemOperationsV1__title">
                            {t("performance.v1.systemOperationsTitle")}
                        </h2>
                        <div className="systemOperationsV1__list">
                            {status.operations.map((op) => (
                                <div
                                    key={`${op.action}-${op.token}`}
                                    className="systemOperationsV1__item"
                                    data-testid={`performance-v1-operation-${op.action}-${op.token}`}
                                >
                                    <div
                                        className={
                                            op.available
                                                ? "icon-status-success"
                                                : "icon-status-error"
                                        }
                                    ></div>
                                    <span>
                                        {t(
                                            op.action === "mint"
                                                ? "performance.v1.operationMint"
                                                : "performance.v1.operationRedeem",
                                            {
                                                ticker: t(
                                                    `exchange.tokens.${op.token}.abbr`
                                                ),
                                            }
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Total Value Locked */}
            <TVLV1 />

            {/* Coverage / target coverage / leverage */}
            <GlobalMetricsV1 />

            {/* Collateral (RBTC price/EMA/total) */}
            <CollateralV1 />

            {/* Per-token metrics (DOC/BPro/MOC) */}
            <TokensV1 />
        </div>
    );
}
