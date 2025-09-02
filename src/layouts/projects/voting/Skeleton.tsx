import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Layout } from "antd";
import { useChainId } from "wagmi";

import SectionHeader from "../../../components/Header";
import NotificationBody from "../../../components/Notification";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import DappFooter from "../../../components/Footer/index";
import NotConnected from "../../../components/NotConnected";

import { useWalletContext } from "../../../context/Wallet";
import { AutoReconnect } from "../../../components/AutoReconnect";
import { NetworkGuard } from "../../../components/NetworkGuard";
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
    button?: { class: string; label: string; onClick: () => void };
}
export default function Skeleton(): JSX.Element {
    const { isConnected, contractProtocolStatus, userBalance, userOmocBalance, userVeto } = useWalletContext()
    const navigate = useNavigate();
    const chainId = useChainId()
    const isWrongNetwork = isConnected && chainId !== ALLOWED_CHAIN.id
    
    const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(null);
    const [vetoWithdraw, setVetoWithdraw] = useState<NotificationStatus | null>(null);
    const { checkerStatus } = CheckStatusGlobal();
    
    useEffect(() => {
        if (contractProtocolStatus.data && userBalance.data && userOmocBalance.data && userVeto.data && !isWrongNetwork) {
            readProtocolStatus();
        }
    }, [contractProtocolStatus.data, userBalance.data, userOmocBalance.data, userVeto.data, isWrongNetwork]);

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

    return (
    <Layout>
        {/* <AutoReconnect />  Always runs on mount */}        
        <SectionHeader />        
        <Content>
            <NetworkGuard />
            {notifStatus && <NotificationBody notifStatus={notifStatus} />}           
            {vetoWithdraw && <NotificationBody notifStatus={vetoWithdraw} />}
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
