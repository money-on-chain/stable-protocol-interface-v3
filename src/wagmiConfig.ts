// wagmiConfig.ts
import { createConfig, http } from 'wagmi'
import { rootstock, rootstockTestnet } from 'wagmi/chains'
import { injected, walletConnect, metaMask, coinbaseWallet } from 'wagmi/connectors'
import settings from "./settings/settings.json";

// Safe env getter (Vite/CRA/Node)
const env = (k: string) =>
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.[k]) ||
  (typeof process !== 'undefined' && (process as any).env?.[k])

// Chain selection
const ENV_CHAIN_ID = Number(
  env('REACT_APP_ENVIRONMENT_CHAIN_ID') ?? env('VITE_ENVIRONMENT_CHAIN_ID') ?? 31
)

export const CHAINS = [rootstock, rootstockTestnet] as const
export const ALLOWED_CHAIN =
  ENV_CHAIN_ID === rootstock.id ? rootstock
  : ENV_CHAIN_ID === rootstockTestnet.id ? rootstockTestnet
  : rootstockTestnet

// Runtime URL for connector metadata (must match the page origin)
const APP_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (env('REACT_APP_PUBLIC_URL') || '')

const WC_PROJECT_ID =
  env('REACT_APP_WALLET_CONNECT_PROJECT_ID') || env('VITE_WALLET_CONNECT_PROJECT_ID')!

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
      url: APP_URL,                        // must equal window.location.origin at runtime
      icons: [`${APP_URL}/icon-512.png`],
    },
  }),
] as const

export const config = createConfig({
  chains: CHAINS,
  connectors, // <-- no dynamic filtering here
  transports: {
    [rootstock.id]: http(env('REACT_APP_RSK_MAINNET_RPC') || env('VITE_RSK_MAINNET_RPC')),
    [rootstockTestnet.id]: http(env('REACT_APP_RSK_TESTNET_RPC') || env('VITE_RSK_TESTNET_RPC')),
  },
  ssr: false,
})
