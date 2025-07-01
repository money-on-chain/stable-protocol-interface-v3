import React, { useState, useContext, useEffect } from "react";
import BigNumber from "bignumber.js";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import settings from "../../../settings/settings.json";

import { pendingWithdrawalsFormat } from "../../../helpers/staking";
import { AuthenticateContext } from "../../../context/Auth";
import { useProjectTranslation } from "../../../helpers/translations";

interface WithdrawalStatus {
    pending: string;
    available: string;
}

interface PendingWithdrawal {
    expiration: string;
    amount: string;
    status?: string;
    id?: string;
}

const withdrawalStatus: WithdrawalStatus = {
    pending: "PENDING",
    available: "AVAILABLE",
};

const Dashboard = (): JSX.Element => {
    const auth = useContext(AuthenticateContext);
    const { t, i18n, ns } = useProjectTranslation();
    //const [activeTab, setActiveTab] = useState("tab1");
    const [tgBalance, setTgBalance] = useState<string>("0");
    //const [lockedBalance, setLockedBalance] = useState("0");
    const [stakedBalance, setStakedBalance] = useState<string>("0");
    //const [pendingWithdrawals, setPendingWithdrawals] = useState(null);
    const [totalPendingExpiration, setTotalPendingExpiration] = useState<string>("0");
    const [totalAvailableToWithdraw, setTotalAvailableToWithdraw] =
        useState<string>("0");
    //const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (auth.accountData && auth.userBalanceData) {
            //setLoading(false);
            setStakingBalances();
        }
    }, [auth]);

    const setStakingBalances = async (): Promise<void> => {
        //try {
        let [_stakedBalance, _pendingWithdrawals]: [string, PendingWithdrawal[]] = ["0", []];
        if (auth.userBalanceData) {
            if (auth.isVestingLoaded() && auth.userBalanceData.vestingmachine) {
                setTgBalance(auth.userBalanceData.vestingmachine.tgBalance?.toString() || "0");
                _stakedBalance =
                    auth.userBalanceData.vestingmachine.staking?.balance?.toString() || "0";
                //_lockedBalance = auth.userBalanceData.vestingmachine.staking.getLockedBalance;
                _pendingWithdrawals = pendingWithdrawalsFormat(
                    auth.userBalanceData.vestingmachine.delay
                );
            } else {
                setTgBalance(auth.userBalanceData.TG.balance?.toString() || "0");
                _stakedBalance = (auth.userBalanceData as any).stakingmachine?.getBalance?.toString() || "0";
                //_lockedBalance = (auth.userBalanceData as any).stakingmachine.getLockedBalance;
                _pendingWithdrawals = pendingWithdrawalsFormat(
                    (auth.userBalanceData as any).delaymachine
                );
            }
        }
        const pendingWithdrawalsFormatted: PendingWithdrawal[] = _pendingWithdrawals
            .filter((withdrawal: PendingWithdrawal) => withdrawal.expiration)
            .map((withdrawal: PendingWithdrawal) => {
                const status: string =
                    new Date(parseInt(withdrawal.expiration) * 1000) >
                    new Date()
                        ? withdrawalStatus.pending
                        : withdrawalStatus.available;

                return {
                    ...withdrawal,
                    status,
                };
            });
        let pendingExpirationAmount: string = "0";
        let readyToWithdrawAmount: string = "0";
        pendingWithdrawalsFormatted.forEach(({ status, amount }: PendingWithdrawal) => {
            if (status === withdrawalStatus.pending) {
                pendingExpirationAmount = BigNumber.sum(
                    pendingExpirationAmount,
                    amount
                ).toFixed(0);
            } else {
                readyToWithdrawAmount = BigNumber.sum(
                    readyToWithdrawAmount,
                    amount
                ).toFixed(0);
            }
        });
        /*
        const arrayDes = pendingWithdrawalsFormatted.sort(function (a, b) {
            return b.id.toString() - a.id.toString();
        });
         */
        //setLockedBalance(_lockedBalance);
        setStakedBalance(_stakedBalance);
        setTotalPendingExpiration(pendingExpirationAmount);
        setTotalAvailableToWithdraw(readyToWithdrawAmount);
        //setPendingWithdrawals(arrayDes);
        //} catch (error) {
        //console.log('Error getting staking balances', error);
        //}
    };
    return (
        <div className="layout-card section__innerCard--big dashboard-staking-info">
            {/* Performance */}
            <div className="stakingDash__item">
                <div className="stakingDash__icon__back">
                    <div className="icon__govBalance"></div>
                </div>
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: new BigNumber(tgBalance),
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
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
                            amount: new BigNumber(stakedBalance),
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
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
                        {PrecisionNumbers({
                            amount: new BigNumber(totalPendingExpiration),
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
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
                            amount: new BigNumber(totalAvailableToWithdraw),
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
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
            <div className="stakingDash__item">
                <div className="stakingDash__icon__back">
                    <div className="icon__govLockedTokensVoting"></div>
                </div>
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: new BigNumber(totalAvailableToWithdraw),
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
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
        </div>
    );
};

export default Dashboard; 