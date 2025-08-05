import React, { Fragment, useEffect, useState } from "react";
import { Skeleton } from "antd";

import { useWalletContext } from "../../context/Wallet";
import Voting from "../../components/Voting";
import UseVestingAlert from "../../components/Notification/UsingVestingAlert";
import "./Styles.scss";

export default function SectionVoting(): React.ReactElement {
    const { contractProtocolStatus, userBalance, isVestingLoaded, vestingAddress } = useWalletContext()
    const [ready, setReady] = useState<boolean>(false);
    const [usingVestingAddress, setUsingVestingAddress] = useState<string>("");

    useEffect(() => {
        if (contractProtocolStatus.data) {
            setReady(true);
        }
        if (userBalance.data && isVestingLoaded()) {
            const vAddress = vestingAddress();
            setUsingVestingAddress(vAddress || "");
        } else {
            setUsingVestingAddress("");
        }
    }, [contractProtocolStatus.data, userBalance.data, isVestingLoaded, vestingAddress]);

    return (
        <Fragment>
            <div className="section-container">
                {usingVestingAddress !== "" && (
                    <div className={"content-page"}>
                        {<UseVestingAlert address={usingVestingAddress} />}
                    </div>
                )}
                {ready ? <Voting /> : <Skeleton active />}
            </div>
        </Fragment>
    );
}
