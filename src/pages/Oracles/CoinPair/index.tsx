import "./Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment } from "react";

import CoinPair from "../../../components/Oracles/CoinPair";
import { useWalletContext } from "../../../context/Wallet";

export default function SectionOraclesCoinPair(): React.ReactElement {
    const { oracleCoinPairs } = useWalletContext();

    const ready = !oracleCoinPairs.isLoading;

    return (
        <Fragment>
            <div className="section-container oracles-coinpair-page">
                <div className="content-page">
                    {ready ? <CoinPair /> : <Skeleton active />}
                </div>
            </div>
        </Fragment>
    );
}
