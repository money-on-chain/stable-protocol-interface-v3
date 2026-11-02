import { Layout } from "antd";
import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import DappFooter from "../../../components/Footer/index";
import SectionHeader from "../../../components/Header";
import MenuBar from "../../../components/MenuBar";
import { NetworkGuard } from "../../../components/NetworkGuard";
import NotConnected from "../../../components/NotConnected";
import RpcErrorAlert from "../../../components/Notification/RpcErrorAlert";
import {
    AppNotification,
    GlobalNotificationCenter,
    NotificationProvider,
} from "../../../components/Notifications";
import RifProMigration from "../../../components/RifProMigration";
import ModalTokenMigration from "../../../components/TokenMigration/Modal";
import UpdateToast from "../../../components/UpdateToast";
import { useWalletContext } from "../../../context/Wallet";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import { hasInvalidProtocolPrice } from "../../../helpers/priceValidation";
import { useProjectTranslation } from "../../../helpers/translations";
import { isSomeTCLockedByVeto } from "../../../helpers/veto";
import settings from "../../../settings";

// Local notification state is based on AppNotification props to avoid duplicating types
type InlineNotificationState = Pick<
    React.ComponentProps<typeof AppNotification>,
    "type" | "title" | "content" | "actions"
>;

const { Content, Footer } = Layout;

export default function Skeleton(): JSX.Element {
    const { t } = useProjectTranslation();

    const {
        isConnected,
        isOnCorrectChain,
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

    const isWrongNetwork = isConnected && !isOnCorrectChain;

    const { checkerStatus } = CheckStatusGlobal();
    const navigate = useNavigate();

    // 1) NOTIF STATUS (global protocol)
    const protocolNotification: InlineNotificationState | null =
        React.useMemo(() => {
            if (
                !contractProtocolStatus.data ||
                !userBalance.data ||
                !userOmocBalance.data ||
                isWrongNetwork
            ) {
                return null;
            }

            const { globalStatus, statusLabel, statusText } = checkerStatus();

            if (globalStatus > 1) {
                return {
                    type: "error",
                    title: `Warning, protocol status is ${statusLabel}`,
                    content: statusText,
                };
            }

            return null;
        }, [
            contractProtocolStatus.data,
            userBalance.data,
            userOmocBalance.data,
            isWrongNetwork,
            checkerStatus,
        ]);

    // 2) PRICE VALIDITY
    const priceNotValidStatus: InlineNotificationState | null =
        React.useMemo(() => {
            const invalid = hasInvalidProtocolPrice(
                contractProtocolStatus.data,
                {
                    CA: settings.tokens.CA.length,
                    TP: settings.tokens.TP.length,
                },
                { isRetryingPeeks: contractProtocolStatus.isRetryingPeeks }
            );
            if (!invalid) return null;

            return {
                type: "error",
                title: t("notification.priceInvalid.title"),
                content: t("notification.priceInvalid.text"),
            };
        }, [
            contractProtocolStatus.data,
            contractProtocolStatus.isRetryingPeeks,
            t,
        ]);

    // 3) VETO WITHDRAW
    const vetoNotification: InlineNotificationState | null =
        React.useMemo(() => {
            if (!userVeto.data || !contractStatusOmoc.data || !address)
                return null;

            const statusData = contractStatusOmoc.data;

            if (
                !statusData.votingmachine ||
                !statusData.votingmachine.getVotingData
            ) {
                return null;
            }

            const locked = isSomeTCLockedByVeto(
                userVeto.data as {
                    vetoMachine: {
                        getUserLockedAmount: Record<
                            string,
                            Record<string, bigint>
                        >;
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

            if (!locked) return null;

            return {
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
            };
        }, [userVeto.data, contractStatusOmoc.data, address, t, navigate]);

    const legacyTpAvailable: boolean = React.useMemo(() => {
        if (!userBalance.data || !userBalance.data.tpLegacy) {
            return false;
        }

        const tpLegacyBalance = userBalance.data.tpLegacy?.balance;
        if (!tpLegacyBalance) return false;
        if (tpLegacyBalance > 0n) {
            return true;
        } else {
            return false;
        }
    }, [userBalance.data]);

    const legacyRifProAvailable = React.useMemo(() => {
        const legacyRifProBalance = userBalance.data?.rifProLegacy?.balance;

        return legacyRifProBalance !== undefined && legacyRifProBalance > 0n;
    }, [userBalance.data]);

    return (
        <NotificationProvider>
            <Layout>
                <MenuBar />
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
                            notificationId="protocol-health-alert"
                            lingerMs={4000}
                        />
                    )}
                    {priceNotValidStatus && (
                        <AppNotification
                            {...priceNotValidStatus}
                            deliveryMode="center"
                            dismissible={false}
                            notificationId="price-not-valid-alert"
                            lingerMs={4000}
                        />
                    )}
                    {/* Veto withdrawal notification with primary CTA */}
                    {vetoNotification && (
                        <AppNotification
                            {...vetoNotification}
                            deliveryMode="center"
                            dismissible={false}
                            notificationId="veto-withdrawal-alert"
                            lingerMs={4000}
                        />
                    )}
                    {/* Token migration modal */}
                    {legacyTpAvailable && <ModalTokenMigration />}
                    {legacyRifProAvailable && <RifProMigration />}
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
