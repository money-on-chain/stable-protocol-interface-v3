import { useContext } from "react";
import { BigNumber } from "bignumber.js";

import { useProjectTranslation } from "./translations";
import { AuthenticateContext } from "../context/Auth";
import { fromContractPrecisionDecimals } from "./Formats";
import settings from "../settings/settings.json";


function CheckStatusCA(auth, caIndex) {
    /* Status Code:
    -1: Error - !auth.contractStatusData
     0: Optimal - globalCoverage > getCtargemaCA
     1: Warning - globalCoverage > protThrld && globalCoverage <= getCtargemaCA
     2: Protected Mode - globalCoverage > liqThrld && globalCoverage <= protThrld
     3: Liquidated or in process of liquidation - auth.contractStatusData[caIndex].liquidated
     4: Paused - auth.contractStatusData[caIndex].paused
     5: Can't operate - !auth.contractStatusData.canOperate
    */
    
    let statusCode = -1;
    
    if (!auth.contractStatusData)
        return statusCode
        
    const globalCoverage = new BigNumber(
        fromContractPrecisionDecimals(
            auth.contractStatusData[caIndex].getCglb,
            settings.tokens.CA[caIndex].decimals
        )
    );
    const getCtargemaCA = new BigNumber(
        fromContractPrecisionDecimals(
            auth.contractStatusData[caIndex].getCtargemaCA,
            settings.tokens.CA[caIndex].decimals
        )
    );
    const liqThrld = new BigNumber(
        fromContractPrecisionDecimals(
            auth.contractStatusData[caIndex].liqThrld,
            settings.tokens.CA[caIndex].decimals
        )
    );
    const protThrld = new BigNumber(
        fromContractPrecisionDecimals(
            auth.contractStatusData[caIndex].protThrld,
            settings.tokens.CA[caIndex].decimals
        )
    );

    if (globalCoverage.gt(getCtargemaCA)) {        
        statusCode = 0;        
    } else if (
        globalCoverage.gt(protThrld) &&
        globalCoverage.lte(getCtargemaCA)
    ) {        
        statusCode = 1;        
    } else if (
        globalCoverage.gt(liqThrld) &&
        globalCoverage.lte(protThrld)
    ) {        
        statusCode = 2;        
    } else {
        statusCode = 3;
    }

    if (auth.contractStatusData[caIndex].liquidated) {        
        statusCode = 3;        
    }

    if (auth.contractStatusData[caIndex].paused) {        
        statusCode = 4;        
    }

    if (!auth.contractStatusData.canOperate) {        
        statusCode = 5;        
    }

    
    return statusCode
}


function CheckStatusGlobal() {

    const { t } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    const checkerStatus = () => {
        
        let statusIcon = "";
        let statusLabel = "--";
        let statusText = "--";
        
        let statusCode = [];
        let statusCodeCA = -1;
        let countValid = 0;        
        let countProtected = 0;
        for (let caIndex = 0; caIndex < settings.tokens.CA.length; caIndex++) {
            
            statusCodeCA = CheckStatusCA(auth, caIndex)            
            statusCode.push(statusCodeCA)
            
            if (statusCodeCA < 1) {
                countValid += 1
            }

            if (statusCodeCA >= 2) {
                countProtected += 1
            }
        }

        let globalStatus = -1;        
        if (countValid === settings.tokens.CA.length){
            // This OK no problems, Optimal status
            statusIcon = "icon-status-success";
            statusLabel = t("performance.status.statusTitleFull");
            statusText = t("performance.status.statusDescriptionFull");
            globalStatus = 0;            
        } else if (countValid > 0 && countValid < settings.tokens.CA.length) {
            // One or more collaterals have some warnings but not all, Good status
            statusIcon = "icon-status-warning";
            statusLabel = "Good condition";
            statusText = "Some of the collaterals may have some warnings";
            globalStatus = 1;            
        } else if (countValid == 0 && countProtected < settings.tokens.CA.length) {
            // Both is under coverage and one or more collaterals are in protected mode
            statusIcon = "icon-status-warning";
            statusLabel = "Partially Operational";
            statusText = "Partially Operational";
            globalStatus = 2;            
        } else if (countValid == 0 && countProtected === settings.tokens.CA.length) {
            statusIcon = "icon-status-warning";
            statusLabel = "Protected Mode";
            statusText = "Protected Mode";
            globalStatus = 3;
        }

        return { globalStatus, statusIcon, statusLabel, statusText, statusCode }        
    }

    return { checkerStatus };

}

export {
    CheckStatusGlobal
};
