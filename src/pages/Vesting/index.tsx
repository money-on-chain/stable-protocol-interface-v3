import React, { Fragment, useEffect, useState } from "react";
import { useContext } from "react";
import { Skeleton } from "antd";

import { AuthenticateContext } from "../../context/Auth";
import Vesting from "../../components/Vesting";
import "./Styles.scss";

export default function SectionVesting(): React.ReactElement {
    const auth = useContext(AuthenticateContext);
    const [ready, setReady] = useState<boolean>(false);
    
    useEffect(() => {
        if (auth.contractStatusData) {
            setReady(true);
        }
    }, [auth]);

    return (
        <Fragment>
            <div className="section-container">
                <div className={"content-vesting"}>
                    {ready ? <Vesting /> : <Skeleton active />}
                </div>
            </div>
        </Fragment>
    );
}
