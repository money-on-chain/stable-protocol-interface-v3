import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useEffect, useState } from "react";

// import UseVestingAlert from "../../components/Notification/UsingVestingAlert";
import VestingStatusAlert from "../../components/Notification/VestingStatusAlert";

import Staking from "../../components/Staking";
import { useWalletContext } from "../../context/Wallet";

export default function SectionStaking(): React.ReactElement {
    const {
        contractStatusOmoc,
        userOmocBalance,
        isVestingLoaded,
        vestingAddress,
    } = useWalletContext();
    const [ready, setReady] = useState<boolean>(false);
    const [usingVestingAddress, setUsingVestingAddress] = useState<string>("");

    useEffect(() => {
        if (contractStatusOmoc.data && userOmocBalance.data) {
            setReady(true);
        }
        if (userOmocBalance.data && isVestingLoaded()) {
            const vestingAddr = vestingAddress;
            setUsingVestingAddress(vestingAddr || "");
        } else {
            setUsingVestingAddress("");
        }
    }, [userOmocBalance.data, contractStatusOmoc.data]);

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
