import React from "react";
import PropTypes from "prop-types";

import { useProjectTranslation } from "../../../helpers/translations";


export default function StatusBucket(props) {
    const { t, ns } = useProjectTranslation();
    const { statusCode, caIndex } = props;
    
    let statusText = "";
    switch (statusCode[caIndex]) {
        case 0:
            statusText = "Fully Operational. Can mint and redeem.";
            break;
        case 1:
            statusText = "Partially Operational. Can mint and redeem TP. Can't redeem TC.";
            break;
        case 2:
            statusText = "Protected Mode. No operations allowed.";
            break;
        case 3:
            statusText = "Liquidated or in process of liquidation. No operations allowed.";
            break;
    }
    
    return (
        <div>
            <h1>
                {t(`exchange.tokens.CA_${caIndex}.label`, {
                    ns: ns,
                })}
                 Collateral
            </h1>
            <div style={{color: 'green'}}>{statusText}</div>
        </div>
    );
}

StatusBucket.propTypes = {
    statusCode: PropTypes.array    
};
