import "../PortfolioDashboard/Styles.scss";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useWalletContext } from "../../../context/Wallet";
import { TokenSettings } from "../../../helpers/currencies";
import { getRewardedTodayV1 } from "../../../helpers/incentives";
import { pendingWithdrawalsFormat } from "../../../helpers/staking";
import { useProjectTranslation } from "../../../helpers/translations";
import { useIncentivesBalance } from "../../../hooks/useIncentives";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface PendingWithdrawal {
    amount: bigint;
    expiration: bigint;
}

interface DashboardItemProps {
    actionLabel?: string;
    amount?: bigint;
    icon: string;
    label: string;
    onAction?: () => void;
    testId: string;
}

function DashboardItem({
    actionLabel,
    amount,
    icon,
    label,
    onAction,
    testId,
}: DashboardItemProps): React.ReactElement {
    const { i18n } = useProjectTranslation();

    const content = (
        <>
            <div className="portfolioDash__icon__back">
                <div className={icon}></div>
            </div>
            <div className="portfolioDash__data" data-testid={testId}>
                <div className="portfolioDash__data__amount">
                    {amount == null
                        ? "--"
                        : PrecisionNumbers({
                              amount,
                              token: TokenSettings("TG"),
                              decimals: 6,
                              i18n,
                              compact: true,
                              useNoLimit: true,
                          })}
                </div>
                <div className="portfolioDash__data__label">
                    <span>{label}</span>
                </div>
            </div>
        </>
    );

    if (onAction) {
        return (
            <button
                aria-label={actionLabel}
                className="portfolioDash__item portfolioDash__item--actionable"
                onClick={onAction}
                type="button"
            >
                {content}
            </button>
        );
    }

    return <div className="portfolioDash__item">{content}</div>;
}

export default function PortfolioDashboardV1(): React.ReactElement {
    const { t } = useProjectTranslation();
    const navigate = useNavigate();
    const {
        address,
        userBalanceV1,
        userOmocBalance,
        userVesting,
        isVestingLoaded,
    } = useWalletContext();
    const { data: incentivesBalance } = useIncentivesBalance(address);

    const dashboardData = useMemo(() => {
        const result: {
            earnedToday?: bigint;
            staked: bigint;
            readyToWithdraw: bigint;
        } = {
            staked: 0n,
            readyToWithdraw: 0n,
        };

        if (incentivesBalance && userBalanceV1.data) {
            result.earnedToday = getRewardedTodayV1(
                incentivesBalance.dailyMoc,
                userBalanceV1.data.BPro.balance,
                incentivesBalance.totalBpro,
                incentivesBalance.endBlockDt
            ).toGetNow;
        }

        let pendingWithdrawals: PendingWithdrawal[] = [];

        if (isVestingLoaded() && userVesting.data) {
            result.staked =
                userVesting.data.vestingmachine?.staking?.balance ?? 0n;
            pendingWithdrawals = pendingWithdrawalsFormat(
                userVesting.data.vestingmachine?.delay
            );
        } else if (userOmocBalance.data) {
            result.staked =
                userOmocBalance.data.stakingmachine?.getBalance ?? 0n;
            pendingWithdrawals = pendingWithdrawalsFormat(
                userOmocBalance.data.delaymachine
            );
        }

        const now = Date.now();
        pendingWithdrawals.forEach(({ amount, expiration }) => {
            if (expiration > 0n && Number(expiration) * 1000 <= now) {
                result.readyToWithdraw += amount;
            }
        });

        return result;
    }, [
        incentivesBalance,
        isVestingLoaded,
        userBalanceV1.data,
        userOmocBalance.data,
        userVesting.data,
    ]);

    return (
        <div className="layout-card dashboard-portfolio-info dashboard-portfolio-info--v1">
            <DashboardItem
                actionLabel={t("liquidityMining.cta.button")}
                amount={incentivesBalance?.mocBalance}
                icon="icon__rewardReadyToClaim"
                label={t("portfolio.dashboard.readyToClaim")}
                onAction={() => navigate("/liquidity-mining")}
                testId="portfolio-dashboard-ready-to-claim"
            />
            <DashboardItem
                amount={dashboardData.earnedToday}
                icon="icon__rewardedToday"
                label={t("portfolio.dashboard.earnedToday")}
                testId="portfolio-dashboard-earned-today"
            />
            <DashboardItem
                amount={dashboardData.staked}
                icon="icon__govStaked"
                label={t("portfolio.dashboard.staked")}
                testId="portfolio-dashboard-staked"
            />
            <DashboardItem
                actionLabel={t("staking.cardTitle")}
                amount={dashboardData.readyToWithdraw}
                icon="icon__govReadyWithdraw"
                label={t("portfolio.dashboard.readyToWithdraw")}
                onAction={() => navigate("/staking")}
                testId="portfolio-dashboard-ready-to-withdraw"
            />
        </div>
    );
}
