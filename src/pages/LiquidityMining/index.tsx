import React, { Fragment, useState, useEffect } from "react";
import { useContext } from "react";
import { Skeleton } from "antd";

import { AuthenticateContext } from "../../context/Auth";
import UseVestingAlert from "../../components/Notification/UsingVestingAlert";
import LiquidityMiningClaim from "../../components/LiquidityMiningClaim";
import "./Styles.scss";

export default function SectionLiquidityMining(): React.ReactElement {
    const auth = useContext(AuthenticateContext);
    const [ready, setReady] = useState<boolean>(false);
    const [usingVestingAddress, setUsingVestingAddress] = useState<string>("");
    
    useEffect(() => {
        if (auth.contractStatusData) {
            setReady(true);
        }
        if (auth.userBalanceData && auth.isVestingLoaded()) {
            const vestingAddress = auth.vestingAddress();
            setUsingVestingAddress(vestingAddress || "");
        } else {
            setUsingVestingAddress("");
        }
    }, [auth]);

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
