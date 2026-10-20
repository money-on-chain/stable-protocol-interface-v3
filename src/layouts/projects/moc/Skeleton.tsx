import { Layout } from "antd";
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import DappFooter from "../../../components/Footer/index";
import SectionHeader from "../../../components/Header";
import MenuBar from "../../../components/MenuBar";
import { NetworkGuard } from "../../../components/NetworkGuard";
import NotConnected from "../../../components/NotConnected";
import NotificationBody from "../../../components/Notification";
import UpdateToast from "../../../components/UpdateToast";
import { useWalletContext } from "../../../context/Wallet";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import { isPriceValidationEnabled } from "../../../helpers/priceValidation";
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
        isOnCorrectChain,
        contractProtocolStatus,
        contractProtocolStatusV1,
        userBalance,
        userOmocBalance,
        userVeto,
        contractStatusOmoc,
        address,
    } = useWalletContext();

    // When the wallet is connected but on a different chain (e.g. MetaMask still
    // on Ethereum mainnet because the target network was never added), contract
    // discovery bails out and every data hook stays gated off — the dashboards
    // would otherwise spin forever with no message. Surface NetworkGuard and
    // hold the routed content until the wallet is on the right chain.
    const isWrongNetwork = isConnected && !isOnCorrectChain;
    const navigate = useNavigate();
    const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(
        null
    );
    const [vetoWithdraw, setVetoWithdraw] = useState<NotificationStatus | null>(
        null
    );
    const { checkerStatus } = CheckStatusGlobal();

    // moc-v1 price validity: BTC / MoC price providers peek() valid flag.
    // No-op on the v3 moc flavor, where contractProtocolStatusV1 stays empty.
    const priceNotValidStatus: NotificationStatus | null = React.useMemo(() => {
        if (!isPriceValidationEnabled()) return null;
        // Price feeds still being retried would read as invalid meanwhile
        if (contractProtocolStatusV1.isRetryingPeeks) return null;

        const data = contractProtocolStatusV1.data;
        if (!data || (!data.PP_BTC && !data.PP_MOC)) return null;

        const invalid = [data.PP_BTC, data.PP_MOC].some((pp) => pp && !pp[1]);
        if (!invalid) return null;

        return {
            id: -1,
            title: "Warning, price is invalid or a bit old",
            textContent:
                "Price is invalid or a bit old, operate at your own risk",
            notifClass: "warning",
            iconLeft: "warning-icon",
            isDismisable: false,
            dismissTime: 0,
        };
    }, [
        contractProtocolStatusV1.data,
        contractProtocolStatusV1.isRetryingPeeks,
    ]);

    useEffect(() => {
        if (
            contractProtocolStatus.data &&
            userBalance.data &&
            userOmocBalance.data
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

    const readWithdrawStatus = (): void => {
        if (!userVeto.data || !contractStatusOmoc.data || !address) return;
        if (
            isSomeTCLockedByVeto(
                userVeto.data as Parameters<typeof isSomeTCLockedByVeto>[0],
                contractStatusOmoc.data as unknown as Parameters<
                    typeof isSomeTCLockedByVeto
                >[1],
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
            <MenuBar />
            <SectionHeader />
            <Content>
                <NetworkGuard />
                <UpdateToast />
                {/* TODO load an array of notifStatus items, and load a mapping for showing notifs here in this section , interact with a React Context */}
                {notifStatus && <NotificationBody notifStatus={notifStatus} />}
                {priceNotValidStatus && (
                    <NotificationBody notifStatus={priceNotValidStatus} />
                )}
                {vetoWithdraw && (
                    <NotificationBody notifStatus={vetoWithdraw} />
                )}

                {/* {auth.web3Error && <W3ErrorAlert />} */}

                {isConnected &&
                    (isWrongNetwork ? <NotConnected /> : <Outlet />)}
            </Content>
            <Footer>
                <div className="footer-container">
                    <DappFooter></DappFooter>
                </div>
            </Footer>
        </Layout>
    );
}
