import React, { Fragment, useEffect, useState } from "react";
import { Skeleton } from "antd";

import { useWalletContext } from "../../context/Wallet";
import Vesting from "../../components/Vesting";
import "./Styles.scss";

export default function SectionVesting(): React.ReactElement {
    const { contractProtocolStatus } = useWalletContext()
    const [ready, setReady] = useState<boolean>(false);
    
    useEffect(() => {
        if (contractProtocolStatus.data) {
            setReady(true);
        }
    }, [contractProtocolStatus.data]);

    return (
        <Fragment>
            <div className="section-container">
                <div className={"content-vesting"}>
                    {ready ? <Vesting /> : <Skeleton active />}
                </div>
            </div>
        </Fragment>
    );
}
