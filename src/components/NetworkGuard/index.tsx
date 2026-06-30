import { Space } from "antd";
import { Trans } from "react-i18next";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import { useProjectTranslation } from "../../helpers/translations";
import { ALLOWED_CHAIN } from "../../wagmiConfig";
import { AppNotification } from "../Notifications";

export function NetworkGuard() {
    const { t } = useProjectTranslation();
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain, isPending } = useSwitchChain();

    const isWrongNetwork = isConnected && chainId !== ALLOWED_CHAIN.id;

    if (!isWrongNetwork) return null;

    return (
        <AppNotification
            type="error"
            title={t("notification.networkGuard.title")}
            content={
                <Space direction="vertical" size={8}>
                    <span>
                        <Trans
                            i18nKey="notification.networkGuard.content"
                            values={{ chainName: ALLOWED_CHAIN.name }}
                            components={{ strong: <strong /> }}
                        />
                    </span>
                </Space>
            }
            actions={[
                {
                    key: "switch-network",
                    label: t("notification.networkGuard.switch", {
                        chainName: ALLOWED_CHAIN.name,
                    }),
                    type: "primary",
                    loading: isPending,
                    onClick: () => {
                        switchChain({ chainId: ALLOWED_CHAIN.id });
                    },
                },
            ]}
            notificationId="network-guard"
            lingerMs={4000}
        />
    );
}
