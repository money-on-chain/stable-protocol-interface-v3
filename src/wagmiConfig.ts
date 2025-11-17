// wagmiConfig.ts
import { createConfig, fallback, http } from "wagmi";
import { localhost, rootstock, rootstockTestnet } from "wagmi/chains";
import {
    coinbaseWallet,
    injected,
    metaMask,
    walletConnect,
} from "wagmi/connectors";

import settings from "./settings/settings.json";

// Override localhost with the correct contracts configuration
localhost.contracts = {
    multicall3: {
        address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
};

// Safe env getter (Vite/CRA/Node)
const env = (k: string): string | undefined => {
    const importMetaEnv =
        typeof import.meta !== "undefined"
            ? (import.meta as { env?: Record<string, string> }).env?.[k]
            : undefined;
    const processEnv =
        typeof process !== "undefined"
            ? (process as { env?: Record<string, string> }).env?.[k]
            : undefined;
    return importMetaEnv || processEnv;
};

// Chain selection
const ENV_CHAIN_ID = Number(
    env("REACT_APP_ENVIRONMENT_CHAIN_ID") ??
        env("VITE_ENVIRONMENT_CHAIN_ID") ??
        31
);

export const CHAINS = [rootstock, rootstockTestnet, localhost] as const;
export const ALLOWED_CHAIN =
    ENV_CHAIN_ID === rootstock.id
        ? rootstock
        : ENV_CHAIN_ID === rootstockTestnet.id
          ? rootstockTestnet
          : localhost; // fallback sensible

// Runtime URL for connector metadata (must match the page origin)
const APP_URL =
    typeof window !== "undefined"
        ? window.location.origin
        : env("REACT_APP_PUBLIC_URL") || "";

const WC_PROJECT_ID =
    env("REACT_APP_WALLET_CONNECT_PROJECT_ID") ||
    env("VITE_WALLET_CONNECT_PROJECT_ID")!;

// ⬇️ ⬇️ IMPORTANT: do NOT filter here. Keep all connectors.
// We will gate/limit them in the UI (providers.tsx) based on mobile/in-app conditions.
const connectors = [
    injected({ shimDisconnect: true }),
    metaMask({ dappMetadata: { name: settings.dapp.name, url: APP_URL } }),
    coinbaseWallet({ appName: settings.dapp.name }),
    walletConnect({
        projectId: WC_PROJECT_ID,
        showQrModal: true,
        metadata: {
            name: settings.dapp.name,
            description: settings.dapp.description,
            url: APP_URL, // must equal window.location.origin at runtime
            icons: [`${APP_URL}/icon-512.png`],
        },
    }),
] as const;

// RPC endpoints for dApp - only use environment variables
// Wallet connectors (MetaMask, WalletConnect, etc.) will provide their own RPC endpoints
const getRpcEndpoints = (chainId: number) => {
    switch (chainId) {
        case rootstock.id:
            return [
                env("REACT_APP_RSK_MAINNET_RPC") || env("VITE_RSK_MAINNET_RPC"),
            ].filter(Boolean);
        case rootstockTestnet.id:
            return [
                env("REACT_APP_RSK_TESTNET_RPC") || env("VITE_RSK_TESTNET_RPC"),
            ].filter(Boolean);
        case localhost.id:
            return [
                env("REACT_APP_RSK_LOCALHOST_RPC") ||
                    env("VITE_RSK_LOCALHOST_RPC"),
                "http://localhost:8545", // Default localhost for development
            ].filter(Boolean);
        default:
            return [];
    }
};

export const config = createConfig({
    chains: CHAINS,
    connectors, // <-- no dynamic filtering here
    transports: {
        [rootstock.id]:
            getRpcEndpoints(rootstock.id).length > 0
                ? fallback(
                      getRpcEndpoints(rootstock.id).map((url) =>
                          http(url, {
                              retryCount: 3,
                              retryDelay: 1000,
                          })
                      )
                  )
                : http(), // Let wallet connectors provide RPC
        [rootstockTestnet.id]:
            getRpcEndpoints(rootstockTestnet.id).length > 0
                ? fallback(
                      getRpcEndpoints(rootstockTestnet.id).map((url) =>
                          http(url, {
                              retryCount: 3,
                              retryDelay: 1000,
                          })
                      )
                  )
                : http(), // Let wallet connectors provide RPC
        [localhost.id]: fallback(
            getRpcEndpoints(localhost.id).map((url) =>
                http(url, {
                    retryCount: 3,
                    retryDelay: 1000,
                })
            )
        ),
    },
    ssr: false,
});
