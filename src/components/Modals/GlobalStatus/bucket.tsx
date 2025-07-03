import React from "react";
import settings from "../../../settings/settings.json";
import { useProjectTranslation } from "../../../helpers/translations";

// Type definitions
interface StatusBucketProps {
    statusCode: number[];
    caIndex: number;
}

interface Permissions {
    mint: boolean;
    redeem: boolean;
}

interface Summary {
    label: string;
    severity: string;
}

interface Operation {
    name: string;
    iconClass: string;
    mintAllowed: boolean;
    redeemAllowed: boolean;
}

export default function StatusBucket(props: StatusBucketProps): JSX.Element {
    const { t } = useProjectTranslation();
    const { statusCode, caIndex } = props;

    const tpTokens = settings.tokens.TP;
    const tcTokens = settings.tokens.TC;
    const caToken = settings.tokens.CA[caIndex];
    const leveragedToken = tcTokens[caIndex];

    const status: number = statusCode[caIndex];

    const collateralPermissionsByStatus: { [key: number]: Permissions } = {
        0: { mint: true, redeem: true },
        1: { mint: true, redeem: false },
        2: { mint: false, redeem: false },
        3: { mint: false, redeem: false },
    };

    const peggedPermissionsByStatus: { [key: number]: Permissions } = {
        0: { mint: true, redeem: true },
        1: { mint: false, redeem: true },
        2: { mint: false, redeem: false },
        3: { mint: false, redeem: false },
    };

    const caPermissions: Permissions = collateralPermissionsByStatus[status] || { mint: false, redeem: false };
    const tpPermissions: Permissions = peggedPermissionsByStatus[status] || { mint: false, redeem: false };

    const summaryMap: { [key: number]: Summary } = {
        0: {
            label: t(
                "performance.detailedStatus.collateralStatus.fullyOperational"
            ),
            severity: "positive",
        },
        1: {
            label: t(
                "performance.detailedStatus.collateralStatus.partiallyOperational"
            ),
            severity: "neutral",
        },
        2: {
            label: t(
                "performance.detailedStatus.collateralStatus.protectedMode"
            ),
            severity: "negative",
        },
        3: {
            label: t("performance.detailedStatus.collateralStatus.liquidated"),
            severity: "negative",
        },
    };

    const summary: Summary = summaryMap[status] || { label: "--", severity: "neutral" };

    const operations: Operation[] = [
        ...tpTokens.map((tp, index) => ({
            name: tp.name,
            iconClass: `icon-token-tp_${index}`,
            mintAllowed: tpPermissions.mint,
            redeemAllowed: tpPermissions.redeem,
        })),
        {
            name: leveragedToken.name,
            iconClass: `icon-token-tc_${caIndex}`,
            mintAllowed: caPermissions.mint,
            redeemAllowed: caPermissions.redeem,
        },
    ];

    return (
        <div className="collateralStatusCard">
            <div className="collateralTitle">
                <div className={`icon-token-ca_${caIndex}`}></div>
                {caToken.fullName}
            </div>

            <div className="collateralDetails">
                <div className={`collateralSummary ${summary.severity}`}>
                    {summary.label}
                </div>

                <div className="operationTableHeader">
                    <div className="operationCol tokenCol">
                        {t("performance.detailedStatus.headerOperations.token")}
                    </div>
                    <div className="operationCol">
                        {t("performance.detailedStatus.headerOperations.mint")}
                    </div>
                    <div className="operationCol">
                        {t(
                            "performance.detailedStatus.headerOperations.redeem"
                        )}
                    </div>
                </div>

                {operations.map((op, index) => (
                    <div key={index} className="operationTableRow">
                        <div className="operationCol tokenCol">
                            <div className="tokenIconName">
                                <div className={op.iconClass}></div>
                                <span className="tokenLabel">{op.name}</span>
                            </div>
                        </div>
                        <div className="operationCol">
                            <div
                                className={`icon-status-${op.mintAllowed ? "success" : "alert"}`}
                            />
                        </div>
                        <div className="operationCol">
                            <div
                                className={`icon-status-${op.redeemAllowed ? "success" : "alert"}`}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
