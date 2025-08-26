import React, { Fragment, useState, useEffect } from "react";
import { useProjectTranslation } from "../../helpers/translations";
import { pendingWithdrawalsFormat } from "../../helpers/staking";
import Stake from "./Stake";
import PieChartComponent from "./PieChart";
import PerformanceChart from "./performanceChart";
import Withdraw from "./WithdrawV2";
import DashBoard from "./StakingDashboard";
import { useWalletContext } from "../../context/Wallet";

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
    tgBalance: bigint;
    stakedBalance: bigint;
    lockedBalance: bigint;
    pendingWithdrawals: PendingWithdrawal[];
    totalPendingExpiration: bigint;
    totalAvailableToWithdraw: bigint;
    lockedInVoting: bigint;
    unstakeBalance: bigint;
}


interface vUsing {
    getLockingInfo: [bigint, bigint];
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
    const { userOmocBalance, isVestingLoaded, userVesting } = useWalletContext()
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

    useEffect(() => {
        if (userOmocBalance.data || userVesting.data) {
            refreshBalances();
        }
    }, [userOmocBalance.data, userVesting.data]);

    const refreshBalances = (): void => {
        const cData: UserInfoStaking = { ...userInfoStaking };
        const nowTimestamp: number = Date.now();
        let pendingWithdrawals: PendingWithdrawal[] = [];
        let vUsing: vUsing;
        
        if (isVestingLoaded() && userVesting.data) {
            cData["tgBalance"] = userVesting.data.vestingmachine!.tgBalance;
            cData["stakedBalance"] = userVesting.data.vestingmachine!.staking.balance;
            cData["lockedBalance"] = userVesting.data.vestingmachine!.staking.getLockedBalance;
            pendingWithdrawals = pendingWithdrawalsFormat(
                userVesting.data.vestingmachine!.delay
            );
            vUsing = userVesting.data.vestingmachine!.staking;
        } else {            
            cData["tgBalance"] = userOmocBalance.data.TG.balance;
            cData["stakedBalance"] = userOmocBalance.data.stakingmachine!.getBalance;
            cData["lockedBalance"] = userOmocBalance.data.stakingmachine!.getLockedBalance;
            pendingWithdrawals = pendingWithdrawalsFormat(
                userOmocBalance.data.delaymachine
            );
            vUsing = userOmocBalance.data.stakingmachine!;            
        }

        const [lockedAmount, lockedUntilTimestamp] = vUsing.getLockingInfo;        

        if (lockedUntilTimestamp * 1000n > BigInt(nowTimestamp)) {
            cData["lockedInVoting"] = lockedAmount;
        } else {
            cData["lockedInVoting"] = 0n;
        }

        cData["unstakeBalance"] = cData["stakedBalance"] - cData["lockedInVoting"];

        const pendingWithdrawalsFormatted: PendingWithdrawalStatus[] = pendingWithdrawals
            .filter((withdrawal: PendingWithdrawal) => withdrawal.expiration)
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
        pendingWithdrawalsFormatted.forEach(({ status, amount }: PendingWithdrawalStatus) => {
            if (status === withdrawalStatus.pending) {
                pendingExpirationAmount = pendingExpirationAmount + amount;
            } else {
                readyToWithdrawAmount = readyToWithdrawAmount + amount;
            }
        });
        const pendingWithdrawalsSort: PendingWithdrawal[] = pendingWithdrawalsFormatted.sort(
            function (a: PendingWithdrawal, b: PendingWithdrawal) {
                return Number(b.id) - Number(a.id);
            }
        );

        cData["pendingWithdrawals"] = pendingWithdrawalsSort;
        cData["totalPendingExpiration"] = pendingExpirationAmount;
        cData["totalAvailableToWithdraw"] = readyToWithdrawAmount;

        setUserInfoStaking(cData);
    };

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
