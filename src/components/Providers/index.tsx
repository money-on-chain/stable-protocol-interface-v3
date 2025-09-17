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
  
    // Detect mobile UA
    const isMobileUA = React.useMemo(
      () =>
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(
          navigator.userAgent
        ),
      []
    );
  
    // Detect in-app wallet browser (MetaMask/Rainbow/Trust/Coinbase)
    const isInAppWallet = React.useMemo(
      () => typeof window !== 'undefined' && !!(window as any).ethereum,
      []
    );
  
    const isInjected = (c: Connector) => c.id === 'injected' || c.type === 'injected';
    const isMetaMask = (c: Connector) => c.id === 'metaMask' || c.name.toLowerCase().includes('metamask');
    const isWalletConnect = (c: Connector) => c.id === 'walletConnect';
    const isCoinbase = (c: Connector) => c.id === 'coinbaseWallet' || c.name.toLowerCase().includes('coinbase');
    const isSafe = (c: Connector) => c.id === 'safe';
  
    // Filtered visible (if not filtered in wagmiConfig)
    const visibleConnectors = React.useMemo(() => {
      // Mobile normal → only WC
      if (isMobileUA && !isInAppWallet) return connectors.filter((c) => c.id === 'walletConnect');
      // In-app wallet → injected + metamask (+ WC optional as fallback)
      if (isMobileUA && isInAppWallet)
        return connectors.filter((c) => c.id === 'injected' || c.id === 'metaMask' || c.id === 'walletConnect');
      // Desktop → all
      return connectors;
    }, [connectors, isMobileUA, isInAppWallet]);
  
    const hasInjectedMetaMask = visibleConnectors.some((c) => isInjected(c) && isMetaMask(c));
    const filtered = visibleConnectors.filter(
      (c) => !(isMetaMask(c) && !isInjected(c) && hasInjectedMetaMask)
    );
  
    const installed = filtered.filter((c) => isInjected(c)); // inyectados van arriba
    const others = filtered.filter((c) => !installed.includes(c));
  
    // If only WC, hide the "no browser wallet" message
    const wcOnly = filtered.length > 0 && filtered.every((c) => c.id === 'walletConnect');
  
    const sortByOrder = (a: Connector, b: Connector) => {
      const idx = (c: Connector) =>
        ORDER.indexOf(
          isInjected(c)
            ? 'injected'
            : isMetaMask(c)
            ? 'metaMask'
            : isCoinbase(c)
            ? 'coinbaseWallet'
            : isWalletConnect(c)
            ? 'walletConnect'
            : isSafe(c)
            ? 'safe'
            : 'walletConnect'
        );
      return idx(a) - idx(b);
    };
    const othersOrdered = [...others].sort(sortByOrder);
      
    const handleConnect = async (connector: Connector) => {
      try {
        setLoadingId(connector.uid);
        const isWC = connector.id === 'walletConnect';
        /*if (isWC) {
          onCloseModal();
          await new Promise((r) => setTimeout(r, 50));
        }*/
        await connectAsync({ connector });
        if (!isWC) onCloseModal();
        localStorage.setItem('last-connector', connector.id);
      } catch (e: any) {
        notification.error({
          message: 'Failed to connect',
          description: e?.shortMessage || e?.message || 'Check your wallet and try again.',
        });
      } finally {
        setLoadingId(null);
      }
    };
  
    return (
      <div className="providers__settings">
        <header>
          <h1>{t('walletProviders.connectYourWallet')}</h1>
        </header>
        <section>
          {installed.length === 0 && !wcOnly && (
            <Text type="secondary">{t('walletProviders.noBrowserWallets')}</Text>
          )}
  
          <div className="providers__connectors">
            {installed.map((c) => (
              <WalletOption
                key={c.uid}
                connector={c}
                onClick={() => handleConnect(c)}
                loading={loadingId === c.uid}
                tooltip={getTooltip(c, isInjected, isMetaMask, isWalletConnect)}
                isInAppWallet={isInAppWallet}
                t={t}
              />
            ))}
  
            {othersOrdered.map((c) => (
              <WalletOption
                key={c.uid}
                connector={c}
                onClick={() => handleConnect(c)}
                loading={loadingId === c.uid}
                tooltip={getTooltip(c, isInjected, isMetaMask, isWalletConnect)}
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
  tooltip,
  isInAppWallet,
  t,
}: {
  connector: Connector;
  onClick: () => void;
  loading?: boolean;
  tooltip?: string;
  isInAppWallet?: boolean;
  t: ReturnType<typeof useProjectTranslation>['t'];
}) {
  const ready =
    connector.id === 'walletConnect'
      ? true
      : isInAppWallet && (connector.id === 'injected' || connector.id === 'metaMask')
      ? true
      : connector.ready ?? true;

  const button = (
    <button onClick={onClick} disabled={!ready || loading}>
      <div>{labelFor(connector, t)}</div>
      <div className={`walletIcon walletIcon-${connector?.name ?? ''}`}></div>
      {!ready && <span>(not available)</span>}
    </button>
  );

  return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
}
  

function labelFor(c: Connector, t: ReturnType<typeof useProjectTranslation>['t']) {
  const n = c.name.toLowerCase()
  if (n.includes('metamask')) return t('walletProviders.providers.metamask')
  if (n.includes('coinbase')) return t('walletProviders.providers.coinbase')
  if (c.id === 'walletConnect') return t('walletProviders.providers.walletconnect')
  if (c.id === 'safe') return t('walletProviders.providers.multisig')
  if (c.id === 'injected') return t('walletProviders.providers.injected')
  return c.name
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
