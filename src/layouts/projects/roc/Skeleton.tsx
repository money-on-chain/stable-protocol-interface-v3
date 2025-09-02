import React, { useContext, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Layout } from "antd";

import SectionHeader from "../../../components/Header";
import ModalTokenMigration from "../../../components/TokenMigration/Modal";
import NotificationBody from "../../../components/Notification";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import DappFooter from "../../../components/Footer/index";
import { useWalletContext } from "../../../context/Wallet";

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
    const { isConnected, contractProtocolStatus, userBalance, userOmocBalance, userVeto } = useWalletContext()
    const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(null);
    const [vetoWithdraw, setVetoWithdraw] = useState<NotificationStatus | null>(null);
    const [canSwap, setCanSwap] = useState<boolean>(false);
    const { checkerStatus } = CheckStatusGlobal();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (contractProtocolStatus.data && userBalance.data && userOmocBalance.data && userVeto.data) {
            readProtocolStatus();
            readTpLegacyBalance();
        }
    }, [contractProtocolStatus.data, userBalance.data, userOmocBalance.data, userVeto.data]);

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
        if (true) {
            setVetoWithdraw({
                id: -1,
                title: `Collateral Tokens ready to Withdraw`,
                textContent: `Collateral Tokens used for vetoing were released. You must withdraw them to your wallet.`,
                notifClass: "warning",
                iconLeft: "warning-icon",
                isDismisable: false,
                dismissTime: 0,
                button: {
                    class: "button-withdraw",
                    label: "Withdraw Collateral",
                    onClick: () => { navigate("/veto/withdraw"); }
                }
            });
        } else {
            setVetoWithdraw(null);
        }
    };

    const readTpLegacyBalance = (): void => {
        const tpLegacyBalance = userBalance.data.tpLegacy.balance;
        if (tpLegacyBalance > 0n) {
            setCanSwap(true);
        } else {
            setCanSwap(false);
        }
    };

    return (
        <Layout>
            <SectionHeader />
            <Content>
                {canSwap && <ModalTokenMigration />}

                {/* TODO load an array of notifStatus items, and load a mapping for showing notifs here in this section , interact with a React Context */}
                {notifStatus && <NotificationBody notifStatus={notifStatus} />}
                {vetoWithdraw && <NotificationBody notifStatus={vetoWithdraw} />}

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
