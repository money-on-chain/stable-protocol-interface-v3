import React from "react";
import { Button, Divider, Typography, notification } from "antd";
import { Connector, useConnect, useAccount } from "wagmi";

interface ProvidersProps {
  onCloseModal: () => void;
}

// Display order for the "Other wallets" section
const ORDER = ["injected", "metaMask", "coinbaseWallet", "walletConnect", "safe"] as const;
const { Title, Text } = Typography;

export default function WalletProviders({ onCloseModal }: ProvidersProps): JSX.Element {
  const { connectors, connectAsync } = useConnect();
  const { isConnected } = useAccount();

  // Local state to track which connector is currently loading
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  /** ──────────────────────────────────────────────────────────────
   * Helper functions to identify connector types
   * Used for ordering, filtering, and avoiding duplicates
   * ────────────────────────────────────────────────────────────── */
  const isInjected = (c: Connector) => c.id === "injected" || c.type === "injected";
  const isMetaMask = (c: Connector) => c.id === "metaMask" || c.name.toLowerCase().includes("metamask");
  const isWalletConnect = (c: Connector) => c.id === "walletConnect";
  const isCoinbase = (c: Connector) => c.id === "coinbaseWallet" || c.name.toLowerCase().includes("coinbase");
  const isSafe = (c: Connector) => c.id === "safe";

  /** Remove duplicate MetaMask:
   * If MetaMask is already available as "injected",
   * hide the dedicated MetaMask connector.
   */
  const hasInjectedMetaMask = connectors.some((c) => isInjected(c) && isMetaMask(c));
  const filtered = connectors.filter(
    (c) => !(isMetaMask(c) && !isInjected(c) && hasInjectedMetaMask)
  );

  /** Separate connectors into:
   * - Installed: injected wallets detected in the browser
   * - Others: WalletConnect, Coinbase Wallet, etc.
   */
  const installed = filtered.filter((c) => isInjected(c) && (c.ready ?? true));
  const others = filtered.filter((c) => !installed.includes(c));

  /** Sort "Others" according to a preferred order for better UX */
  const sortByOrder = (a: Connector, b: Connector) => {
    const idx = (c: Connector) =>
      ORDER.indexOf(
        isInjected(c) ? "injected" :
        isMetaMask(c) ? "metaMask" :
        isCoinbase(c) ? "coinbaseWallet" :
        isWalletConnect(c) ? "walletConnect" :
        isSafe(c) ? "safe" : "walletConnect" // default fallback
      );
    return idx(a) - idx(b);
  };
  const othersOrdered = [...others].sort(sortByOrder);

  /** Handle wallet connection:
   *  - Show loading for the selected wallet only
   *  - Store last connector in localStorage (optional)
   *  - Show error notification if connection fails
   */
  const handleConnect = async (connector: Connector) => {
    try {
      setLoadingId(connector.uid);
      await connectAsync({ connector });
      localStorage.setItem("last-connector", connector.id); // optional auto-reconnect
      onCloseModal();
    } catch (e: any) {
      notification.error({
        message: "Failed to connect",
        description: e?.shortMessage || e?.message || "Check your wallet and try again.",
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="providers__settings">
      {/* Installed wallets section */}
      <section className="providers__section">
        <Title level={5} style={{ marginTop: 0 }}>Installed</Title>
        {installed.length === 0 && (
          <Text type="secondary">No browser wallets detected.</Text>
        )}
        <div className="providers__connectors">
          {installed.map((c) => (
            <WalletOption
              key={c.uid}
              connector={c}
              onClick={() => handleConnect(c)}
              loading={loadingId === c.uid}
            />
          ))}
        </div>
      </section>

      <Divider />

      {/* Other wallets section */}
      <section className="providers__section">
        <Title level={5}>Other options</Title>
        <div className="providers__connectors">
          {othersOrdered.map((c) => (
            <WalletOption
              key={c.uid}
              connector={c}
              onClick={() => handleConnect(c)}
              loading={loadingId === c.uid}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * WalletOption
 * Renders a single wallet button.
 * Shows wallet name, icon, and handles disabled/loading states.
 */
function WalletOption({
  connector,
  onClick,
  loading,
}: {
  connector: Connector;
  onClick: () => void;
  loading?: boolean;
}) {
  const ready = connector.ready ?? true;

  return (
    <Button
      block
      size="large"
      onClick={onClick}
      disabled={!ready || loading}
      loading={loading}
      style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}
    >
      <WalletIcon name={connector.name} />
      <span style={{ flex: 1, textAlign: "left" }}>{labelFor(connector)}</span>
      {!ready && <span>(not available)</span>}
    </Button>
  );
}

/**
 * labelFor()
 * Returns a user-friendly label for a given connector.
 */
function labelFor(c: Connector) {
  const n = c.name.toLowerCase();
  if (n.includes("metamask")) return "MetaMask";
  if (n.includes("coinbase")) return "Coinbase Wallet";
  if (c.id === "walletConnect") return "WalletConnect (QR / mobile)";
  if (c.id === "safe") return "Safe (multi-sig)";
  if (c.id === "injected") return "Browser Wallet";
  return c.name;
}

/**
 * WalletIcon()
 * Returns an emoji placeholder based on the wallet type.
 * Can be replaced with actual SVG logos in production.
 */
function WalletIcon({ name }: { name: string }) {
  const short =
    name.toLowerCase().includes("metamask") ? "🦊" :
    name.toLowerCase().includes("coinbase") ? "🟦" :
    name.toLowerCase().includes("walletconnect") ? "🔗" :
    name.toLowerCase().includes("safe") ? "🛡️" :
    "💼";
  return <span style={{ fontSize: 18 }}>{short}</span>;
}
