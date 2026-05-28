import React, { useCallback, useEffect, useState } from "react";

import { useWalletContext } from "../../../context/Wallet";
import { pendingWithdrawalsFormat } from "../../../helpers/staking";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface WithdrawalStatus {
    pending: string;
    available: string;
}

interface PendingWithdrawal {
    id: bigint;
    amount: bigint;
    expiration: bigint;
}

interface PendingWithdrawalStatus {
    id: bigint;
    amount: bigint;
    expiration: bigint;
    status: string;
}

const withdrawalStatus: WithdrawalStatus = {
    pending: "PENDING",
    available: "AVAILABLE",
};

const Dashboard = (): JSX.Element => {
    const {
        contractProtocolStatus,
        userOmocBalance,
        userVesting,
        isVestingLoaded,
    } = useWalletContext();
    const { t, i18n } = useProjectTranslation();
    //const [activeTab, setActiveTab] = useState("tab1");
    const [tgBalance, setTgBalance] = useState<bigint>(0n);
    //const [lockedBalance, setLockedBalance] = useState("0");
    const [stakedBalance, setStakedBalance] = useState<bigint>(0n);
    //const [pendingWithdrawals, setPendingWithdrawals] = useState(null);
    const [totalPendingExpiration, setTotalPendingExpiration] =
        useState<bigint>(0n);
    const [totalAvailableToWithdraw, setTotalAvailableToWithdraw] =
        useState<bigint>(0n);
    //const [loading, setLoading] = useState(true);

    const setStakingBalances = useCallback((): void => {
        //try {
        let [_stakedBalance, _pendingWithdrawals]: [
            bigint,
            PendingWithdrawal[],
        ] = [0n, []];

        if (!userOmocBalance.data) return;

        if (isVestingLoaded() && userVesting.data) {
            setTgBalance(userVesting.data.vestingmachine.tgBalance || 0n);
            _stakedBalance =
                userVesting.data.vestingmachine.staking?.balance || 0n;
            //_lockedBalance = auth.userBalanceData.vestingmachine.staking.getLockedBalance;
            _pendingWithdrawals = pendingWithdrawalsFormat(
                userVesting.data.vestingmachine.delay
            );
        } else {
            setTgBalance(userOmocBalance.data.TG.balance || 0n);
            _stakedBalance =
                userOmocBalance.data.stakingmachine.getBalance || 0n;
            //_lockedBalance = (auth.userBalanceData as any).stakingmachine.getLockedBalance;
            _pendingWithdrawals = pendingWithdrawalsFormat(
                userOmocBalance.data.delaymachine
            );
        }

        const pendingWithdrawalsFormatted: PendingWithdrawalStatus[] = (
            _pendingWithdrawals || []
        )
            .filter((withdrawal: PendingWithdrawal) => withdrawal.expiration)
            .map((withdrawal: PendingWithdrawal) => {
                const status: string =
                    new Date(Number(withdrawal.expiration) * 1000) > new Date()
                        ? withdrawalStatus.pending
                        : withdrawalStatus.available;

                return {
                    ...withdrawal,
                    status,
                };
            });
        let pendingExpirationAmount: bigint = 0n;
        let readyToWithdrawAmount: bigint = 0n;
        pendingWithdrawalsFormatted.forEach(
            ({ status, amount }: PendingWithdrawalStatus) => {
                if (status === withdrawalStatus.pending) {
                    pendingExpirationAmount =
                        pendingExpirationAmount + BigInt(amount);
                } else {
                    readyToWithdrawAmount =
                        readyToWithdrawAmount + BigInt(amount);
                }
            }
        );
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
    }, [userOmocBalance.data, isVestingLoaded, userVesting.data]);

    useEffect(() => {
        if (contractProtocolStatus.data && userOmocBalance.data) {
            //setLoading(false);
            setStakingBalances();
        }
    }, [
        contractProtocolStatus.data,
        userOmocBalance.data,
        userVesting.data,
        setStakingBalances,
    ]);

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
                            amount: tgBalance,
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
                            //numericLabelParams: {},
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
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: stakedBalance,
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
                            //numericLabelParams: {},
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
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: totalPendingExpiration,
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
                            //numericLabelParams: {},
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
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: totalAvailableToWithdraw,
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
                            //numericLabelParams: {},
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
            <div className="stakingDash__item">
                <div className="stakingDash__icon__back">
                    <div className="icon__govLockedTokensVoting"></div>
                </div>
                <div className="stakingDash__data">
                    <div className="stakingDash__data__amount">
                        {PrecisionNumbers({
                            amount: totalAvailableToWithdraw,
                            token: settings.tokens.TG[0],
                            decimals: parseInt(t("staking.display_decimals")),
                            //numericLabelParams: {},
                            i18n: i18n,
                            compact: true,
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
