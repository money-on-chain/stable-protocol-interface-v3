import React from "react";
import BigNumber from "bignumber.js";

import { PrecisionNumbers } from "../../PrecisionNumbers";
import settings from "../../../settings/settings.json";
import { useProjectTranslation } from "../../../helpers/translations";
import "./Styles.scss";

interface UserInfoStaking {
    tgBalance: string | number;
    unstakeBalance: string | number;
    totalPendingExpiration: string | number;
    totalAvailableToWithdraw: string | number;
    lockedInVoting: BigNumber;
}

interface DashboardProps {
    userInfoStaking: UserInfoStaking;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
    const { t, i18n, ns } = useProjectTranslation();
    const { userInfoStaking } = props;

    return (
        <div className="layout-card section__innerCard--big dashboard-staking-info">
            {/* Performance */}
            <div className="stakingDash__item">
                <div className="stakingDash__icon__back">
                    <div className="icon__govBalance"></div>
                </div>
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {" "}
                        {PrecisionNumbers({
                            amount: new BigNumber(userInfoStaking["tgBalance"]),
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            numericLabelParams: {},
                            i18n: i18n,
                            skipContractConvert: true,
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
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: new BigNumber(
                                userInfoStaking["unstakeBalance"]
                            ),
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            numericLabelParams: {},
                            i18n: i18n,
                            skipContractConvert: true,
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
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {" "}
                        {PrecisionNumbers({
                            amount: new BigNumber(
                                userInfoStaking["totalPendingExpiration"]
                            ),
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            numericLabelParams: {},
                            i18n: i18n,
                            skipContractConvert: true,
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
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: new BigNumber(
                                userInfoStaking["totalAvailableToWithdraw"]
                            ),
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            numericLabelParams: {},
                            i18n: i18n,
                            skipContractConvert: true,
                        })}
                    </div>
                    <div className="stakingDash__data__label">
                        {t("staking.dashLabels.ready")}
                    </div>
                </div>
            </div>
            {/* Locked in voting */}

            {userInfoStaking["lockedInVoting"].gt(0) && (
                <div className="stakingDash__item">
                    <div className="stakingDash__icon__back">
                        <div className="icon__govLockedTokensVoting"></div>
                    </div>
                    <div className="stakingDash__data">
                        <div className="stakingDash__data__amount">
                            {PrecisionNumbers({
                                amount: new BigNumber(
                                    userInfoStaking["lockedInVoting"]
                                ),
                                token: settings.tokens.TG[0],
                                decimals: Number(t("staking.display_decimals")),
                                numericLabelParams: {},
                                i18n: i18n,
                                skipContractConvert: true,
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
