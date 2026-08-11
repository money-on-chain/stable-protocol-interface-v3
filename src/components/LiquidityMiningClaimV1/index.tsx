import "../LiquidityMiningClaim/Styles.scss";
import "./Styles.scss";

import React, { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import {
    AGENT_SIGNAL_VALUE_WEI,
    getRewardedTodayV1,
    hasClaimedToday,
    truncateHash,
} from "../../helpers/incentives";
import { useProjectTranslation } from "../../helpers/translations";
import {
    useIncentivesAgent,
    useIncentivesBalance,
    useIncentivesClaims,
} from "../../hooks/useIncentives";
import Button from "../Button";
import { PrecisionNumbers } from "../PrecisionNumbers";
import PerformanceChart from "../Staking/performanceChart";
import LiquidityMiningClaimsV1 from "../Tables/LiquidityMiningClaimsV1";

type ClaimStatus = "idle" | "sign" | "pending" | "success" | "error";

const STATUS_ICON: Record<Exclude<ClaimStatus, "idle">, string> = {
    sign: "icon-tx-signWallet",
    pending: "icon-tx-waiting",
    success: "icon-tx-success",
    error: "icon-tx-error",
};

// v1 port of the old dapp's Rewards page (MocLiquidity + Claims), fleshing
// out the previously-mocked LiquidityMiningClaim. moc-v1's reward is a
// centralized, backend-computed daily MOC accrual, claimed by sending a
// tiny fixed-value native-coin "signal" transaction to a backend-supplied
// agent address (see hooks/useIncentives.ts) — there's no on-chain reward
// contract at all, deliberately not IncentiveV2.
export default function LiquidityMiningClaimV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const navigate = useNavigate();
    const space = " ";

    const { address, interfaceTransferCoinbaseV1, userBalanceV1 } =
        useWalletContext();

    const { data: agent } = useIncentivesAgent();
    const { data: balance, refetch: refetchBalance } =
        useIncentivesBalance(address);
    const {
        claims: recentClaims,
        refetch: refetchClaims,
    } = useIncentivesClaims(address, 1, 20);

    const [status, setStatus] = useState<ClaimStatus>("idle");
    const [txHash, setTxHash] = useState<string>("");

    const rewardedToday = useMemo(() => {
        if (!balance || !userBalanceV1.data) return null;
        return getRewardedTodayV1(
            balance.dailyMoc,
            userBalanceV1.data.BPro.balance,
            balance.totalBpro,
            balance.endBlockDt
        );
    }, [balance, userBalanceV1.data]);

    const alreadyClaimedToday = hasClaimedToday(recentClaims);
    const claimDisabled =
        !address ||
        !agent?.agentAddress ||
        alreadyClaimedToday ||
        status === "sign" ||
        status === "pending";

    const onClaim = (): void => {
        if (!agent?.agentAddress) return;

        setStatus("sign");
        setTxHash("");

        const onTransaction = (hash: string): void => {
            setTxHash(hash);
            setStatus("pending");
        };
        const onReceipt = (): void => {
            setStatus("success");
            void refetchBalance();
            void refetchClaims();
        };

        void interfaceTransferCoinbaseV1(
            AGENT_SIGNAL_VALUE_WEI,
            agent.agentAddress,
            onTransaction,
            onReceipt
        ).catch((error: unknown) => {
            console.error("LiquidityMiningClaimV1 claim error:", error);
            setStatus("error");
        });
    };

    const statusLabels: Record<Exclude<ClaimStatus, "idle">, string> = {
        sign: t("staking.modal.StatusModal_Modal_TxStatus_sign"),
        pending: t("staking.modal.StatusModal_Modal_TxStatus_pending"),
        success: t("staking.modal.StatusModal_Modal_TxStatus_success"),
        error: t("staking.modal.StatusModal_Modal_TxStatus_failed"),
    };

    const explorerUrl = String(
        import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL || ""
    );

    return (
        <Fragment>
            <div className="section row-section">
                <div className="firstCardsGroup">
                    <div id="claimCard" className="layout-card">
                        <div className="layout-card-title">
                            <h1>{t("liquidityMining.cardTitle")}</h1>
                        </div>

                        <div className="cta-container">
                            <div className="cta-info-group">
                                <div className="cta-info-detail">
                                    {t("liquidityMining.cta.infoDetail")}
                                </div>
                                <div className="cta-info-summary">
                                    {rewardedToday
                                        ? PrecisionNumbers({
                                              amount: rewardedToday.toGetNow,
                                              token: TokenSettings("TG"),
                                              decimals: 6,
                                              i18n,
                                              compact: true,
                                              useNoLimit: true,
                                          })
                                        : "--"}
                                    {space}
                                    {t("liquidityMining.v1.earnedToday")}
                                </div>
                                <div className="cta-info-summary">
                                    {balance
                                        ? PrecisionNumbers({
                                              amount: balance.mocBalance,
                                              token: TokenSettings("TG"),
                                              decimals: 6,
                                              i18n,
                                              compact: true,
                                              useNoLimit: true,
                                          })
                                        : "--"}
                                    {space}
                                    {t("liquidityMining.cta.infoSummary")}
                                </div>
                            </div>
                            <div className="cta-options-group">
                                <Button
                                    type="primary"
                                    className="button"
                                    disabled={claimDisabled}
                                    onClick={onClaim}
                                >
                                    {t("liquidityMining.cta.button")}
                                </Button>
                            </div>
                            {status !== "idle" && (
                                <div className="cta-info-group">
                                    <div className="cta-info-summary">
                                        <div
                                            className={STATUS_ICON[status]}
                                        ></div>
                                        {statusLabels[status]}
                                    </div>
                                    {txHash && (
                                        <div className="claimStatusV1__hash">
                                            {explorerUrl ? (
                                                <a
                                                    href={`${explorerUrl}/tx/${txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {truncateHash(txHash)}
                                                </a>
                                            ) : (
                                                truncateHash(txHash)
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div id="performanceCard" className="layout-card">
                        <div className="layout-card-title">
                            <h1>{t("staking.performance.title")}</h1>
                        </div>
                        <div className="tab-content">
                            <div className="stakeCTA">
                                {t("liquidityMining.stakingCTA.explanation")}
                                <button
                                    className="button secondary"
                                    onClick={() => navigate("/staking")}
                                >
                                    {t("liquidityMining.stakingCTA.button")}
                                </button>
                            </div>
                            <PerformanceChart />
                        </div>
                    </div>
                </div>
                <div className="secondCardsGroup">
                    <LiquidityMiningClaimsV1 />
                </div>
            </div>
        </Fragment>
    );
}
