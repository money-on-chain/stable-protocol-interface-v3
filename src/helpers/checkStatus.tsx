import { useWalletContext } from "../context/Wallet";
import settings from "../settings/settings.json";
import { useProjectTranslation } from "./translations";


interface StatusResult {
    globalStatus: number;
    statusLabel: string;
    statusLabelClass: string;
    statusText: string;
    statusCode: number[];
}

function CheckStatusCA(contractProtocolStatus: any, caIndex: number): number {
    /* Status Code:
    -1: Error - 
     0: Optimal - globalCoverage > getCtargemaCA
     1: Warning - globalCoverage > protThrld && globalCoverage <= getCtargemaCA
     2: Protected Mode - globalCoverage > liqThrld && globalCoverage <= protThrld
     3: Liquidated or in process of liquidation - contractStatusData[caIndex].liquidated
     4: Paused - contractStatusData[caIndex].paused
     5: Can't operate - !contractStatusData.canOperate
    */

    let statusCode: number = -1;

    if (!contractProtocolStatus.data) return statusCode;

    const globalCoverage = contractProtocolStatus.data[caIndex].getCglb;
    const getCtargemaCA = contractProtocolStatus.data[caIndex].getCtargemaCA;
    const liqThrld = contractProtocolStatus.data[caIndex].liqThrld;
    const protThrld = contractProtocolStatus.data[caIndex].protThrld;

    if (globalCoverage > getCtargemaCA) {
        statusCode = 0;
    } else if (globalCoverage > protThrld && globalCoverage <= getCtargemaCA) {
        statusCode = 1;
    } else if (globalCoverage.gt(liqThrld) && globalCoverage.lte(protThrld)) {
        statusCode = 2;
    } else {
        statusCode = 3;
    }

    if (contractProtocolStatus.data[caIndex].liquidated) {
        statusCode = 3;
    }

    if (contractProtocolStatus.data[caIndex].paused) {
        statusCode = 4;
    }

    if (!contractProtocolStatus.data.canOperate) {
        statusCode = 5;
    }

    return statusCode;
}

function CheckStatusGlobal() {
    const { t } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext()

    const checkerStatus = (): StatusResult => {
        let statusLabel: string = "--";
        let statusLabelClass: string = "";
        let statusText: string = "--";

        const statusCode: number[] = [];
        let statusCodeCA: number = -1;
        let countValid: number = 0;
        let countProtected: number = 0;
        for (let caIndex = 0; caIndex < settings.tokens.CA.length; caIndex++) {
            statusCodeCA = CheckStatusCA(contractProtocolStatus, caIndex);
            statusCode.push(statusCodeCA);

            if (statusCodeCA < 1) {
                countValid += 1;
            }

            if (statusCodeCA >= 2) {
                countProtected += 1;
            }
        }

        let globalStatus: number = -1;
        if (countValid === settings.tokens.CA.length) {
            // This OK no problems, Optimal status
            statusLabel = t("performance.status.statusTitleFull");
            statusLabelClass = "status-positive";
            statusText = t("performance.status.statusDescriptionFull");
            globalStatus = 0;
        } else if (countValid > 0 && countValid < settings.tokens.CA.length) {
            // One or more collaterals have some warnings but not all, Good status
            statusLabel = t("performance.status.statusTitleGood");
            statusLabelClass = "status-positive";
            statusText = t("performance.status.statusDescriptionGood");
            globalStatus = 1;
        } else if (
            countValid == 0 &&
            countProtected < settings.tokens.CA.length
        ) {
            // Both is under coverage and one or more collaterals are in protected mode
            statusLabel = "Partially Operational";
            statusLabelClass = "status-neutral";
            statusText = "Partially Operational";
            globalStatus = 2;
        } else if (
            countValid == 0 &&
            countProtected === settings.tokens.CA.length
        ) {
            statusLabel = "Protected Mode";
            statusLabelClass = "status-negative";
            statusText = "Protected Mode";
            globalStatus = 3;
        }

        return {
            globalStatus,
            statusLabel,
            statusLabelClass,
            statusText,
            statusCode,
        };
    };

    return { checkerStatus };
}

export { CheckStatusGlobal };
