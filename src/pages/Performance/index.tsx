import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useState } from "react";

import Performance from "../../components/Performance";
import { useWalletContext } from "../../context/Wallet";

export default function SectionPerformance(): React.ReactElement {
    const { contractProtocolStatus } = useWalletContext();
    const [ready, setReady] = useState<boolean>(true);

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
