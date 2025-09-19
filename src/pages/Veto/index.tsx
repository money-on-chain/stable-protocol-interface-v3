import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useEffect, useState } from "react";

import Veto from "../../components/Voting/Veto";
import { useWalletContext } from "../../context/Wallet";

export default function SectionVeto(): React.ReactElement {
    const { contractStatusOmoc, userBalance, isVestingLoaded, vestingAddress } =
        useWalletContext();
    const [ready, setReady] = useState<boolean>(false);
    const [usingVestingAddress, setUsingVestingAddress] = useState<string>("");

    useEffect(() => {
        if (contractStatusOmoc.data) {
            setReady(true);
        }
        if (userBalance.data && isVestingLoaded()) {
            const vAddress = vestingAddress();
            setUsingVestingAddress(vAddress || "");
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
                {ready ? <Veto /> : <Skeleton active />}
            </div>
        </Fragment>
    );
}
