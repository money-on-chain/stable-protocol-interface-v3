import React, { Fragment, useEffect, useState } from "react";
import { useContext } from "react";
import { Skeleton } from "antd";

import { AuthenticateContext } from "../../context/Auth";
import Voting from "../../components/Voting";
import UseVestingAlert from "../../components/Notification/UsingVestingAlert";
import "./Styles.scss";

export default function SectionVoting(): React.ReactElement {
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
                {usingVestingAddress !== "" && (
                    <div className={"content-page"}>
                        {<UseVestingAlert address={usingVestingAddress} />}
                    </div>
                )}
                {ready ? <Voting /> : <Skeleton active />}
            </div>
        </Fragment>
    );
}
