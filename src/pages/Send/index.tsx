import React, { Fragment, useState, useEffect } from "react";
import { Skeleton } from "antd";

import LastOperations from "../../components/Tables/LastOperations";
import { useProjectTranslation } from "../../helpers/translations";
import Send from "../../components/Send";
import { useWalletContext } from "../../context/Wallet";
import "./Styles.scss";

export default function SectionSend(): React.ReactElement {
    const { t } = useProjectTranslation();
    
    const { contractProtocolStatus, userBalance } = useWalletContext()
    const [ready, setReady] = useState<boolean>(false);
    
    useEffect(() => {
        // Set component ready when contract status data is available
        if (contractProtocolStatus.data && userBalance.data) {
            setReady(true);
        }
    }, [contractProtocolStatus.data, userBalance.data]);
    
    return (
        <Fragment>
            <div className="section-container">
                {/* Send */}
                <div className="layout-card">
                    <div className={"layout-card-title"}>
                        <h1>{t("send.cardTitle")}</h1>
                    </div>

                    <div className={"content-body"}>
                        {ready ? <Send /> : <Skeleton active />}
                    </div>
                </div>

                <div className="section__innerCard--big content-last-operations">
                    <LastOperations token={"all"}></LastOperations>
                </div>
            </div>
        </Fragment>
    );
}
