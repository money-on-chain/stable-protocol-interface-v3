// wagmiConfig.ts
import { custom } from "viem";
import { createConfig, fallback, http } from "wagmi";
import { localhost, rootstock, rootstockTestnet } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

import { ALLOWED_CHAIN, CHAINS } from "./constants/chain";
import settings from "./settings";

// Re-export so existing consumers of wagmiConfig still work
export { ALLOWED_CHAIN, CHAINS };

// Safe env getter (Vite/CRA/Node)
const env = (k: string): string | undefined => {
    const importMetaEnv =
        typeof import.meta !== "undefined" ? (import.meta as { env?: Record<string, string> }).env?.[k] : undefined;
    const processEnv =
        typeof process !== "undefined" ? (process as { env?: Record<string, string> }).env?.[k] : undefined;
    return importMetaEnv || processEnv;
};

// Runtime URL for connector metadata (must match the page origin)
const APP_URL = typeof window !== "undefined" ? window.location.origin : env("REACT_APP_PUBLIC_URL") || "";

const WC_PROJECT_ID = env("REACT_APP_WALLET_CONNECT_PROJECT_ID") || env("VITE_WALLET_CONNECT_PROJECT_ID") || "";

if (!WC_PROJECT_ID) {
    console.error(
        "[wagmiConfig] REACT_APP_WALLET_CONNECT_PROJECT_ID / VITE_WALLET_CONNECT_PROJECT_ID is not set — WalletConnect will not work"
    );
}

// IMPORTANT: do NOT add metaMask() here — with multiInjectedProviderDiscovery:true,
// MetaMask is auto-discovered via EIP-6963. Adding metaMask() creates a duplicate.
// injected() is kept as a fallback for wallets that set window.ethereum but do NOT
// announce themselves via EIP-6963 (older extensions).
const connectors = [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
        appName: settings.dapp.name,
        // Disable Coinbase's inline telemetry script, which would violate
        // CSP script-src 'self' by injecting script.textContent at runtime.
        preference: { options: "all", telemetry: false },
    }),
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
            return [env("REACT_APP_RSK_MAINNET_RPC") || env("VITE_RSK_MAINNET_RPC")].filter(Boolean);
        case rootstockTestnet.id:
            return [env("REACT_APP_RSK_TESTNET_RPC") || env("VITE_RSK_TESTNET_RPC")].filter(Boolean);
        case localhost.id:
            return [
                env("REACT_APP_RSK_LOCALHOST_RPC") || env("VITE_RSK_LOCALHOST_RPC"),
                "http://localhost:8545", // Default localhost for development
            ].filter(Boolean);
        default:
            return [];
    }
};

const configuredChainIds = env("HTTPS_REQUIRED_CHAIN_IDS")
    ?.split(",")
    .map((chainId) => chainId.trim())
    .map(Number);

const HTTPS_REQUIRED_CHAIN_IDS = new Set<number>(
    configuredChainIds?.length ? configuredChainIds : [rootstock.id, rootstockTestnet.id]
);

const validateRpcUrl = (url: string, chainId: number): boolean => {
    try {
        const { protocol } = new URL(url);
        if (HTTPS_REQUIRED_CHAIN_IDS.has(chainId) && protocol !== "https:") {
            console.error(`[wagmiConfig] RPC URL "${url}" must use HTTPS for chain ${chainId}`);
            return false;
        }
        return true;
    } catch (_e: unknown) {
        console.error(`[wagmiConfig] Invalid RPC URL: "${url}"`);
        return false;
    }
};

// ─── Active-connector transport ───────────────────────────────────────────────
//
// Why not unstable_connector(injected)?
// unstable_connector resolves its connector via  connectors.find(c => c.type === type).
// With multiInjectedProviderDiscovery:true, both MetaMask AND Rabby (and any other
// EIP-6963 wallet) share type:"injected". .find() returns whichever is first in the
// store — which may be the wallet on the wrong chain — causing ChainDisconnectedError
// and falling through to HTTP even when MetaMask is connected to the correct chain.
//
// This transport reads config.state.current / .connections instead to get the wallet
// the user actually authenticated with, regardless of type or discovery order.
//
// Behaviour:
//  - Wallet connected on correct chain → requests go through that wallet's RPC.
//  - Not connected / wrong chain / any error → throws plain Error → viem's fallback()
//    retries the next transport (the configured env-var HTTP endpoints).
//
// Circular-dep note: config is defined after this transport; we store the reference
// in _wagmiConfig immediately after createConfig() and read it lazily at request time.
// eslint-disable-next-line prefer-const
let _wagmiConfig: ReturnType<typeof createConfig> | undefined;

type EIP1193Provider = {
    request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

type WagmiConnection = {
    connector: {
        getProvider: (opts?: { chainId?: number }) => Promise<EIP1193Provider | undefined>;
    };
};

const activeConnectorTransport = (params: Parameters<ReturnType<typeof http>>[0]) => {
    const { chain } = params ?? {};
    return custom({
        request: async ({ method, params: rpcParams }: { method: string; params?: unknown }) => {
            const cfg = _wagmiConfig;
            if (!cfg) throw new Error("transport: wagmi config not ready");

            const { current, connections } = cfg.state as {
                current: string | null;
                connections: Map<string, WagmiConnection>;
            };

            if (!current) throw new Error("transport: no active connection");
            const connection = connections.get(current);
            if (!connection) throw new Error("transport: active connection not found");

            const provider = await connection.connector.getProvider({
                chainId: chain?.id,
            });
            if (!provider) throw new Error("transport: provider unavailable");

            return provider.request({
                method,
                params: rpcParams,
            }) as unknown;
        },
    })(params);
};

// Build an ordered list of transports for a given chain:
//   1. activeConnectorTransport — the wallet the user connected with
//   2. env-var HTTP endpoints — explicitly configured RPCs
//   3. http() with no URL — chain-default RPC, only for testnet/localhost;
//      mainnet requires an explicit endpoint via REACT_APP_RSK_MAINNET_RPC
const chainTransports = (chainId: number) => {
    const validatedEndpoints = getRpcEndpoints(chainId).filter((url) => validateRpcUrl(url as string, chainId));
    const envTransports = validatedEndpoints.map((url) => http(url as string, { retryCount: 3, retryDelay: 1000 }));

    const isMainnet = chainId === rootstock.id;

    if (isMainnet && validatedEndpoints.length === 0 && ALLOWED_CHAIN.id === rootstock.id) {
        console.error(
            "[wagmiConfig] REACT_APP_RSK_MAINNET_RPC is not set. " +
                "Unauthenticated reads will fall back to the chain-default RPC " +
                "(https://public-node.rsk.co). Set an explicit endpoint for production."
        );
    }

    return [
        activeConnectorTransport,
        ...envTransports,
        // Omit the generic fallback on mainnet when an explicit RPC is configured —
        // a misconfigured or unavailable env RPC should surface as an error, not
        // silently route to an unapproved public node.
        ...(isMainnet && validatedEndpoints.length > 0 ? [] : [http(undefined, { retryCount: 1, retryDelay: 500 })]),
    ] as Parameters<typeof fallback>[0];
};

export const config = createConfig({
    chains: CHAINS,
    multiInjectedProviderDiscovery: true,
    connectors,
    transports: Object.fromEntries(CHAINS.map((chain) => [chain.id, fallback(chainTransports(chain.id))])) as Record<
        (typeof CHAINS)[number]["id"],
        ReturnType<typeof fallback>
    >,
    ssr: false,
});

// Wire up the lazy reference so activeConnectorTransport can read config.state
_wagmiConfig = config;
