import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment } from "react";

import CoinPair from "../../../components/Oracles/CoinPair";
import OracleSetup from "../../../components/Oracles/OracleSetup";
import RegisteredOracles from "../../../components/Oracles/RegisteredOracles";
import { useWalletContext } from "../../../context/Wallet";

export default function SectionOraclesCoinPair(): React.ReactElement {
    const { oracleCoinPairs, userOmocBalance } = useWalletContext();

    const ready = !oracleCoinPairs.isLoading && !userOmocBalance.isLoading;

    return (
        <Fragment>
            <div className="section-container oracles-coinpair-page">
                <div className="content-page">
                    {ready ? (
                        <Fragment>
                            <OracleSetup />
                            <CoinPair />
                            <RegisteredOracles />
                        </Fragment>
                    ) : (
                        <Skeleton active />
                    )}
                </div>
            </div>
        </Fragment>
    );
}
