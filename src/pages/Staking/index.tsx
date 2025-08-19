import React, { Fragment, useState, useEffect } from "react";
import { Skeleton } from "antd";

import Staking from "../../components/Staking";
import UseVestingAlert from "../../components/Notification/UsingVestingAlert";
import { useWalletContext } from "../../context/Wallet";

import "./Styles.scss";

export default function SectionStaking(): React.ReactElement {
    const { contractProtocolStatus, userBalance, isVestingLoaded, vestingAddress } = useWalletContext()
    const [ready, setReady] = useState<boolean>(false);
    const [usingVestingAddress, setUsingVestingAddress] = useState<string>("");
    
    useEffect(() => {
        if (contractProtocolStatus.data) {
            setReady(true);
        }
        if (userBalance.data && isVestingLoaded()) {
            const vestingAddr = vestingAddress;
            setUsingVestingAddress(vestingAddr || "");
        } else {
            setUsingVestingAddress("");
        }
    }, [userBalance.data, contractProtocolStatus.data]);

    return (
        <Fragment>
            <div className="section-container">
                <div className="sectionStaking">
                    {usingVestingAddress !== "" && (
                        <UseVestingAlert address={usingVestingAddress} />
                    )}
                    {ready ? <Staking /> : <Skeleton active />}
                </div>
            </div>
        </Fragment>
    );
}
