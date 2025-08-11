// wagmiConfig.ts
import { createConfig, http } from 'wagmi'
import { rootstock, rootstockTestnet } from 'wagmi/chains'
import { injected, walletConnect, metaMask, coinbaseWallet } from 'wagmi/connectors'

// Read env in a browser-safe way (Vite/CRA)
const env = (k: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[k]) {
    return (import.meta as any).env[k]
  }
  if (typeof process !== 'undefined' && (process as any).env?.[k]) {
    return (process as any).env[k]
  }
  return undefined
}

// Map 30 → Rootstock (mainnet), 31 → Rootstock Testnet
const ENV_CHAIN_ID = Number(env('REACT_APP_ENVIRONMENT_CHAIN_ID') ?? env('VITE_ENVIRONMENT_CHAIN_ID') ?? 31)

export const CHAINS = [rootstock, rootstockTestnet] as const
export const ALLOWED_CHAIN =
  ENV_CHAIN_ID === rootstock.id ? rootstock :
  ENV_CHAIN_ID === rootstockTestnet.id ? rootstockTestnet :
  rootstockTestnet // fallback sensible

export const config = createConfig({
  chains: CHAINS,
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId: env('REACT_APP_WALLET_CONNECT_PROJECT_ID') || env('VITE_WALLET_CONNECT_PROJECT_ID')!,
      metadata: {
        name: 'My DApp',
        description: 'Rootstock DApp',
        url: 'https://mydapp.example',
        icons: ['https://mydapp.example/icon.png'],
      },
    }),
    coinbaseWallet({ appName: 'My DApp' }),
    metaMask({ dappMetadata: { name: 'My DApp' } }),
  ],
  transports: {
    [rootstock.id]: http(env('REACT_APP_RSK_MAINNET_RPC') || env('VITE_RSK_MAINNET_RPC')),
    [rootstockTestnet.id]: http(env('REACT_APP_RSK_TESTNET_RPC') || env('VITE_RSK_TESTNET_RPC')),
  },
  ssr: false,
})
