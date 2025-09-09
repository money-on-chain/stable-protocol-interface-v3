import React, { Fragment, useEffect, useState } from "react";
import { Skeleton } from "antd";

import { useWalletContext } from "../../context/Wallet";
import Voting from "../../components/Voting";
import UseVestingAlert from "../../components/Notification/UsingVestingAlert";
import "./Styles.scss";

export default function SectionVoting(): React.ReactElement {
    const { contractStatusOmoc, userOmocBalance, isVestingLoaded, vestingAddress } = useWalletContext()
    const [ready, setReady] = useState<boolean>(false);
    const [usingVestingAddress, setUsingVestingAddress] = useState<string>("");

    useEffect(() => {
        if (contractStatusOmoc.data && userOmocBalance.data) {
            setReady(true);
        }
        if (userOmocBalance.data && isVestingLoaded() && vestingAddress) {
            const vestingAddr = vestingAddress;
            setUsingVestingAddress(vestingAddr || "");
        } else {
            setUsingVestingAddress("");
        }
    }, [contractStatusOmoc.data, userOmocBalance.data, isVestingLoaded, vestingAddress]);

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
