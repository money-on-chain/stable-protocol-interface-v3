import "../Performance/Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment } from "react";

import PerformanceV1 from "../../components/PerformanceV1";
import { useWalletContext } from "../../context/Wallet";

export default function SectionPerformanceV1(): React.ReactElement {
    const { contractProtocolStatusV1 } = useWalletContext();

    const ready = !!contractProtocolStatusV1.data;

    return (
        <Fragment>
            <div className="section-container">
                <div className="content-page">
                    <div className={"content-performance layout-card-title"}>
                        {ready ? <PerformanceV1 /> : <Skeleton active />}
                    </div>
                </div>
            </div>
        </Fragment>
    );
}
