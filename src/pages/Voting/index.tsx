import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useMemo } from "react";

import VestingStatusAlert from "../../components/Notification/VestingStatusAlert";
import Voting from "../../components/Voting";
import { useWalletContext } from "../../context/Wallet";
import settings from "../../settings";

export default function SectionVoting(): React.ReactElement {
    const {
        contractStatusOmoc,
        userOmocBalance,
        isVestingLoaded,
        vestingAddress,
    } = useWalletContext();

    const ready = !!(contractStatusOmoc.data && userOmocBalance.data);

    const usingVestingAddress = useMemo(() => {
        if (userOmocBalance.data && isVestingLoaded() && vestingAddress) {
            return vestingAddress;
        }
        return "";
    }, [userOmocBalance.data, isVestingLoaded, vestingAddress]);

    return (
        <Fragment>
            <div className="section-container">
                <div className="content-page">
                    {(settings.project === "moc" ||
                        settings.project === "voting") && (
                        <VestingStatusAlert />
                    )}
                </div>
                {ready ? <Voting /> : <Skeleton active />}
            </div>
        </Fragment>
    );
}
