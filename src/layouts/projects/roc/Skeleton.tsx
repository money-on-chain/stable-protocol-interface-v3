import React, { useContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Layout } from "antd";
import BigNumber from "bignumber.js";
import Web3 from "web3";

import { AuthenticateContext } from "../../../context/Auth";
import SectionHeader from "../../../components/Header";
import ModalTokenMigration from "../../../components/TokenMigration/Modal";
import NotificationBody from "../../../components/Notification";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import DappFooter from "../../../components/Footer/index";
import W3ErrorAlert from "../../../components/Notification/W3ErrorAlert";

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

interface AuthContext {
    contractStatusData: any;
    userBalanceData: any;
    web3Error: any;
    isLoggedIn: boolean;
}

export default function Skeleton(): JSX.Element {
    const auth = useContext(AuthenticateContext) as AuthContext;
    const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(null);
    const [canSwap, setCanSwap] = useState<boolean>(false);
    const { checkerStatus } = CheckStatusGlobal();
    
    useEffect(() => {
        if (auth.contractStatusData && auth.userBalanceData) {
            readProtocolStatus();
            readTpLegacyBalance();
        }
    }, [auth.contractStatusData, auth.userBalanceData]);

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
        const tpLegacyBalance = new BigNumber(
            Web3.utils.fromWei(auth.userBalanceData.tpLegacy.balance, "ether")
        );

        if (tpLegacyBalance.gt(0)) {
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

                {auth.web3Error && <W3ErrorAlert />}

                {!auth.web3Error && auth.isLoggedIn && <Outlet />}
            </Content>
            <Footer>
                <div className="footer-container">
                    <DappFooter></DappFooter>
                </div>
            </Footer>
        </Layout>
    );
}
