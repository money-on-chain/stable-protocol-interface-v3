import React from "react";
import { Typography, notification, Tooltip } from "antd";
import { Connector, useConnect, useAccount } from "wagmi";
import { useProjectTranslation } from "../../helpers/translations";
import "./Styles.scss";

interface ProvidersProps {
    onCloseModal: () => void;
}

const ORDER = [
    "injected",
    "metaMask",
    "coinbaseWallet",
    "walletConnect",
    "safe",
] as const;
const { Title, Text } = Typography;

export default function WalletProviders({ onCloseModal }: ProvidersProps) {
    const { t } = useProjectTranslation();

    const { connectors, connectAsync } = useConnect();
    const { isConnected } = useAccount();
    const [loadingId, setLoadingId] = React.useState<string | null>(null);

    const isInjected = (c: Connector) =>
        c.id === "injected" || c.type === "injected";
    const isMetaMask = (c: Connector) =>
        c.id === "metaMask" || c.name.toLowerCase().includes("metamask");
    const isWalletConnect = (c: Connector) => c.id === "walletConnect";
    const isCoinbase = (c: Connector) =>
        c.id === "coinbaseWallet" || c.name.toLowerCase().includes("coinbase");
    const isSafe = (c: Connector) => c.id === "safe";

    const hasInjectedMetaMask = connectors.some(
        (c) => isInjected(c) && isMetaMask(c)
    );
    const filtered = connectors.filter(
        (c) => !(isMetaMask(c) && !isInjected(c) && hasInjectedMetaMask)
    );

    const installed = filtered.filter(
        (c) => isInjected(c) && (c.ready ?? true)
    );
    const others = filtered.filter((c) => !installed.includes(c));

    const sortByOrder = (a: Connector, b: Connector) => {
        const idx = (c: Connector) =>
            ORDER.indexOf(
                isInjected(c)
                    ? "injected"
                    : isMetaMask(c)
                      ? "metaMask"
                      : isCoinbase(c)
                        ? "coinbaseWallet"
                        : isWalletConnect(c)
                          ? "walletConnect"
                          : isSafe(c)
                            ? "safe"
                            : "walletConnect"
            );
        return idx(a) - idx(b);
    };
    const othersOrdered = [...others].sort(sortByOrder);

    const handleConnect = async (connector: Connector) => {
        try {
            setLoadingId(connector.uid);
            await connectAsync({ connector });
            localStorage.setItem("last-connector", connector.id);
            onCloseModal();
        } catch (e: any) {
            notification.error({
                message: "Failed to connect",
                description:
                    e?.shortMessage ||
                    e?.message ||
                    "Check your wallet and try again.",
            });
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="providers__settings">
            <header>
                <h1>{t("walletProviders.connectYourWallet")}</h1>
            </header>
            <section>
                {installed.length === 0 && (
                    <Text type="secondary">
                        {t("walletProviders.noBrowserWallets")}
                    </Text>
                )}
                <div className="providers__connectors">
                    {installed.map((c) => (
                        <WalletOption
                            key={c.uid}
                            connector={c}
                            onClick={() => handleConnect(c)}
                            loading={loadingId === c.uid}
                            tooltip={getTooltip(
                                c,
                                isInjected,
                                isMetaMask,
                                isWalletConnect
                            )}
                        />
                    ))}{" "}
                    {othersOrdered.map((c) => (
                        <WalletOption
                            key={c.uid}
                            connector={c}
                            onClick={() => handleConnect(c)}
                            loading={loadingId === c.uid}
                            tooltip={getTooltip(
                                c,
                                isInjected,
                                isMetaMask,
                                isWalletConnect
                            )}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}

function WalletOption({
    connector,
    onClick,
    loading,
    tooltip,
}: {
    connector: Connector;
    onClick: () => void;
    loading?: boolean;
    tooltip?: string;
}) {
    const ready = connector.ready ?? true;
    const button = (
        <button onClick={onClick} disabled={!ready || loading}>
            <div>{labelFor(connector)}</div>
            <div
                className={`walletIcon walletIcon-${connector?.name ?? ""}`}
            ></div>
            {!ready && <span>(not available)</span>}
        </button>
    );

    // Wrap in Tooltip only if text provided
    return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
}

function labelFor(c: Connector) {
    const { t } = useProjectTranslation();
    const n = c.name.toLowerCase();
    if (n.includes("metamask")) return t("walletProviders.providers.metamask");
    if (n.includes("coinbase")) return t("walletProviders.providers.coinbase");
    if (c.id === "walletConnect")
        return t("walletProviders.providers.walletconnect");
    if (c.id === "safe") return t("walletProviders.providers.multisig");
    if (c.id === "injected") return t("walletProviders.providers.injected");
    return c.name;
}

/**
 * Returns tooltip text depending on connector type
 */
function getTooltip(
    c: Connector,
    isInjected: (c: Connector) => boolean,
    isMetaMask: (c: Connector) => boolean,
    isWalletConnect: (c: Connector) => boolean
): string | undefined {
    const { t } = useProjectTranslation();

    if (isWalletConnect(c)) {
        return t("walletProviders.toolTip.walletConnected");
    }
    if (isMetaMask(c)) {
        return t("walletProviders.toolTip.metamask");
    }
    if (isInjected(c)) {
        return t("walletProviders.toolTip.injected");
    }
    return undefined;
}
