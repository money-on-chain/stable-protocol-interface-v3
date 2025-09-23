import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment, useEffect, useState } from "react";

import LiquidityMiningClaim from "../../components/LiquidityMiningClaim";
import UseVestingAlert from "../../components/Notification/UsingVestingAlert";
import { useWalletContext } from "../../context/Wallet";

export default function SectionLiquidityMining(): React.ReactElement {
    const {
        contractProtocolStatus,
        userBalance,
        isVestingLoaded,
        vestingAddress,
    } = useWalletContext();
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
    }, [
        contractProtocolStatus.data,
        userBalance.data,
        isVestingLoaded,
        vestingAddress,
    ]);

    return (
        <Fragment>
            <div className="section-container">
                <div className="sectionClaim">
                    {usingVestingAddress !== "" && (
                        <UseVestingAlert address={usingVestingAddress} />
                    )}
                    {ready ? <LiquidityMiningClaim /> : <Skeleton active />}
                </div>
            </div>
        </Fragment>
    );
}
