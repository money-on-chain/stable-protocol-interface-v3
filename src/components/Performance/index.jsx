import React, { useContext, useState, useEffect } from "react";

import { useProjectTranslation } from "../../helpers/translations";
import { AuthenticateContext } from "../../context/Auth";
import CheckStatus from "../../helpers/checkStatus";
import settings from "../../settings/settings.json";
import Buckets from './buckets';
import TVL from './tvl'
import MultiCollateral from './multicollateral'


export default function Performance() {
    //const [isValid, setIsValid] = useState(true);
    const [statusIcon, setStatusIcon] = useState("");
    const [statusLabel, setStatusLabel] = useState("--");
    const [statusText, setStatusText] = useState("--");
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const { checkerStatus } = CheckStatus({caIndex: 0});
    useEffect(() => {
        if ((auth.contractStatusData, auth.userBalanceData)) {
            const { statusIcon, statusLabel, statusText } = checkerStatus();
            //setIsValid(isValid);
            setStatusIcon(statusIcon);
            setStatusLabel(statusLabel);
            setStatusText(statusText);
        }
    }, [auth.contractStatusData, auth.userBalanceData]);

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
                            <div className="stat-text">{statusText}</div>
                        </div>
                        <div className="coll-2">
                            <div className="stat-icon">
                                <div className={`${statusIcon}`}></div>
                                {statusLabel}
                            </div>
                            <div className="block-info">
                                {t("performance.status.showingBlock")}
                                {auth.contractStatusData
                                    ? BigInt(
                                          auth.contractStatusData.blockHeight
                                      ).toString()
                                    : "--"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Total Value Locked */}
            <TVL key={'tvl'} />

            {/* MultiCollateral */}
            <MultiCollateral key={'multicollateral'} />

            {/* Collateral Token */}
            {settings.tokens.CA.map(function(tokenSetting, caIndex){
                return <Buckets tokenSettings={tokenSetting} caIndex={caIndex} key={caIndex} />;
            })}
        </div>
    );
}
