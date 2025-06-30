import React from "react";
import PropTypes from "prop-types";
import settings from "../../../settings/settings.json";

import { useProjectTranslation } from "../../../helpers/translations";

export default function StatusBucket(props) {
    const space = "\u00A0";
    const { t, ns } = useProjectTranslation();
    const { statusCode, caIndex } = props;

    let statusText = "";
    switch (statusCode[caIndex]) {
        case 0:
            statusText =
                "This collateral is fully Operational. Can mint and redeem.";
            break;
        case 1:
            statusText =
                "This collateral is partially Operational. Can mint and redeem TP. Can't redeem TC.";
            break;
        case 2:
            statusText =
                "This collateral is in Protected Mode. No operations allowed.";
            break;
        case 3:
            statusText =
                "This collateral is Liquidated or in process of liquidation. No operations allowed.";
            break;
    }

    return (
        <div className="detailedGlobalStatus">
            <div className="collateral">
                <div className={`icon-token-ca_${caIndex}`}></div>
                {settings.tokens.CA[caIndex].fullName} {space}Collateral
                {/* <h2>
                {t(`exchange.tokens.CA_${caIndex}.label`, {
                    ns: ns,
                })}
                {space}Collateral
            </h2> */}
            </div>
            <div
                className="detailedStatus__detail_explanation"
                style={{ color: "green" }}
            >
                {" "}
                <div className="detailedStatus__signifier"></div>
                {statusText}
            </div>
        </div>
    );
}

StatusBucket.propTypes = {
    statusCode: PropTypes.array,
};
