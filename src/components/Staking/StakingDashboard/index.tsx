import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface UserInfoStaking {
    tgBalance: bigint;
    unstakeBalance: bigint;
    totalPendingExpiration: bigint;
    totalAvailableToWithdraw: bigint;
    lockedInVoting: bigint;
}

interface DashboardProps {
    userInfoStaking: UserInfoStaking;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
    const { t, i18n } = useProjectTranslation();
    const { userInfoStaking } = props;

    return (
        <div className="layout-card section__innerCard--big dashboard-staking-info">
            {/* Performance */}
            <div className="stakingDash__item">
                <div className="stakingDash__icon__back">
                    <div className="icon__govBalance"></div>
                </div>
                <div
                    className="stakingDash__data"
                    data-testid="staking-dashboard-balance"
                >
                    <div className="stakingDash__data__amount">
                        {" "}
                        {PrecisionNumbers({
                            amount: userInfoStaking["tgBalance"] || 0n,
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            i18n: i18n,
                            compact: true,
                        })}
                    </div>
                    <div className="stakingDash__data__label">
                        {t("staking.dashLabels.balance")}
                    </div>
                </div>
            </div>
            {/* Staked */}
            <div className="stakingDash__item">
                <div className="stakingDash__icon__back">
                    <div className="icon__govStaked"></div>
                </div>
                <div
                    className="stakingDash__data"
                    data-testid="staking-dashboard-staked"
                >
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: userInfoStaking["unstakeBalance"] || 0n,
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            i18n: i18n,
                            compact: true,
                        })}
                    </div>
                    <div className="stakingDash__data__label">
                        {t("staking.dashLabels.staked")}
                    </div>
                </div>
            </div>
            {/* Rewarded today */}
            <div className="stakingDash__item">
                <div className="stakingDash__icon__back">
                    <div className="icon__govUnstaking"></div>
                </div>
                <div
                    className="stakingDash__data"
                    data-testid="staking-dashboard-unstaking"
                >
                    <div className="stakingDash__data__amount">
                        {" "}
                        {PrecisionNumbers({
                            amount:
                                userInfoStaking["totalPendingExpiration"] || 0n,
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            i18n: i18n,
                            compact: true,
                        })}
                    </div>
                    <div className="stakingDash__data__label">
                        {t("staking.dashLabels.unstaking")}
                    </div>
                </div>
            </div>

            {/* Ready to claim */}
            <div className="stakingDash__item">
                <div className="stakingDash__icon__back">
                    <div className="icon__govReadyWithdraw"></div>
                </div>
                <div
                    className="stakingDash__data"
                    data-testid="staking-dashboard-ready-to-withdraw"
                >
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount:
                                userInfoStaking["totalAvailableToWithdraw"] ||
                                0n,
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            i18n: i18n,
                            compact: true,
                        })}
                    </div>
                    <div className="stakingDash__data__label">
                        {t("staking.dashLabels.ready")}
                    </div>
                </div>
            </div>
            {/* Locked in voting */}

            {userInfoStaking["lockedInVoting"] > BigInt(0) && (
                <div className="stakingDash__item">
                    <div className="stakingDash__icon__back">
                        <div className="icon__govLockedTokensVoting"></div>
                    </div>
                    <div
                        className="stakingDash__data"
                        data-testid="staking-dashboard-locked-in-voting"
                    >
                        <div className="stakingDash__data__amount">
                            {PrecisionNumbers({
                                amount: userInfoStaking["lockedInVoting"] || 0n,
                                token: settings.tokens.TG[0],
                                decimals: Number(t("staking.display_decimals")),
                                i18n: i18n,
                                compact: true,
                            })}
                        </div>
                        <div className="stakingDash__data__label">
                            {t("staking.dashLabels.lockedVoting")}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
