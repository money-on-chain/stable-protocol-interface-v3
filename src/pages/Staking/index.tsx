import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useEffect, useState } from "react";

import VestingStatusAlert from "../../components/Notification/VestingStatusAlert";
import Staking from "../../components/Staking";
import { useWalletContext } from "../../context/Wallet";
import settings from "../../settings/settings.json";

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
    }, [
        userOmocBalance.data,
        contractStatusOmoc.data,
        isVestingLoaded,
        vestingAddress,
    ]);

    return (
        <Fragment>
            <div className="section-container">
                <div className="sectionStaking">
                    {(settings.project === "moc" ||
                        settings.project === "voting") && (
                        <VestingStatusAlert />
                    )}
                    {ready ? <Staking /> : <Skeleton active />}
                </div>
            </div>
        </Fragment>
    );
}
