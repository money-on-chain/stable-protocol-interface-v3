import React from "react";
import { Button, Divider, Typography, notification, Tooltip } from "antd";
import { Connector, useConnect, useAccount } from "wagmi";

interface ProvidersProps {
  onCloseModal: () => void;
}

const ORDER = ["injected", "metaMask", "coinbaseWallet", "walletConnect", "safe"] as const;
const { Title, Text } = Typography;

export default function WalletProviders({ onCloseModal }: ProvidersProps) {
  const { connectors, connectAsync } = useConnect();
  const { isConnected } = useAccount();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const isInjected = (c: Connector) => c.id === "injected" || c.type === "injected";
  const isMetaMask = (c: Connector) => c.id === "metaMask" || c.name.toLowerCase().includes("metamask");
  const isWalletConnect = (c: Connector) => c.id === "walletConnect";
  const isCoinbase = (c: Connector) => c.id === "coinbaseWallet" || c.name.toLowerCase().includes("coinbase");
  const isSafe = (c: Connector) => c.id === "safe";

  const hasInjectedMetaMask = connectors.some((c) => isInjected(c) && isMetaMask(c));
  const filtered = connectors.filter(
    (c) => !(isMetaMask(c) && !isInjected(c) && hasInjectedMetaMask)
  );

  const installed = filtered.filter((c) => isInjected(c) && (c.ready ?? true));
  const others = filtered.filter((c) => !installed.includes(c));

  const sortByOrder = (a: Connector, b: Connector) => {
    const idx = (c: Connector) =>
      ORDER.indexOf(
        isInjected(c) ? "injected" :
        isMetaMask(c) ? "metaMask" :
        isCoinbase(c) ? "coinbaseWallet" :
        isWalletConnect(c) ? "walletConnect" :
        isSafe(c) ? "safe" : "walletConnect"
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
        description: e?.shortMessage || e?.message || "Check your wallet and try again.",
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="providers__settings">
      <section>
        <Title level={5}>Installed</Title>
        {installed.length === 0 && <Text type="secondary">No browser wallets detected.</Text>}
        <div className="providers__connectors">
          {installed.map((c) => (
            <WalletOption
              key={c.uid}
              connector={c}
              onClick={() => handleConnect(c)}
              loading={loadingId === c.uid}
              tooltip={getTooltip(c, isInjected, isMetaMask, isWalletConnect)}
            />
          ))}
        </div>
      </section>

      <Divider />

      <section>
        <Title level={5}>Other options</Title>
        <div className="providers__connectors">
          {othersOrdered.map((c) => (
            <WalletOption
              key={c.uid}
              connector={c}
              onClick={() => handleConnect(c)}
              loading={loadingId === c.uid}
              tooltip={getTooltip(c, isInjected, isMetaMask, isWalletConnect)}
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

  // Wrap in Tooltip only if text provided
  return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
}

function labelFor(c: Connector) {
  const n = c.name.toLowerCase();
  if (n.includes("metamask")) return "MetaMask";
  if (n.includes("coinbase")) return "Coinbase Wallet";
  if (c.id === "walletConnect") return "WalletConnect (QR / mobile)";
  if (c.id === "safe") return "Safe (multi-sig)";
  if (c.id === "injected") return "Browser Wallet";
  return c.name;
}

function WalletIcon({ name }: { name: string }) {
  const short =
    name.toLowerCase().includes("metamask") ? "🦊" :
    name.toLowerCase().includes("coinbase") ? "🟦" :
    name.toLowerCase().includes("walletconnect") ? "🔗" :
    name.toLowerCase().includes("safe") ? "🛡️" :
    "💼";
  return <span style={{ fontSize: 18 }}>{short}</span>;
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
  if (isWalletConnect(c)) {
    return `For hardware wallets like Ledger Live, Keystone, GridPlus:
1) Open your wallet app
2) Select "Connect with WalletConnect"
3) Scan the QR code shown here.`;
  }
  if (isInjected(c) || isMetaMask(c)) {
    return `To use Ledger or Trezor:
1) Open MetaMask or Rabby
2) Connect your hardware wallet in settings
3) Select the account here.`;
  }
  return undefined;
}
