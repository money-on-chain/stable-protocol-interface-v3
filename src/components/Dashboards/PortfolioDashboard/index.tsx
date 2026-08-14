import "./Styles.scss";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useWalletContext } from "../../../context/Wallet";
import { pendingWithdrawalsFormat } from "../../../helpers/staking";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface PendingWithdrawal {
    amount: bigint;
    expiration: bigint;
}

interface DashboardItemProps {
    actionLabel?: string;
    amount: bigint;
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
    const { t, i18n } = useProjectTranslation();

    const content = (
        <>
            <div className="portfolioDash__icon__back">
                <div className={icon}></div>
            </div>
            <div className="portfolioDash__data" data-testid={testId}>
                <div className="portfolioDash__data__amount">
                    {PrecisionNumbers({
                        amount,
                        token: settings.tokens.TG[0],
                        decimals: Number(t("staking.display_decimals")),
                        i18n,
                        compact: true,
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

export default function PortfolioDashboard(): React.ReactElement {
    const { t } = useProjectTranslation();
    const navigate = useNavigate();
    const { userOmocBalance, userVesting, isVestingLoaded } =
        useWalletContext();

    const balances = useMemo(() => {
        const result = {
            readyToClaim: userOmocBalance.data?.incentiveV2?.userBalance ?? 0n,
            balance: 0n,
            staked: 0n,
            unstaking: 0n,
            readyToWithdraw: 0n,
        };

        let pendingWithdrawals: PendingWithdrawal[] = [];

        if (isVestingLoaded() && userVesting.data) {
            result.balance = userVesting.data.vestingmachine?.tgBalance ?? 0n;
            result.staked =
                userVesting.data.vestingmachine?.staking?.balance ?? 0n;
            pendingWithdrawals = pendingWithdrawalsFormat(
                userVesting.data.vestingmachine?.delay
            );
        } else if (userOmocBalance.data) {
            result.balance = userOmocBalance.data.TG?.balance ?? 0n;
            result.staked =
                userOmocBalance.data.stakingmachine?.getBalance ?? 0n;
            pendingWithdrawals = pendingWithdrawalsFormat(
                userOmocBalance.data.delaymachine
            );
        }

        const now = Date.now();
        pendingWithdrawals.forEach(({ amount, expiration }) => {
            if (expiration <= 0n) return;

            if (Number(expiration) * 1000 > now) {
                result.unstaking += amount;
            } else {
                result.readyToWithdraw += amount;
            }
        });

        return result;
    }, [isVestingLoaded, userOmocBalance.data, userVesting.data]);

    return (
        <div className="layout-card dashboard-portfolio-info dashboard-portfolio-info--roc">
            <DashboardItem
                actionLabel={t("liquidityMining.cta.button")}
                amount={balances.readyToClaim}
                icon="icon__rewardReadyToClaim"
                label={t("portfolio.dashboard.readyToClaim")}
                onAction={() => navigate("/liquidity-mining")}
                testId="portfolio-dashboard-ready-to-claim"
            />
            <DashboardItem
                amount={balances.balance}
                icon="icon__govBalance"
                label={t("portfolio.dashboard.balance")}
                testId="portfolio-dashboard-balance"
            />
            <DashboardItem
                amount={balances.staked}
                icon="icon__govStaked"
                label={t("portfolio.dashboard.staked")}
                testId="portfolio-dashboard-staked"
            />
            <DashboardItem
                amount={balances.unstaking}
                icon="icon__govUnstaking"
                label={t("portfolio.dashboard.unstaking")}
                testId="portfolio-dashboard-unstaking"
            />
            <DashboardItem
                actionLabel={t("staking.cardTitle")}
                amount={balances.readyToWithdraw}
                icon="icon__govReadyWithdraw"
                label={t("portfolio.dashboard.readyToWithdraw")}
                onAction={() => navigate("/staking")}
                testId="portfolio-dashboard-ready-to-withdraw"
            />
        </div>
    );
}
