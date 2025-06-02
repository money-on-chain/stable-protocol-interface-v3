import { useContext } from "react";
import { BigNumber } from "bignumber.js";

import { useProjectTranslation } from "./translations";
import { AuthenticateContext } from "../context/Auth";
import { fromContractPrecisionDecimals } from "./Formats";
import settings from "../settings/settings.json";

function CheckStatus(props) {
    const { caIndex } = props;
    const { t } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const checkerStatus = () => {
        let isValid = true;
        let statusIcon = "";
        let statusLabel = "--";
        let statusText = "--";
        let errorType = "-1";
        if (!auth.contractStatusData)
            return {
                isValid,
                statusIcon,
                statusLabel,
                statusText,
                errorType,
                checkerStatus,
            };

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
            statusIcon = "icon-status-success";
            statusLabel = t("performance.status.statusTitleFull");
            statusText = t("performance.status.statusDescriptionFull");
            errorType = "0";
            isValid = true;
        } else if (
            globalCoverage.gt(protThrld) &&
            globalCoverage.lte(getCtargemaCA)
        ) {
            statusIcon = "icon-status-warning";
            statusLabel = t("performance.status.stuatusTitleWarning");
            statusText = t("performance.status.statusDescriptionWarning");
            errorType = "1";
            isValid = false;
        } else if (
            globalCoverage.gt(liqThrld) &&
            globalCoverage.lte(protThrld)
        ) {
            statusIcon = "icon-status-warning";
            statusLabel = "Protected Mode";
            statusText = "No operations allowed";
            errorType = "2";
            isValid = false;
        }

        if (auth.contractStatusData[caIndex].liquidated) {
            statusIcon = "icon-status-warning";
            statusLabel = t("performance.status.statusTitleLiquidated");
            statusText = t("performance.status.statusDescriptionLiquidated");
            errorType = "3";
            isValid = false;
        }

        if (auth.contractStatusData[caIndex].paused) {
            statusIcon = "icon-status-warning";
            statusLabel = t("performance.status.statusTitlePaused");
            statusText = t("performance.status.statusDescriptionPaused");
            errorType = "4";
            isValid = false;
        }

        if (!auth.contractStatusData.canOperate) {
            statusIcon = "icon-status-warning";
            statusLabel = t("performance.status.statusTitleUnavailable");
            statusText = t("performance.status.statusDescreiptionUnavailable");
            errorType = "5";
            isValid = false;
        }

        return { isValid, statusIcon, statusLabel, statusText, errorType };
    };
    return { checkerStatus };
}


function CheckStatusGlobal() {

    const { t } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    const checkerStatus = () => {
        let chkStatus;
        let countValid = 0;
        let isValid = true;
        let statusIcon = "";
        let statusLabel = "--";
        let statusText = "--";
        let errorType = "-1";

        for (let caIndex = 0; caIndex < settings.tokens.CA.length; caIndex++) {
            /*chkStatus = CheckStatus({caIndex})
            //const { checkerStatus } = CheckStatus({caIndex})
            if (chkStatus.checkerStatus().isValid) {
                countValid += 1
            }*/

            if (!auth.contractStatusData)
                return {
                    isValid,
                    statusIcon,
                    statusLabel,
                    statusText,
                    errorType,
                    checkerStatus,
                };

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
                statusIcon = "icon-status-success";
                statusLabel = t("performance.status.statusTitleFull");
                statusText = t("performance.status.statusDescriptionFull");
                errorType = "0";
                isValid = true;
            } else if (
                globalCoverage.gt(protThrld) &&
                globalCoverage.lte(getCtargemaCA)
            ) {
                statusIcon = "icon-status-warning";
                statusLabel = t("performance.status.stuatusTitleWarning");
                statusText = t("performance.status.statusDescriptionWarning");
                errorType = "1";
                isValid = false;
            } else if (
                globalCoverage.gt(liqThrld) &&
                globalCoverage.lte(protThrld)
            ) {
                statusIcon = "icon-status-warning";
                statusLabel = "Protected Mode";
                statusText = "No operations allowed";
                errorType = "2";
                isValid = false;
            }

            if (auth.contractStatusData[caIndex].liquidated) {
                statusIcon = "icon-status-warning";
                statusLabel = t("performance.status.statusTitleLiquidated");
                statusText = t("performance.status.statusDescriptionLiquidated");
                errorType = "3";
                isValid = false;
            }

            if (auth.contractStatusData[caIndex].paused) {
                statusIcon = "icon-status-warning";
                statusLabel = t("performance.status.statusTitlePaused");
                statusText = t("performance.status.statusDescriptionPaused");
                errorType = "4";
                isValid = false;
            }

            if (!auth.contractStatusData.canOperate) {
                statusIcon = "icon-status-warning";
                statusLabel = t("performance.status.statusTitleUnavailable");
                statusText = t("performance.status.statusDescreiptionUnavailable");
                errorType = "5";
                isValid = false;
            }

            if (isValid) {
                countValid += 1
            }
        }

        if (countValid > 0 && countValid < settings.tokens.CA.length) {
            statusIcon = "icon-status-warning";
            statusLabel = "Good condition";
            statusText = "Some of the collaterals may have some warnings";
            errorType = "6";
            isValid = true;
        }

        chkStatus = { isValid, statusIcon, statusLabel, statusText, errorType }

        return chkStatus
    }

    return { checkerStatus };

}

export {
    CheckStatus,
    CheckStatusGlobal
};
