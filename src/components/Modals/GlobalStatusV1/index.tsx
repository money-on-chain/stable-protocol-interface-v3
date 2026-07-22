import React from "react";

import type { SystemStatusResultV1 } from "../../../helpers/performanceV1";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings";

// v1 analogue of components/Modals/GlobalStatus — v1 has a single collateral
// bucket (RBTC backing DOC/BPro) instead of v3's caIndex-indexed collaterals,
// so this renders one collateralStatusCard fed by systemStatusV1's band +
// operations instead of iterating settings.tokens.CA. All layout classes are
// reused from the v3 modal (detailedGlobalStatusModal, collateralStatusCard,
// operationTable*, etc.) — no new CSS needed.
interface GlobalStatusModalV1Props {
    status: SystemStatusResultV1;
    hideModal: () => void;
}

const SEVERITY_BY_CLASS: Record<string, string> = {
    "status-positive": "positive",
    "status-neutral": "neutral",
    "status-negative": "negative",
};

export default function GlobalStatusModalV1(
    props: GlobalStatusModalV1Props
): JSX.Element {
    const { t } = useProjectTranslation();
    const { status, hideModal } = props;

    const caToken = settings.tokens.CA[0];
    const severity = SEVERITY_BY_CLASS[status.statusLabelClass] ?? "neutral";

    const rows = status.operations
        .filter((op) => op.action === "mint")
        .map((mintOp) => {
            const redeemOp = status.operations.find(
                (op) => op.action === "redeem" && op.token === mintOp.token
            );

            return {
                token: mintOp.token,
                iconClass:
                    mintOp.token === "TC_0" ? "icon-token-tc_0" : "icon-token-tp_0",
                mintAvailable: mintOp.available,
                redeemAvailable: redeemOp?.available ?? false,
            };
        });

    return (
        <div className="detailedGlobalStatusModal">
            <div className="collateralContainer">
                <div className="collateralStatusCard">
                    <div className="collateralTitle">
                        <div className="icon-token-ca_0"></div>
                        {caToken.fullName}
                    </div>

                    <div className="collateralDetails">
                        <div className={`collateralSummary ${severity}`}>
                            {t(status.titleKey)}
                        </div>

                        <div className="operationTableHeader">
                            <div className="operationCol tokenCol">
                                {t(
                                    "performance.v1.detailedStatus.headerOperations.token"
                                )}
                            </div>
                            <div className="operationCol">
                                {t(
                                    "performance.v1.detailedStatus.headerOperations.mint"
                                )}
                            </div>
                            <div className="operationCol">
                                {t(
                                    "performance.v1.detailedStatus.headerOperations.redeem"
                                )}
                            </div>
                        </div>

                        {rows.map((row) => (
                            <div key={row.token} className="operationTableRow">
                                <div className="operationCol tokenCol">
                                    <div className="tokenIconName">
                                        <div className={row.iconClass}></div>
                                        <span className="tokenLabel">
                                            {t(`exchange.tokens.${row.token}.label`)}
                                        </span>
                                    </div>
                                </div>
                                <div className="operationCol">
                                    <div
                                        className={`icon-status-${row.mintAvailable ? "success" : "alert"}`}
                                    />
                                </div>
                                <div className="operationCol">
                                    <div
                                        className={`icon-status-${row.redeemAvailable ? "success" : "alert"}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="cta">
                <button className="button" onClick={hideModal}>
                    {t("wallet.cta.close")}
                </button>
            </div>
        </div>
    );
}
