// NetworkGuard.tsx
import { Alert, Button, Space } from "antd";
import React from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import { ALLOWED_CHAIN } from "../../wagmiConfig";

export function NetworkGuard() {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain, isPending } = useSwitchChain();

    // Only warn when connected AND on a different chain than allowed
    const isWrongNetwork = isConnected && chainId !== ALLOWED_CHAIN.id;

    if (!isWrongNetwork) return null;

    return (
        <Alert
            type="error"
            showIcon
            message="Wrong network"
            description={
                <Space direction="vertical" size={8}>
                    <span>
                        You are connected to the wrong network. This environment
                        only allows <strong>{ALLOWED_CHAIN.name}</strong>.
                    </span>
                    <Button
                        type="primary"
                        loading={isPending}
                        onClick={() =>
                            switchChain({ chainId: ALLOWED_CHAIN.id })
                        }
                    >
                        Switch to {ALLOWED_CHAIN.name}
                    </Button>
                </Space>
            }
        />
    );
}
