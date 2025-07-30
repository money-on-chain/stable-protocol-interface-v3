import React, { Fragment, useState, useEffect } from "react";
import { Skeleton } from "antd";

import LastOperations from "../../components/Tables/LastOperations";
import { useProjectTranslation } from "../../helpers/translations";
import Exchange from "../../components/Exchange";
import "./Styles.scss";
import { useWalletContext } from "../../context/Wallet";

export default function SectionExchange(): React.ReactElement {
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
                {/* Exchange */}
                <div className={"layout-card"}>
                    <div className={"layout-card-title"}>
                        <h1>{t("exchange.cardTitle")}</h1>
                    </div>

                    <div className={"content-body layout-card-content"}>
                        {ready ? <Exchange /> : <Skeleton active />}
                    </div>
                </div>

                <div className="section__innerCard--big content-last-operations">
                    <LastOperations token={"all"}></LastOperations>
                </div>
            </div>
        </Fragment>
    );
}
