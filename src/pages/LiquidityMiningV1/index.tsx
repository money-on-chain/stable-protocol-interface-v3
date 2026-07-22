import "../LiquidityMining/Styles.scss";

import { Skeleton } from "antd";
import React, { Fragment } from "react";

import LiquidityMiningClaimV1 from "../../components/LiquidityMiningClaimV1";
import { useWalletContext } from "../../context/Wallet";

// v1 fork of pages/LiquidityMining — gates on isConnected instead of v3's
// caIndex-shaped contractProtocolStatus/userBalance, which v1 doesn't
// populate. The rewards themselves are backend/REST-driven (see
// hooks/useIncentives.ts), not on-chain, so there's no protocol status to
// wait on here.
export default function SectionLiquidityMiningV1(): React.ReactElement {
    const { isConnected } = useWalletContext();

    return (
        <Fragment>
            <div className="section-container">
                <div className="sectionClaim">
                    {isConnected ? (
                        <LiquidityMiningClaimV1 />
                    ) : (
                        <Skeleton active />
                    )}
                </div>
            </div>
        </Fragment>
    );
}
