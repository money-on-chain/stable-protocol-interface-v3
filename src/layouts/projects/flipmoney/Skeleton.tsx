import { Layout } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useChainId } from "wagmi";

import DappFooter from "../../../components/Footer/index";
import SectionHeader from "../../../components/Header";
import { NetworkGuard } from "../../../components/NetworkGuard";
import NotConnected from "../../../components/NotConnected";
import NotificationBody from "../../../components/Notification";
import UpdateToast from "../../../components/UpdateToast";
import { useWalletContext } from "../../../context/Wallet";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import { useProjectTranslation } from "../../../helpers/translations";
import { isSomeTCLockedByVeto } from "../../../helpers/veto";
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
    } = useWalletContext();
    const chainId = useChainId();
    const isWrongNetwork = isConnected && chainId !== ALLOWED_CHAIN.id;
    const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(
        null
    );
    const [vetoWithdraw, setVetoWithdraw] = useState<NotificationStatus | null>(
        null
    );
    const { checkerStatus } = CheckStatusGlobal();
    const navigate = useNavigate();

    const readProtocolStatus = useCallback((): void => {
        const { globalStatus, statusLabel, statusText } = checkerStatus();

        if (globalStatus > 1) {
            setNotifStatus({
                id: -1,
                title: `Warning, protocol status is ${statusLabel}`,
                textContent: statusText,
                notifClass: "warning",
                iconLeft: "warning-icon", // Default icon since statusIcon doesn't exist
                isDismisable: false,
                dismissTime: 0,
            });
        } else {
            setNotifStatus(null);
        }
    }, [checkerStatus]);

    const readWithdrawStatus = useCallback((): void => {
        if (!userVeto.data || !contractStatusOmoc.data || !address) return;

        const statusData = contractStatusOmoc.data;
        
        if (
            isSomeTCLockedByVeto(
                userVeto.data as { vetoMachine: { getUserLockedAmount: Record<string, Record<string, bigint>>; }; },
                {
                    votingmachine: {
                        getVotingData: statusData.votingmachine.getVotingData,
                        getState: Number(statusData.votingmachine.getState),
                    }
                },
                address
            )
        ) {
            setVetoWithdraw({
                id: -1,
                title: t(`voting.veto.alert.title`),
                textContent: t(`voting.veto.alert.text`),
                notifClass: "warning",
                iconLeft: "warning-icon", // Default icon since statusIcon doesn't exist
                isDismisable: false,
                dismissTime: 0,
                button: {
                    class: "button-withdraw",
                    label: t(`voting.veto.alert.cta`),
                    onClick: () => {
                        navigate("/veto/withdraw");
                    },
                },
            });
        } else {
            setVetoWithdraw(null);
        }
    }, [userVeto.data, contractStatusOmoc.data, address, t, navigate]);

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
        <Layout>
            {/* <AutoReconnect />  Always runs on mount */}
            <SectionHeader />
            <Content>
                <NetworkGuard />
                <UpdateToast />
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
    );
}
