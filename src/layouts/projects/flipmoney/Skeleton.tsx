import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Layout } from "antd";

import SectionHeader from "../../../components/Header";
import NotificationBody from "../../../components/Notification";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import DappFooter from "../../../components/Footer/index";
import NotConnected from "../../../components/NotConnected";

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
}

export default function Skeleton(): JSX.Element {
    const { isConnected, contractProtocolStatus, userBalance, userOmocBalance } = useWalletContext()
    
    const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(null);
    const { checkerStatus } = CheckStatusGlobal();
    
    useEffect(() => {
        if (contractProtocolStatus.data && userBalance.data && userOmocBalance.data) {
            readProtocolStatus();
        }
    }, [contractProtocolStatus.data, userBalance.data, userOmocBalance.data]);

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

    return (
    <Layout>
        <SectionHeader />        
        <Content>
            {notifStatus && <NotificationBody notifStatus={notifStatus} />}           
            {isConnected ? <Outlet /> : <NotConnected />}
        </Content>
        <Footer>
            <div className="footer-container">
                <DappFooter></DappFooter>
            </div>
        </Footer>
    </Layout>
    );
}
