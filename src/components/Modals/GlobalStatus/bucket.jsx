import React from "react";
import PropTypes from "prop-types";
import settings from "../../../settings/settings.json";

import { useProjectTranslation } from "../../../helpers/translations";

export default function StatusBucket(props) {
    const space = "\u00A0";
    const { t, ns } = useProjectTranslation();
    const { statusCode, caIndex } = props;

    let summary = "";
    let operations = [];

    switch (statusCode[caIndex]) {
        case 0:
            summary = t(
                "performance.detailedStatus.collateralStatus.fullyOperational"
            );
            operations = [
                {
                    label: t("performance.detailedStatus.operations.mintTP", {
                        ns,
                    }),
                    allowed: true,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: true,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: true,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: true,
                },
            ];
            break;
        case 1:
            summary = t(
                "performance.detailedStatus.collateralStatus.partiallyOperational"
            );
            operations = [
                {
                    label: t("performance.detailedStatus.operations.mintTP", {
                        ns,
                    }),
                    allowed: true,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: true,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: false,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: false,
                },
            ];
            break;
        case 2:
            summary = t(
                "performance.detailedStatus.collateralStatus.protectedMode"
            );
            operations = [
                {
                    label: t("performance.detailedStatus.operations.mintTP", {
                        ns,
                    }),
                    allowed: false,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: false,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: false,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: false,
                },
            ];
            break;
        case 3:
            summary = t(
                "performance.detailedStatus.collateralStatus.liquidated"
            );
            operations = [
                {
                    label: t("performance.detailedStatus.operations.mintTP", {
                        ns,
                    }),
                    allowed: false,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: false,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: false,
                },
                {
                    label: t("performance.detailedStatus.operations.redeemTC", {
                        ns,
                    }),
                    allowed: false,
                },
            ];
            break;
    }

    return (
        <div className="detailedCollateralStatus">
            <div className="collateralTitle">
                <div className={`icon-token-ca_${caIndex}`}></div>
                {settings.tokens.CA[caIndex].fullName}
            </div>
            <div className="collateralDetails">
                <div className="collateralSummary">{summary}</div>
                <ul>
                    {operations.map((op, index) => (
                        <li
                            className="detailedStatus__operation"
                            key={index}
                            style={{
                                color: op.allowed ? "positive" : "negative",
                            }}
                        >
                            <div
                                className={`icon-status-${op.allowed ? "success" : "alert"}`}
                            ></div>
                            <div
                                className={`detailedStatus ${op.allowed ? "positive" : "negative"}`}
                            >
                                {op.label}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

StatusBucket.propTypes = {
    statusCode: PropTypes.array,
};
