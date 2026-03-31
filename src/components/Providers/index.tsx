import "./Styles.scss";

import { notification } from "antd";
import React from "react";
import type { Connector } from "wagmi";
import { useConnect } from "wagmi";

import { useProjectTranslation } from "../../helpers/translations";

interface ProvidersProps {
    onCloseModal: () => void;
}

export default function WalletProviders({ onCloseModal }: ProvidersProps) {
    const { t } = useProjectTranslation();
    const { connectors, connectAsync } = useConnect();
    const [loadingId, setLoadingId] = React.useState<string | null>(null);

    // Detect mobile UA (phones/tablets without an in-app wallet browser)
    const isMobileUA = React.useMemo(
        () =>
            typeof navigator !== "undefined" &&
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(
                navigator.userAgent
            ),
        []
    );

    // Detect an in-app wallet browser (MetaMask mobile, Rainbow, Trust, etc.)
    // These inject window.ethereum and we can connect directly via injected.
    const isInAppWallet = React.useMemo(
        () =>
            typeof window !== "undefined" &&
            !!(window as Window & { ethereum?: unknown }).ethereum,
        []
    );

    // ─── EIP-6963 deduplication logic ────────────────────────────────────────
    //
    // With multiInjectedProviderDiscovery:true, wagmi auto-discovers every wallet
    // that announces itself via EIP-6963 (window.addEventListener("eip6963:announceProvider")).
    // Those connectors have type === "injected" and an RDNS-based id (e.g. "io.metamask").
    //
    // The manually-registered injected() connector (id === "injected") serves as a
    // fallback for wallets that only set window.ethereum without announcing via EIP-6963.
    //
    // Rule: if any EIP-6963 wallet is discovered, the generic "injected" fallback is
    // redundant (every real wallet is already listed individually) and should be hidden.
    // ─────────────────────────────────────────────────────────────────────────

    // Wallets discovered via EIP-6963 (specific ids like "io.metamask", "io.rabby", …)
    const eip6963Connectors = React.useMemo(
        () =>
            connectors.filter(
                (c) => c.type === "injected" && c.id !== "injected"
            ),
        [connectors]
    );

    // Generic injected fallback — only shown when zero EIP-6963 wallets exist
    const genericInjected = React.useMemo(
        () =>
            eip6963Connectors.length === 0
                ? connectors.find((c) => c.id === "injected")
                : undefined,
        [connectors, eip6963Connectors]
    );

    const wcConnector = React.useMemo(
        () => connectors.find((c) => c.id === "walletConnect"),
        [connectors]
    );

    const cbConnector = React.useMemo(
        () => connectors.find((c) => c.id === "coinbaseWallet"),
        [connectors]
    );

    const safeConnector = React.useMemo(
        () => connectors.find((c) => c.id === "safe"),
        [connectors]
    );

    // ─── Build the visible list ───────────────────────────────────────────────
    //
    // Desktop / in-app mobile:
    //   injected wallets (EIP-6963 or generic fallback) + WalletConnect + Coinbase
    // Mobile normal browser (no in-app wallet):
    //   WalletConnect only — there is no injected wallet to connect to
    // ─────────────────────────────────────────────────────────────────────────

    const injectedToShow = React.useMemo<Connector[]>(() => {
        if (isMobileUA && !isInAppWallet) return []; // mobile browser → no injected
        if (eip6963Connectors.length > 0) return eip6963Connectors;
        return genericInjected ? [genericInjected] : [];
    }, [isMobileUA, isInAppWallet, eip6963Connectors, genericInjected]);

    const othersToShow = React.useMemo<Connector[]>(() => {
        const list: Connector[] = [];
        if (safeConnector) list.push(safeConnector);
        if (cbConnector && !isMobileUA) list.push(cbConnector); // Coinbase: desktop only
        if (wcConnector) list.push(wcConnector);
        return list;
    }, [safeConnector, cbConnector, wcConnector, isMobileUA]);

    const noBrowserWallet =
        injectedToShow.length === 0 && !isMobileUA && !isInAppWallet;

    // ─────────────────────────────────────────────────────────────────────────

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
                {noBrowserWallet && (
                    <p className="providers__no-wallet">
                        {t("walletProviders.noBrowserWallets")}
                    </p>
                )}

                <div className="providers__connectors">
                    {/* EIP-6963 wallets / generic injected fallback */}
                    {injectedToShow.map((c) => (
                        <WalletButton
                            key={c.uid}
                            connector={c}
                            onClick={() => void handleConnect(c)}
                            loading={loadingId === c.uid}
                            isInAppWallet={isInAppWallet}
                            t={t}
                        />
                    ))}

                    {/* WalletConnect, Coinbase, Safe */}
                    {othersToShow.map((c) => (
                        <WalletButton
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

// ─── WalletButton ─────────────────────────────────────────────────────────────

function WalletButton({
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
    // WalletConnect is always "ready"; in-app injected may report not-ready but works.
    const ready =
        connector.id === "walletConnect"
            ? true
            : isInAppWallet && connector.type === "injected"
              ? true
              : (connector.ready ?? true);

    return (
        <button onClick={onClick} disabled={!ready || loading}>
            <span
                data-testid={`wallet-button-${connector.id.replace(/\./g, "-")}`}
            >
                {labelFor(connector, t)}
            </span>
            <WalletIcon connector={connector} />
            {!ready && (
                <span className="providers__not-available">
                    (not available)
                </span>
            )}
        </button>
    );
}

// ─── WalletIcon ───────────────────────────────────────────────────────────────
// EIP-6963 connectors provide connector.icon (base64 data URI from the wallet itself).
// For known connectors without an EIP-6963 icon, fall back to CSS background-image.

function WalletIcon({ connector }: { connector: Connector }) {
    const icon = connector.icon; // set by EIP-6963 discovery, undefined otherwise

    if (icon) {
        return (
            <img
                src={icon}
                alt={connector.name}
                width={32}
                height={32}
                className="walletIcon walletIcon--eip6963"
            />
        );
    }

    // CSS fallback — classes defined in Styles.scss
    return (
        <div
            className={`walletIcon walletIcon-${connector.name}`}
            aria-hidden="true"
        />
    );
}

// ─── labelFor ─────────────────────────────────────────────────────────────────

function labelFor(
    c: Connector,
    t: ReturnType<typeof useProjectTranslation>["t"]
): string {
    if (c.id === "walletConnect")
        return t("walletProviders.providers.walletconnect");
    if (c.id === "safe") return t("walletProviders.providers.multisig");
    if (c.id === "coinbaseWallet") return "Coinbase Wallet";
    // EIP-6963 and generic injected: use the name the wallet reports (e.g. "MetaMask", "Rabby")
    // For the generic injected fallback, c.name is "Injected" — translate it.
    if (c.id === "injected") return t("walletProviders.providers.injected");
    return c.name;
}
