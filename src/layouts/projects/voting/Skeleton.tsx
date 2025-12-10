import { Layout } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useChainId } from "wagmi";

import DappFooter from "../../../components/Footer/index";
import SectionHeader from "../../../components/Header";
import { NetworkGuard } from "../../../components/NetworkGuard";
import NotConnected from "../../../components/NotConnected";
// New notification system
import {
    AppNotification,
    GlobalNotificationCenter,
    NotificationProvider,
} from "../../../components/Notifications";
import UpdateToast from "../../../components/UpdateToast";
import { useWalletContext } from "../../../context/Wallet";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import { useProjectTranslation } from "../../../helpers/translations";
import { isSomeTCLockedByVeto } from "../../../helpers/veto";
import { ALLOWED_CHAIN } from "../../../wagmiConfig";

const { Content, Footer } = Layout;

/**
 * Inline notification shape derived from AppNotification props.
 * This avoids duplicating interfaces and keeps consistency
 * with the global Flipmoney notification implementation.
 */
type InlineNotificationState = Pick<
    React.ComponentProps<typeof AppNotification>,
    "type" | "title" | "content" | "actions"
>;

export default function Skeleton(): JSX.Element {
    const { t } = useProjectTranslation();

    const {
        isConnected,
        contractProtocolStatus,
        userBalance,
        userOmocBalance,
        contractStatusOmoc,
        userVeto,
        address,
    } = useWalletContext();

    const chainId = useChainId();
    const isWrongNetwork = isConnected && chainId !== ALLOWED_CHAIN.id;

    // Inline system notifications: protocol degradation + veto alerts
    const [protocolNotification, setProtocolNotification] =
        useState<InlineNotificationState | null>(null);

    const [vetoNotification, setVetoNotification] =
        useState<InlineNotificationState | null>(null);

    const { checkerStatus } = CheckStatusGlobal();
    const navigate = useNavigate();

    /**
     * Evaluates the global protocol health and displays a notification
     * if the system is not in a fully healthy / operational state.
     */
    const readProtocolStatus = useCallback((): void => {
        const { globalStatus, statusLabel, statusText } = checkerStatus();

        // >1 means degraded or risky state — same threshold used in Flipmoney
        if (globalStatus > 1) {
            setProtocolNotification({
                type: "error",
                title: `Warning, protocol status is ${statusLabel}`,
                content: statusText,
            });
        } else {
            // Clear the notification when the system returns to healthy state
            setProtocolNotification(null);
        }
    }, [checkerStatus]);

    /**
     * Detects whether the user has TC locked by the Veto mechanism.
     * If so, an inline actionable warning notification is shown.
     */
    const readWithdrawStatus = useCallback((): void => {
        if (!userVeto.data || !contractStatusOmoc.data || !address) return;

        const statusData = contractStatusOmoc.data;

        // If voting machine data is not available, no veto logic can run
        if (
            !statusData.votingmachine ||
            !statusData.votingmachine.getVotingData
        ) {
            return;
        }

        const hasLockedTc = isSomeTCLockedByVeto(
            userVeto.data as {
                vetoMachine: {
                    getUserLockedAmount: Record<string, Record<string, bigint>>;
                };
            },
            {
                votingmachine: {
                    getVotingData: statusData.votingmachine.getVotingData,
                    getState: Number(statusData.votingmachine.getState),
                },
            },
            address
        );

        if (hasLockedTc) {
            setVetoNotification({
                type: "warning",
                title: t("voting.veto.alert.title"),
                content: t("voting.veto.alert.text"),
                actions: [
                    {
                        key: "veto-withdraw",
                        label: t("voting.veto.alert.cta"),
                        type: "primary",
                        onClick: () => navigate("/veto/withdraw"),
                    },
                ],
            });
        } else {
            // Clear any previously active veto notification
            setVetoNotification(null);
        }
    }, [userVeto.data, contractStatusOmoc.data, address, t, navigate]);

    /**
     * Reactively evaluate protocol and veto conditions
     * whenever the underlying data changes.
     */
    useEffect(() => {
        if (
            contractProtocolStatus.data &&
            userBalance.data &&
            userOmocBalance.data &&
            !isWrongNetwork
        ) {
            readProtocolStatus();
        }

        if (userVeto.data && contractStatusOmoc.data && address) {
            readWithdrawStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        contractProtocolStatus.data,
        userBalance.data,
        userOmocBalance.data,
        contractStatusOmoc.data,
        userVeto.data,
        address,
        isWrongNetwork,
    ]);

    return (
        <NotificationProvider>
            <Layout>
                <SectionHeader />

                {/* Global notification center (persistent overlay notifications) */}
                <GlobalNotificationCenter />

                <Content>
                    <NetworkGuard />
                    <UpdateToast />

                    {/* Inline protocol health alert */}
                    {protocolNotification && (
                        <AppNotification
                            {...protocolNotification}
                            deliveryMode="center"
                            dismissible={false}
                        />
                    )}

                    {/* Inline veto notification */}
                    {vetoNotification && (
                        <AppNotification
                            {...vetoNotification}
                            deliveryMode="center"
                            dismissible={false}
                        />
                    )}

                    {/* Page content or connection warning */}
                    {isConnected && !isWrongNetwork ? (
                        <Outlet />
                    ) : (
                        <NotConnected />
                    )}
                </Content>

                <Footer>
                    <div className="footer-container">
                        <DappFooter />
                    </div>
                </Footer>
            </Layout>
        </NotificationProvider>
    );
}
