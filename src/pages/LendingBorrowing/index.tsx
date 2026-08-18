import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useMemo } from "react";

import VestingStatusAlert from "../../components/Notification/VestingStatusAlert";
import LendingBorrowing from "../../components/LendingBorrowing";
import { useWalletContext } from "../../context/Wallet";
import settings from "../../settings/settings.json";

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
            <div className="">
                {ready ? <LendingBorrowing /> : <Skeleton active />}
            </div>
        </Fragment>
    );
}
