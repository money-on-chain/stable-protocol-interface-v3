// NetworkGuard.tsx
import { Space } from "antd";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { AppNotification } from "../Notifications";


import { ALLOWED_CHAIN } from "../../wagmiConfig";

export function NetworkGuard() {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain, isPending } = useSwitchChain();

    // Only warn when connected AND on a different chain than allowed
    const isWrongNetwork = isConnected && chainId !== ALLOWED_CHAIN.id;

    if (!isWrongNetwork) return null;

    return (
        <AppNotification
            type="error"
            title="Wrong network"
            content={
                <Space direction="vertical" size={8}>
                    <span>
                        You are connected to the wrong network. This environment
                        only allows <strong>{ALLOWED_CHAIN.name}</strong>.
                    </span>                    
                </Space>
            }
            actions={[
                {
                    key: "switch-network",
                    label: `Switch to ${ALLOWED_CHAIN.name}`,
                    type: "primary",
                    loading: isPending,
                    onClick: () => {
                        switchChain({ chainId: ALLOWED_CHAIN.id })
                    },
                },
            ]}
            notificationId="network-guard"
            lingerMs={4000}
        />
    );
}
