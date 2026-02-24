import { Skeleton } from "antd";
import React, { Fragment, useEffect, useState } from "react";

import Exchange from "../../components/Exchange";
import LastOperations from "../../components/Tables/LastOperations";
import { useWalletContext } from "../../context/Wallet";
import { useProjectTranslation } from "../../helpers/translations";

export default function SectionCombinedOperations(): React.ReactElement {
    const { t } = useProjectTranslation();

    const { contractProtocolStatus, userBalance } = useWalletContext();
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
                        <h1>Combined Operations</h1>
                    </div>

                    <div className={"content-body layout-card-content"}>
                        {ready ? <Exchange isCombinedOperation={true} /> : <Skeleton active />}
                    </div>
                </div>

                <div className="section__innerCard--big content-last-operations">
                    <LastOperations token={"all"}></LastOperations>
                </div>
            </div>
        </Fragment>
    );
}
