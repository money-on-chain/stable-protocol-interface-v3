import { Layout } from "antd";
import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useChainId } from "wagmi";

import DappFooter from "../../../components/Footer/index";
import SectionHeader from "../../../components/Header";
import { NetworkGuard } from "../../../components/NetworkGuard";
import NotConnected from "../../../components/NotConnected";
import NotificationBody from "../../../components/Notification";
import RpcErrorAlert from "../../../components/Notification/RpcErrorAlert";
import {
    GlobalNotificationCenter,
    NotificationProvider,
} from "../../../components/Notifications";
import UpdateToast from "../../../components/UpdateToast";
import { useWalletContext } from "../../../context/Wallet";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import { useProjectTranslation } from "../../../helpers/translations";
import { isSomeTCLockedByVeto } from "../../../helpers/veto";
import settings from "../../../settings/settings.json";
import { ALLOWED_CHAIN } from "../../../wagmiConfig";

const { Content, Footer } = Layout;

// Type definitions
interface NotificationStatus {
    id: number;
    title: string;
    textContent: string;
    notifClass: string;
    iconLeft: string;
    isDismisable: boolean;
    dismissTime: number;
    button?: {
        class: string;
        label: string;
        onClick: () => void;
    };
}
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

    // Debug RPC error state (removed verbose logs)
    useEffect(() => {}, [rpcError]);
    const chainId = useChainId();
    const isWrongNetwork = isConnected && chainId !== ALLOWED_CHAIN.id;

    const { checkerStatus } = CheckStatusGlobal();
    const navigate = useNavigate();

    // 1) NOTIF STATUS (global protocol)
    const notifStatus: NotificationStatus | null = React.useMemo(() => {
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
                id: -1,
                title: `Warning, protocol status is ${statusLabel}`,
                textContent: statusText,
                notifClass: "warning",
                iconLeft: "warning-icon",
                isDismisable: false,
                dismissTime: 0,
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
    const priceNotValidStatus: NotificationStatus | null = React.useMemo(() => {
        const data = contractProtocolStatus.data;
        if (
            !data ||
            !data[0] ||
            !data[0].PP_CA ||
            !data[0].PP_FeeToken ||
            !data[0].PP_TP
        ) {
            return null;
        }

        let valid = true;

        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            if (!data[ca].PP_CA[1]) {
                valid = false;
                break;
            }
            if (!data[ca].PP_FeeToken[1]) {
                valid = false;
                break;
            }
            for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                if (!data[ca].PP_TP[tp][1]) {
                    valid = false;
                    break;
                }
            }
            if (!valid) break;
        }

        // check PP_COINBASE
        if (!data.PP_COINBASE?.[1]) {
            valid = false;
        }

        if (!valid) {
            return {
                id: -1,
                title: `Warning, price is invalid or a bit old`,
                textContent: `Price is invalid or a bit old, operate at your own risk`,
                notifClass: "warning",
                iconLeft: "warning-icon",
                isDismisable: false,
                dismissTime: 0,
            };
        }

        return null;
    }, [contractProtocolStatus.data]);

    // 3) VETO WITHDRAW
    const vetoWithdraw: NotificationStatus | null = React.useMemo(() => {
        if (!userVeto.data || !contractStatusOmoc.data || !address) return null;

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

        if (!locked) return null;

        return {
            id: -1,
            title: t(`voting.veto.alert.title`),
            textContent: t(`voting.veto.alert.text`),
            notifClass: "warning",
            iconLeft: "warning-icon",
            isDismisable: false,
            dismissTime: 0,
            button: {
                class: "button-withdraw",
                label: t(`voting.veto.alert.cta`),
                onClick: () => {
                    navigate("/veto/withdraw");
                },
            },
        };
    }, [userVeto.data, contractStatusOmoc.data, address, t, navigate]);

    return (
        <NotificationProvider>
            <Layout>
                <SectionHeader />

                {/* Global notifications, always below the header */}
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
                    {notifStatus && <NotificationBody notifStatus={notifStatus} />}
                    {vetoWithdraw && (
                        <NotificationBody notifStatus={vetoWithdraw} />
                    )}
                    {isConnected && !isWrongNetwork ? <Outlet /> : <NotConnected />}
                </Content>
                <Footer>
                    <div className="footer-container">
                        <DappFooter></DappFooter>
                    </div>
                </Footer>
            </Layout>
        </NotificationProvider>
    );
}
