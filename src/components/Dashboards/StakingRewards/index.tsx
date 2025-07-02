import React from "react";

export default function StakingRewards(): React.ReactElement {
    return (
        <div className="dashboard-staking-info">
            {/* Staked */}
            <div className="item-staking first-item">
                <div className="logo-staking-panel">
                    <div className="icon-staked"></div>
                </div>
                <div className="resume-staking">
                    <div className="number-staking">0.00</div>
                    <div className="description-staking">Flip staked</div>
                </div>
            </div>

            {/* Performance */}
            <div className="item-staking second-item">
                <div className="logo-staking-panel">
                    <div className="icon-gauge"></div>
                </div>
                <div className="resume-staking">
                    <div className="number-staking">+0.00%</div>
                    <div className="description-staking">
                        Annualized performance
                    </div>
                </div>
            </div>

            {/* Rewarded today */}
            <div className="item-staking second-item">
                <div className="logo-staking-panel">
                    <div className="icon-calendar"></div>
                </div>
                <div className="resume-staking">
                    <div className="number-staking">0.00</div>
                    <div className="description-staking">
                        Flip rewarded today
                    </div>
                </div>
            </div>

            {/* Ready to claim */}
            <div className="item-staking second-item">
                <div className="logo-staking-panel">
                    <div className="icon-calendar-check"></div>
                </div>
                <div className="resume-staking">
                    <div className="number-staking">0.00</div>
                    <div className="description-staking">
                        Flip ready to claim
                    </div>
                </div>
            </div>
        </div>
    );
}
