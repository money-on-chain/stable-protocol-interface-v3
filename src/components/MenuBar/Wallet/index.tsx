import "./Styles.scss";

import type { Connector } from "wagmi";
import { useAccount } from "wagmi";

import safeIcon from "../../../assets/icons/graphicWalletOutline.svg";
import coinbaseIcon from "../../../assets/icons/walletIcon_cbw.svg";
import injectedIcon from "../../../assets/icons/walletIcon_MetaMask_Fox.svg";
import walletConnectIcon from "../../../assets/icons/walletIcon_WalletConnect.svg";
import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";

const truncateAddress = (address: string): string => `${address.slice(0, 6)}...${address.slice(-4)}`;

const connectorFallbackIcons: Record<string, string> = {
    coinbaseWallet: coinbaseIcon,
    injected: injectedIcon,
    safe: safeIcon,
    walletConnect: walletConnectIcon,
};

function WalletConnectorIcon({ connector }: { connector: Connector }): JSX.Element {
    const icon = connector.icon ?? connectorFallbackIcons[connector.id] ?? injectedIcon;

    return <img aria-hidden="true" className="menu-bar-wallet__icon" src={icon} alt="" />;
}

export default function Wallet(): JSX.Element {
    const { t } = useProjectTranslation();
    const { connector } = useAccount();
    const { address, isConnected, onShowModalAccount, onShowModalProviders } = useWalletContext();

    const connectWalletLabel = t("walletProviders.connectWalletButton");
    const connectedAddress = address ? truncateAddress(address) : "";

    return (
        <button
            aria-label={isConnected ? connectedAddress : connectWalletLabel}
            className={`menu-bar-wallet ${isConnected ? "menu-bar-wallet--connected" : "menu-bar-wallet--disconnected"}`}
            onClick={isConnected ? onShowModalAccount : onShowModalProviders}
            title={isConnected ? address : connectWalletLabel}
            type="button"
        >
            {isConnected && connector && <WalletConnectorIcon connector={connector} />}
            {isConnected ? connectedAddress : connectWalletLabel}
        </button>
    );
}
