import React, { Fragment, useState, useEffect, useContext } from "react";
import { useProjectTranslation } from "../../helpers/translations";
import { pendingWithdrawalsFormat, tokenStake } from "../../helpers/staking";
import BigNumber from "bignumber.js";
import Stake from "./Stake";
import PieChartComponent from "./PieChart";
import PerformanceChart from "./performanceChart";
import Withdraw from "./WithdrawV2";
import DashBoard from "./StakingDashboard";
import { AuthenticateContext } from "../../context/Auth";
import Web3 from "web3";
import { fromContractPrecisionDecimals } from "../../helpers/Formats";
import { TokenSettings } from "../../helpers/currencies";

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
    tgBalance: BigNumber;
    stakedBalance: BigNumber;
    lockedBalance: BigNumber;
    pendingWithdrawals: PendingWithdrawal[];
    totalPendingExpiration: BigNumber;
    totalAvailableToWithdraw: BigNumber;
    lockedInVoting: BigNumber;
    unstakeBalance?: BigNumber;
}

interface VestingMachine {
    tgBalance: string;
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

interface UserBalanceData {
    vestingmachine?: VestingMachine;
    TG?: {
        balance: string;
    };
    stakingmachine?: StakingMachine;
    delaymachine?: any;
}

const withdrawalStatus: WithdrawalStatus = {
    pending: "PENDING",
    available: "AVAILABLE",
};

const defaultTokenStake: string = tokenStake()[0];
const tokenSettingsStake: any = TokenSettings(defaultTokenStake);

const formatBigNumber = (amount: string): BigNumber => {
    return new BigNumber(
        fromContractPrecisionDecimals(amount, tokenSettingsStake.decimals)
    );
};

export default function Staking(): JSX.Element {
    const auth = useContext(AuthenticateContext);
    const { t } = useProjectTranslation();
    const [activeTab, setActiveTab] = useState<string>("tab1");

    const defaultUserInfoStaking: UserInfoStaking = {
        tgBalance: new BigNumber(0),
        stakedBalance: new BigNumber(0),
        lockedBalance: new BigNumber(0),
        pendingWithdrawals: [],
        totalPendingExpiration: new BigNumber(0),
        totalAvailableToWithdraw: new BigNumber(0),
        lockedInVoting: new BigNumber(0),
    };
    const [userInfoStaking, setUserInfoStaking] = useState<UserInfoStaking>(
        defaultUserInfoStaking
    );

    useEffect(() => {
        if (auth.accountData && auth.userBalanceData) {
            refreshBalances();
        }
    }, [auth]);

    const refreshBalances = (): void => {
        const cData: UserInfoStaking = { ...userInfoStaking };
        const nowTimestamp: BigNumber = new BigNumber(Date.now());
        let pendingWithdrawals: PendingWithdrawal[] = [];
        let vUsing: VestingMachine | StakingMachine;
        
        if (auth.isVestingLoaded()) {
            cData["tgBalance"] = formatBigNumber(
                auth.userBalanceData.vestingmachine!.tgBalance
            );
            cData["stakedBalance"] = formatBigNumber(
                auth.userBalanceData.vestingmachine!.staking.balance
            );
            cData["lockedBalance"] = formatBigNumber(
                auth.userBalanceData.vestingmachine!.staking.getLockedBalance
            );
            pendingWithdrawals = pendingWithdrawalsFormat(
                auth.userBalanceData.vestingmachine!.delay
            );
            vUsing = auth.userBalanceData.vestingmachine!.staking;
        } else {
            cData["tgBalance"] = formatBigNumber(
                auth.userBalanceData.TG!.balance
            );
            cData["stakedBalance"] = formatBigNumber(
                auth.userBalanceData.stakingmachine!.getBalance
            );
            cData["lockedBalance"] = formatBigNumber(
                auth.userBalanceData.stakingmachine!.getLockedBalance
            );
            pendingWithdrawals = pendingWithdrawalsFormat(
                auth.userBalanceData.delaymachine
            );
            vUsing = auth.userBalanceData.stakingmachine!;
        }

        const lockedAmount: BigNumber = new BigNumber(
            Web3.utils.fromWei(vUsing.getLockingInfo.amount, "ether")
        );
        const lockedUntilTimestamp: BigNumber = new BigNumber(
            vUsing.getLockingInfo.untilTimestamp
        ).times(1000);

        if (lockedUntilTimestamp.gt(nowTimestamp)) {
            cData["lockedInVoting"] = lockedAmount;
        } else {
            cData["lockedInVoting"] = new BigNumber(0);
        }

        cData["unstakeBalance"] = cData["stakedBalance"].minus(
            cData["lockedInVoting"]
        );

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
        let pendingExpirationAmount: BigNumber = new BigNumber(0);
        let readyToWithdrawAmount: BigNumber = new BigNumber(0);
        pendingWithdrawalsFormatted.forEach(({ status, amount }: PendingWithdrawal) => {
            if (status === withdrawalStatus.pending) {
                pendingExpirationAmount = BigNumber.sum(
                    pendingExpirationAmount,
                    formatBigNumber(amount)
                );
            } else {
                readyToWithdrawAmount = BigNumber.sum(
                    readyToWithdrawAmount,
                    formatBigNumber(amount)
                );
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
