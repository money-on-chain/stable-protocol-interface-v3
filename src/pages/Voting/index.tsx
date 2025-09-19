import React, { Fragment, useEffect, useState } from "react";
import { Skeleton } from "antd";

import { useWalletContext } from "../../context/Wallet";
import Voting from "../../components/Voting";
import UseVestingAlert from "../../components/Notification/UsingVestingAlert";
import VestingSuggestionAlert from "../../components/Notification/VestingSuggestionAlert";
import VestingStatusAlert from "../../components/Notification/VestingStatusAlert";

import "./Styles.scss";

export default function SectionVoting(): React.ReactElement {
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
        if (userOmocBalance.data && isVestingLoaded() && vestingAddress) {
            const vestingAddr = vestingAddress;
            setUsingVestingAddress(vestingAddr || "");
        } else {
            setUsingVestingAddress("");
        }
    }, [
        contractStatusOmoc.data,
        userOmocBalance.data,
        isVestingLoaded,
        vestingAddress,
    ]);

    return (
        <Fragment>
            <div className="section-container">
                {/* <div className="content-page">
                    {usingVestingAddress !== "" ? (
                        // Caso: ya se está usando un vesting
                        // Debería ser estar toda la verificacion en el componente que llama al alert, no? !!!!!!!!!!!!!
                        <UseVestingAlert address={usingVestingAddress} />
                    ) : (
                        // Caso: aún no se seleccionó → sugerencia para habilitarlo
                        <VestingSuggestionAlert address={usingVestingAddress} />
                    )}
                </div> */}
                <div className="content-page">
                    {/* Single self-contained alert that decides what to show */}
                    <VestingStatusAlert />
                </div>
                {ready ? <Voting /> : <Skeleton active />}
            </div>
        </Fragment>
    );
}
