// NetworkGuard.tsx
import React from "react";
import { Alert, Button, Space } from "antd";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ALLOWED_CHAIN } from "../../wagmiConfig";
import { useProjectTranslation } from "../../helpers/translations";

export function NetworkGuard() {
    const { t } = useProjectTranslation();
    const space = "\u00A0";
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
                        {t("networkGuard.displayMessage")}
                        {space}
                        <strong>{ALLOWED_CHAIN.name}</strong>.
                    </span>
                    <Button
                        type="primary"
                        loading={isPending}
                        onClick={() =>
                            switchChain({ chainId: ALLOWED_CHAIN.id })
                        }
                    >
                        {t("networkGuard.switchMessage")}
                        {space} {ALLOWED_CHAIN.name}
                    </Button>
                </Space>
            }
        />
    );
}
