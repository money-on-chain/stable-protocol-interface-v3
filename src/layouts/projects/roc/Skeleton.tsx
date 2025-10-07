import { Layout } from "antd";
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import DappFooter from "../../../components/Footer/index";
import SectionHeader from "../../../components/Header";
import NotificationBody from "../../../components/Notification";
import ModalTokenMigration from "../../../components/TokenMigration/Modal";
import { useWalletContext } from "../../../context/Wallet";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import { useProjectTranslation } from "../../../helpers/translations";
import { isSomeTCLockedByVeto } from "../../../helpers/veto";

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
    button?: { class: string; label: string; onClick: () => void };
}

export default function Skeleton(): JSX.Element {
    const { t } = useProjectTranslation();
    const {
        isConnected,
        contractProtocolStatus,
        userBalance,
        userOmocBalance,
        userVeto,
        contractStatusOmoc,
        address,
    } = useWalletContext();
    const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(
        null
    );
    const [vetoWithdraw, setVetoWithdraw] = useState<NotificationStatus | null>(
        null
    );
    const [canSwap, setCanSwap] = useState<boolean>(false);
    const { checkerStatus } = CheckStatusGlobal();
    const navigate = useNavigate();

    useEffect(() => {
        if (
            contractProtocolStatus.data &&
            userBalance.data &&
            userOmocBalance.data
        ) {
            readProtocolStatus();
            readTpLegacyBalance();
        }
        if (userVeto.data && contractStatusOmoc.data && address) {
            readWithdrawStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        contractProtocolStatus.data,
        userBalance.data,
        userOmocBalance.data,
        userVeto.data,
        contractStatusOmoc.data,
        address,
    ]);

    const readProtocolStatus = (): void => {
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
    };

    const readTpLegacyBalance = (): void => {
        if (!userBalance.data) return;
        if (!userBalance.data.tpLegacy) return;        
        const tpLegacyBalance = (userBalance.data).tpLegacy?.balance;
        if (!tpLegacyBalance) return;
        if (tpLegacyBalance > 0n) {
            setCanSwap(true);
        } else {
            setCanSwap(false);
        }
    };

    const readWithdrawStatus = (): void => {
        if (!userVeto.data) return;
        if (!contractStatusOmoc.data) return;
        if (!address) return;
        if (
            isSomeTCLockedByVeto(
                userVeto.data,
                contractStatusOmoc.data,
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
    };

    return (
        <Layout>
            <SectionHeader />
            <Content>
                {canSwap && <ModalTokenMigration />}

                {/* TODO load an array of notifStatus items, and load a mapping for showing notifs here in this section , interact with a React Context */}
                {notifStatus && <NotificationBody notifStatus={notifStatus} />}
                {vetoWithdraw && (
                    <NotificationBody notifStatus={vetoWithdraw} />
                )}

                {/* {auth.web3Error && <W3ErrorAlert />} */}

                {isConnected && <Outlet />}
            </Content>
            <Footer>
                <div className="footer-container">
                    <DappFooter></DappFooter>
                </div>
            </Footer>
        </Layout>
    );
}
