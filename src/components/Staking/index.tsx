import React, { Fragment, useCallback, useEffect, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { pendingWithdrawalsFormat } from "../../helpers/staking";
import { useProjectTranslation } from "../../helpers/translations";
import PerformanceChart from "./performanceChart";
import PieChartComponent from "./PieChart";
import Stake from "./Stake";
import DashBoard from "./StakingDashboard";
import Withdraw from "./WithdrawV2";

interface WithdrawalStatus {
    pending: string;
    available: string;
}

interface PendingWithdrawal {
    id: bigint;
    amount: bigint;
    expiration: bigint;
}

interface UserInfoStaking {
    [key: string]: unknown;
    tgBalance: bigint;
    stakedBalance: bigint;
    lockedBalance: bigint;
    pendingWithdrawals: PendingWithdrawalStatus[];
    totalPendingExpiration: bigint;
    totalAvailableToWithdraw: bigint;
    lockedInVoting: bigint;
    unstakeBalance: bigint;
}

interface vUsing {
    getLockingInfo?: [bigint, bigint] | null;
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

export default function Staking(): JSX.Element {
    const { userOmocBalance, isVestingLoaded, userVesting } =
        useWalletContext();
    const { t } = useProjectTranslation();
    const [activeTab, setActiveTab] = useState<string>("tab1");

    const defaultUserInfoStaking: UserInfoStaking = {
        tgBalance: 0n,
        stakedBalance: 0n,
        lockedBalance: 0n,
        pendingWithdrawals: [],
        totalPendingExpiration: 0n,
        totalAvailableToWithdraw: 0n,
        lockedInVoting: 0n,
        unstakeBalance: 0n,
    };
    const [userInfoStaking, setUserInfoStaking] = useState<UserInfoStaking>(
        defaultUserInfoStaking
    );

    const refreshBalances = useCallback((): void => {
        const cData: UserInfoStaking = {
            tgBalance: 0n,
            stakedBalance: 0n,
            lockedBalance: 0n,
            pendingWithdrawals: [],
            totalPendingExpiration: 0n,
            totalAvailableToWithdraw: 0n,
            lockedInVoting: 0n,
            unstakeBalance: 0n,
        };
        const nowTimestamp: number = Date.now();
        let pendingWithdrawals: PendingWithdrawal[] = [];
        let vUsing: vUsing;

        if (isVestingLoaded() && userVesting.data) {
            // Check if the required vesting data exists before accessing it
            if (
                !userVesting.data?.vestingmachine?.staking ||
                !userVesting.data?.vestingmachine?.delay
            ) {
                return;
            }

            cData["tgBalance"] = BigInt(userVesting.data.vestingmachine.tgBalance || 0);
            cData["stakedBalance"] =
                BigInt(userVesting.data.vestingmachine.staking.balance || 0);
            cData["lockedBalance"] =
                BigInt(userVesting.data.vestingmachine.staking.getLockedBalance || 0);
            pendingWithdrawals = pendingWithdrawalsFormat(
                userVesting.data.vestingmachine.delay
            );
            vUsing = userVesting.data.vestingmachine.staking;
        } else {
            // Check if the required data exists before accessing it
            if (
                !userOmocBalance.data?.TG ||
                !userOmocBalance.data?.stakingmachine ||
                !userOmocBalance.data?.delaymachine
            ) {
                return;
            }

            cData["tgBalance"] = BigInt(userOmocBalance.data.TG.balance || 0);
            cData["stakedBalance"] =
                BigInt(userOmocBalance.data.stakingmachine.getBalance || 0);
            cData["lockedBalance"] =
                BigInt(userOmocBalance.data.stakingmachine.getLockedBalance || 0);
            pendingWithdrawals = pendingWithdrawalsFormat(
                userOmocBalance.data.delaymachine
            );
            vUsing = userOmocBalance.data.stakingmachine!;
        }

        const lockingInfo = vUsing?.getLockingInfo;
        const normalizeToBigInt = (value: unknown): bigint => {
            if (typeof value === "bigint") return value as bigint;
            if (typeof value === "number") return BigInt(value);
            if (typeof value === "string" && value !== "") return BigInt(value);
            return 0n;
        };
        const lockedAmount: bigint = normalizeToBigInt(lockingInfo?.[0]);
        const lockedUntilTimestamp: bigint = normalizeToBigInt(lockingInfo?.[1]);

        if (lockedUntilTimestamp * 1000n > BigInt(nowTimestamp)) {
            cData["lockedInVoting"] = lockedAmount;
        } else {
            cData["lockedInVoting"] = 0n;
        }

        cData["unstakeBalance"] =
            cData["stakedBalance"] - cData["lockedInVoting"];

        const pendingWithdrawalsFormatted: PendingWithdrawalStatus[] =
            (pendingWithdrawals || [])
                .filter(
                    (withdrawal: PendingWithdrawal) => withdrawal.expiration > 0n
                )
                .map((withdrawal: PendingWithdrawal) => {
                    const status: string =
                        new Date(Number(withdrawal.expiration) * 1000) >
                        new Date()
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
                    pendingExpirationAmount = pendingExpirationAmount + amount;
                } else {
                    readyToWithdrawAmount = readyToWithdrawAmount + amount;
                }
            }
        );
        const pendingWithdrawalsSort: PendingWithdrawalStatus[] =
            pendingWithdrawalsFormatted.sort(function (
                a: PendingWithdrawalStatus,
                b: PendingWithdrawalStatus
            ) {
                return Number(b.id) - Number(a.id);
            });

        cData["pendingWithdrawals"] = pendingWithdrawalsSort;
        cData["totalPendingExpiration"] = pendingExpirationAmount;
        cData["totalAvailableToWithdraw"] = readyToWithdrawAmount;

        setUserInfoStaking(cData);
    }, [isVestingLoaded, userVesting.data, userOmocBalance.data]);

    useEffect(() => {
        if (userOmocBalance.data || userVesting.data) {
            refreshBalances();
        }
    }, [userOmocBalance.data, userVesting.data, refreshBalances]);

    return (
        <div>
            <div className={"section-layout"}>
                <DashBoard userInfoStaking={userInfoStaking} />
            </div>
            <div className="cards-container sectionStaking">
                <Fragment>
                    <div className="section row-section">
                        <div className="firstCardsGroup">
                            <div id="stakingCard" className="layout-card">
                                <div className="layout-card-title">
                                    <h1>{t("staking.cardTitle")}</h1>
                                </div>
                                <div className="tabs">
                                    <button
                                        onClick={() => setActiveTab("tab1")}
                                        className={`tab-button ${activeTab === "tab1" ? "active" : ""}`}
                                    >
                                        {t("staking.staking.tabStake")}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("tab2")}
                                        className={`tab-button ${activeTab === "tab2" ? "active" : ""}`}
                                    >
                                        {t("staking.staking.tabUnstake")}
                                    </button>
                                </div>
                                <div className="tab-divider"></div>
                                {/* Tab Content */}
                                <div className="tab-content">
                                    <Stake
                                        activeTab={activeTab}
                                        userInfoStaking={userInfoStaking}
                                    />
                                </div>
                            </div>
                            <div>
                                <div
                                    id="distributionCard"
                                    className="layout-card staking-distribution-card"
                                >
                                    <div className="layout-card-title">
                                        <h1>
                                            {t("staking.distribution.title")}
                                        </h1>
                                    </div>
                                    <div className="tab-content">
                                        <PieChartComponent
                                            userInfoStaking={userInfoStaking}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div id="performanceCard" className="layout-card">
                                <div className="layout-card-title">
                                    <h1>{t("staking.performance.title")}</h1>
                                </div>
                                <div className="tab-content">
                                    <PerformanceChart />
                                </div>
                            </div>
                        </div>
                        <div className="SecondCardsGroup">
                            <Withdraw userInfoStaking={userInfoStaking} />
                        </div>
                    </div>
                </Fragment>
            </div>
        </div>
    );
}
