import "../Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useEffect, useState } from "react";

import VetoWithdraw from "../../../components/Voting/Veto/Withdraw";
import { useWalletContext } from "../../../context/Wallet";

export default function SectionVetoWithdraw(): React.ReactElement {
    const { contractStatusOmoc, userBalance, isVestingLoaded, vestingAddress } =
        useWalletContext();
    const [ready, setReady] = useState<boolean>(false);
    const [usingVestingAddress, setUsingVestingAddress] = useState<string>("");

    useEffect(() => {
        if (contractStatusOmoc.data) {
            setReady(true);
        }
        if (userBalance.data && isVestingLoaded()) {
            const vAddress = vestingAddress || "";
            setUsingVestingAddress(vAddress);
        } else {
            setUsingVestingAddress("");
        }
    }, [
        contractStatusOmoc.data,
        userBalance.data,
        isVestingLoaded,
        vestingAddress,
    ]);

    return (
        <Fragment>
            <div className="section-container">
                {usingVestingAddress !== "" && (
                    <div className={"content-page"}></div>
                )}
                {ready ? <VetoWithdraw /> : <Skeleton active />}
            </div>
        </Fragment>
    );
}
