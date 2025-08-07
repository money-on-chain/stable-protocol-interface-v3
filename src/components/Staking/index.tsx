import React, { Fragment, useState, useEffect, useContext } from "react";
import { useProjectTranslation } from "../../helpers/translations";
import { pendingWithdrawalsFormat, tokenStake } from "../../helpers/staking";
import Stake from "./Stake";
import PieChartComponent from "./PieChart";
import PerformanceChart from "./performanceChart";
import Withdraw from "./WithdrawV2";
import DashBoard from "./StakingDashboard";
import { TokenSettings } from "../../helpers/currencies";
import { useWalletContext } from "../../context/Wallet";

interface WithdrawalStatus {
    pending: string;
    available: string;
}

interface PendingWithdrawal {
    id: string;
    amount: string;
    expiration: string;
    status?: string;
}

interface UserInfoStaking {
    tgBalance: bigint;
    stakedBalance: bigint;
    lockedBalance: bigint;
    pendingWithdrawals: PendingWithdrawal[];
    totalPendingExpiration: bigint;
    totalAvailableToWithdraw: bigint;
    lockedInVoting: bigint;
    unstakeBalance?: bigint;
}

interface VestingMachine {
    tgBalance: bigint;
    staking: {
        balance: string;
        getLockedBalance: string;
        getLockingInfo: {
            amount: string;
            untilTimestamp: string;
        };
    };
    delay: any;
}

interface StakingMachine {
    getBalance: string;
    getLockedBalance: string;
    getLockingInfo: {
        amount: string;
        untilTimestamp: string;
    };
}

const withdrawalStatus: WithdrawalStatus = {
    pending: "PENDING",
    available: "AVAILABLE",
};

const defaultTokenStake: string = tokenStake()[0];
const tokenSettingsStake: any = TokenSettings(defaultTokenStake);

export default function Staking(): JSX.Element {    
    const { contractProtocolStatus, userOmocBalance, publicClient, isVestingLoaded } = useWalletContext()
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
    };
    const [userInfoStaking, setUserInfoStaking] = useState<UserInfoStaking>(
        defaultUserInfoStaking
    );

    useEffect(() => {
        if (contractProtocolStatus.data && userOmocBalance.data) {
            refreshBalances();
        }
    }, [contractProtocolStatus.data, userOmocBalance.data]);

    const refreshBalances = (): void => {
        const cData: UserInfoStaking = { ...userInfoStaking };
        const nowTimestamp: number = Date.now();
        let pendingWithdrawals: PendingWithdrawal[] = [];
        let vUsing: VestingMachine | StakingMachine;
        
        if (isVestingLoaded()) {
            cData["tgBalance"] = userOmocBalance.data.vestingmachine!.tgBalance;
            cData["stakedBalance"] = userOmocBalance.data.vestingmachine!.staking.balance;
            cData["lockedBalance"] = userOmocBalance.data.vestingmachine!.staking.getLockedBalance;
            pendingWithdrawals = pendingWithdrawalsFormat(
                userOmocBalance.data.vestingmachine!.delay
            );
            vUsing = userOmocBalance.data.vestingmachine!.staking;
        } else {            
            cData["tgBalance"] = userOmocBalance.data.TG.balance;
            cData["stakedBalance"] = userOmocBalance.data.stakingmachine!.getBalance;
            cData["lockedBalance"] = userOmocBalance.data.stakingmachine!.getLockedBalance;
            pendingWithdrawals = pendingWithdrawalsFormat(
                userOmocBalance.data.delaymachine
            );
            vUsing = userOmocBalance.data.stakingmachine!;            
        }

        const lockedAmount = vUsing.getLockingInfo.amount;
        const lockedUntilTimestamp = vUsing.getLockingInfo.untilTimestamp * 1000;

        if (lockedUntilTimestamp > nowTimestamp) {
            cData["lockedInVoting"] = lockedAmount;
        } else {
            cData["lockedInVoting"] = 0n;
        }

        cData["unstakeBalance"] = cData["stakedBalance"] - cData["lockedInVoting"];

        const pendingWithdrawalsFormatted: PendingWithdrawal[] = pendingWithdrawals
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
        let pendingExpirationAmount: bigint = 0n;
        let readyToWithdrawAmount: bigint = 0n;
        pendingWithdrawalsFormatted.forEach(({ status, amount }: PendingWithdrawal) => {
            if (status === withdrawalStatus.pending) {
                pendingExpirationAmount = pendingExpirationAmount + amount;
            } else {
                readyToWithdrawAmount = readyToWithdrawAmount + amount;
            }
        });
        const pendingWithdrawalsSort: PendingWithdrawal[] = pendingWithdrawalsFormatted.sort(
            function (a: PendingWithdrawal, b: PendingWithdrawal) {
                return parseInt(b.id) - parseInt(a.id);
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
