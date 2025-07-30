import React, { Fragment, useEffect, useState } from "react";
import { Skeleton } from "antd";

import Performance from "../../components/Performance";
import { useWalletContext } from "../../context/Wallet";
import "./Styles.scss";


export default function SectionPerformance(): React.ReactElement {
    const { contractProtocolStatus } = useWalletContext()
    const [ready, setReady] = useState<boolean>(false);
    
    useEffect(() => {
        // Set component ready when contract status data is available
        if (contractProtocolStatus.data) {
            setReady(true);
        }
    }, [contractProtocolStatus.data]);

    return (
        <Fragment>
            <div className="section-container">
                <div className="content-page">
                    <div className={"content-performance layout-card-title"}>
                        {ready ? <Performance /> : <Skeleton active />}
                    </div>
                </div>
            </div>
        </Fragment>
    );
}
