import { Layout } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useChainId } from "wagmi";

import DappFooter from "../../../components/Footer/index";
import SectionHeader from "../../../components/Header";
import { NetworkGuard } from "../../../components/NetworkGuard";
import NotConnected from "../../../components/NotConnected";
import RpcErrorAlert from "../../../components/Notification/RpcErrorAlert";
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

// Local notification state is based on AppNotification props to avoid duplicating types
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
        rpcError,
        retryConnection,
        clearRpcError,
    } = useWalletContext();

    // Hook preserved to keep room for potential RPC error logging in the future
    useEffect(() => {}, [rpcError]);

    const chainId = useChainId();
    const isWrongNetwork = isConnected && chainId !== ALLOWED_CHAIN.id;

    // Protocol-wide status notification (e.g. degraded or risky protocol state)
    const [protocolNotification, setProtocolNotification] =
        useState<InlineNotificationState | null>(null);

    // Veto-related notification (user has TC locked by the Veto mechanism)
    const [vetoNotification, setVetoNotification] =
        useState<InlineNotificationState | null>(null);

    const { checkerStatus } = CheckStatusGlobal();
    const navigate = useNavigate();

    const readProtocolStatus = useCallback((): void => {
        const { globalStatus, statusLabel, statusText } = checkerStatus();

        // When the protocol is not in a fully healthy state, show a warning banner
        if (globalStatus > 1) {
            setProtocolNotification({
                type: "error",
                title: `Warning, protocol status is ${statusLabel}`,
                content: statusText,
            });
        } else {
            setProtocolNotification(null);
        }
    }, [checkerStatus]);

    const readWithdrawStatus = useCallback((): void => {
        if (!userVeto.data || !contractStatusOmoc.data || !address) return;

        const statusData = contractStatusOmoc.data;

        // Ensure voting machine data exists before accessing it
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
                        onClick: () => {
                            navigate("/veto/withdraw");
                        },
                    },
                ],
            });
        } else {
            // Clear any existing veto notification when the condition is not met
            setVetoNotification(null);
        }
    }, [userVeto.data, contractStatusOmoc.data, address, t, navigate]);

    useEffect(() => {
        // Protocol status notification depends on protocol and user balances
        if (
            contractProtocolStatus.data &&
            userBalance.data &&
            userOmocBalance.data &&
            !isWrongNetwork
        ) {
            readProtocolStatus();
        }

        // Veto notification depends on veto state and contract status
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

                {/* Global notification center, always rendered below the header */}
                <GlobalNotificationCenter />

                <Content>
                    <NetworkGuard />
                    <UpdateToast />

                    {rpcError.hasError && (
                        <RpcErrorAlert
                            error={rpcError}
                            onRetry={() => void retryConnection()}
                            onDismiss={clearRpcError}
                        />
                    )}

                    {/* Protocol health notification (inline, non-dismissible on purpose) */}
                    {protocolNotification && (
                        <AppNotification
                            {...protocolNotification}
                            deliveryMode="center"
                            dismissible={false}
                        />
                    )}

                    {/* Veto withdrawal notification with primary CTA */}
                    {vetoNotification && (
                        <AppNotification
                            {...vetoNotification}
                            deliveryMode="center"
                            dismissible={false}
                        />
                    )}

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
