import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useEffect, useState } from "react";

import Vesting from "../../components/Vesting";
import { useWalletContext } from "../../context/Wallet";

export default function SectionVesting(): React.ReactElement {
    const { contractStatusOmoc } = useWalletContext();
    const [ready, setReady] = useState<boolean>(false);

    useEffect(() => {
        if (contractStatusOmoc.data) {
            setReady(true);
        }
    }, [contractStatusOmoc.data]);

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
