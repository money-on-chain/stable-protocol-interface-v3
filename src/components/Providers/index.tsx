import "./Styles.scss";

import { notification, Typography } from "antd";
import React from "react";
import type { Connector } from "wagmi";
import { useAccount, useConnect } from "wagmi";

import { useProjectTranslation } from "../../helpers/translations";

interface ProvidersProps {
    onCloseModal: () => void;
}

const ORDER = ["injected", "walletConnect", "safe"] as const;

const { Title, Text } = Typography;

export default function WalletProviders({ onCloseModal }: ProvidersProps) {
    const { t } = useProjectTranslation();
    const { connectors, connectAsync } = useConnect();
    const { isConnected } = useAccount();
    const [loadingId, setLoadingId] = React.useState<string | null>(null);

    // Detect mobile UA
    const isMobileUA = React.useMemo(
        () =>
            typeof navigator !== "undefined" &&
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(
                navigator.userAgent
            ),
        []
    );

    // Detect in-app wallet browser (MetaMask/Rainbow/Trust)
    const isInAppWallet = React.useMemo(
        () =>
            typeof window !== "undefined" &&
            !!(window as Window & { ethereum?: unknown }).ethereum,
        []
    );

    // Helpers
    const isInjected = (c: Connector) =>
        c.id === "injected" || c.type === "injected";
    const isWalletConnect = (c: Connector) => c.id === "walletConnect";
    const isSafe = (c: Connector) => c.id === "safe";

    // 1) Base: quedarnos SOLO con injected + walletConnect (+ safe si existe)
    const baseAllowed = React.useMemo(
        () =>
            connectors.filter(
                (c) => isInjected(c) || isWalletConnect(c) || isSafe(c)
            ),
        [connectors]
    );

    // 2) Visibilidad por contexto:
    // - Mobile normal → solo WalletConnect
    // - Mobile in-app → injected + WalletConnect
    // - Desktop → injected + WalletConnect
    const visibleConnectors = React.useMemo(() => {
        if (isMobileUA && !isInAppWallet)
            return baseAllowed.filter(isWalletConnect);
        return baseAllowed;
    }, [baseAllowed, isMobileUA, isInAppWallet]);

    // Agrupación simple: inyectados arriba
    const installed = visibleConnectors.filter(isInjected);
    const others = visibleConnectors.filter((c) => !installed.includes(c));

    // Si solo hay WC, escondemos el aviso “no browser wallet”
    const wcOnly =
        visibleConnectors.length > 0 &&
        visibleConnectors.every((c) => c.id === "walletConnect");

    const sortByOrder = (a: Connector, b: Connector) => {
        const key = (c: Connector) =>
            isInjected(c)
                ? "injected"
                : isWalletConnect(c)
                  ? "walletConnect"
                  : isSafe(c)
                    ? "safe"
                    : "walletConnect";
        return ORDER.indexOf(key(a)) - ORDER.indexOf(key(b));
    };
    const othersOrdered = [...others].sort(sortByOrder);

    const handleConnect = async (connector: Connector) => {
        try {
            setLoadingId(connector.uid);
            const isWC = connector.id === "walletConnect";
            await connectAsync({ connector });
            if (!isWC) onCloseModal();
            localStorage.setItem("last-connector", connector.id);
        } catch (e: unknown) {
            const error = e as Error & { shortMessage?: string };
            notification.error({
                message: "Failed to connect",
                description:
                    error?.shortMessage ||
                    error?.message ||
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
                {installed.length === 0 && !wcOnly && (
                    <Text type="secondary">
                        {t("walletProviders.noBrowserWallets")}
                    </Text>
                )}

                <div className="providers__connectors">
                    {installed.map((c) => (
                        <WalletOption
                            key={c.uid}
                            connector={c}
                            onClick={() => void handleConnect(c)}
                            loading={loadingId === c.uid}
                            isInAppWallet={isInAppWallet}
                            t={t}
                        />
                    ))}

                    {othersOrdered.map((c) => (
                        <WalletOption
                            key={c.uid}
                            connector={c}
                            onClick={() => void handleConnect(c)}
                            loading={loadingId === c.uid}
                            isInAppWallet={isInAppWallet}
                            t={t}
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
    isInAppWallet,
    t,
}: {
    connector: Connector;
    onClick: () => void;
    loading?: boolean;
    isInAppWallet?: boolean;
    t: ReturnType<typeof useProjectTranslation>["t"];
}) {
    // WC siempre habilitado; injected habilitado en in-app aunque .ready diga lo contrario
    const ready =
        connector.id === "walletConnect"
            ? true
            : isInAppWallet && connector.id === "injected"
              ? true
              : (connector.ready ?? true);

    return (
        <button onClick={onClick} disabled={!ready || loading}>
            <div>{labelFor(connector, t)}</div>
            <div
                className={`walletIcon walletIcon-${connector?.name ?? ""}`}
            ></div>
            {!ready && <span>(not available)</span>}
        </button>
    );
}

function labelFor(
    c: Connector,
    t: ReturnType<typeof useProjectTranslation>["t"]
) {
    const n = c.name.toLowerCase();
    if (c.id === "walletConnect")
        return t("walletProviders.providers.walletconnect");
    if (c.id === "safe") return t("walletProviders.providers.multisig");
    if (c.id === "injected") {
        // Si querés renombrar a “MetaMask” cuando el in-app es MetaMask, podés detectar window.ethereum.isMetaMask aquí.
        return t("walletProviders.providers.injected");
    }
    return c.name;
}
