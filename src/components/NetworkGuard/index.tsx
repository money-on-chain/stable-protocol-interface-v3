import { Space } from "antd";
import { Trans } from "react-i18next";
import { useAccount, useSwitchChain } from "wagmi";

import { useProjectTranslation } from "../../helpers/translations";
import { ALLOWED_CHAIN } from "../../wagmiConfig";
import { AppNotification } from "../Notifications";

export function NetworkGuard() {
    const { t } = useProjectTranslation();
    // useAccount().chainId is the actual chain reported by the wallet,
    // whereas useChainId() is clamped to wagmi's configured chains and
    // would mask wrong-network when CHAINS only contains ALLOWED_CHAIN.
    const { isConnected, chainId } = useAccount();
    const { switchChain, isPending, error } = useSwitchChain();

    const isWrongNetwork = isConnected && chainId !== undefined && chainId !== ALLOWED_CHAIN.id;

    if (!isWrongNetwork) return null;

    // Surfaced when the wallet rejects the switch, or when the target network
    // was never added and the wallet_addEthereumChain fallback also fails —
    // otherwise the button just stops spinning with no feedback.
    const switchError = error
        ? ((error as { shortMessage?: string }).shortMessage ?? error.message)
        : null;

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
                    {switchError && <span>{switchError}</span>}
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
