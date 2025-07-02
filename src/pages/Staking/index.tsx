import React, { Fragment, useState, useEffect } from "react";
import { useContext } from "react";
import { Skeleton } from "antd";

import { AuthenticateContext } from "../../context/Auth";
import Staking from "../../components/Staking";
import UseVestingAlert from "../../components/Notification/UsingVestingAlert";

import "./Styles.scss";

export default function SectionStaking(): React.ReactElement {
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
