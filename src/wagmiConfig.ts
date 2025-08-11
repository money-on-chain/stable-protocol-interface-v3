// wagmiConfig.ts
import { createConfig, http } from 'wagmi'
import { rootstock, rootstockTestnet } from 'wagmi/chains'
import { injected, walletConnect, metaMask, coinbaseWallet /*, safe*/ } from 'wagmi/connectors'

// Small helper to read envs safely (supports CRA and Vite-style prefixes)
const env = (k: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[k]) {
    return (import.meta as any).env[k]
  }
  if (typeof process !== 'undefined' && (process as any).env?.[k]) {
    return (process as any).env[k]
  }
  return undefined
}

export const CHAINS = [rootstock, rootstockTestnet] as const
export const DEFAULT_CHAIN = rootstockTestnet // pick mainnet if you prefer

export const config = createConfig({
  chains: CHAINS,
  connectors: [
    // 1) Injected — detects multiple browser wallets (EIP-6963)
    injected({
      shimDisconnect: true, // nicer UX on reloads
    }),

    // 2) WalletConnect — most mobile/desktop wallets via QR / deep link
    walletConnect({
      projectId: env('REACT_APP_WALLET_CONNECT_PROJECT_ID') || env('VITE_WALLET_CONNECT_PROJECT_ID')!,
      // Optional metadata shown inside wallets
      metadata: {
        name: 'My DApp',
        description: 'Rootstock DApp',
        url: 'https://mydapp.example', // your real URL
        icons: ['https://mydapp.example/icon.png'],
      },
      showQrModal: true, // set to false if you use your own modal
    }),

    // 3) Coinbase Wallet — smoother UX for Coinbase users
    coinbaseWallet({
      appName: 'My DApp',
    }),

    // 4) MetaMask (dedicated) — our UI hides it if MM is already injected
    metaMask({
      dappMetadata: { name: 'My DApp' },
    }),

    // 5) Safe (optional) — uncomment only if you target multisig users
    // safe(),
  ],

  // Map each chain to its transport (RPC). Use your own RPCs if you have them.
  transports: {
    [rootstock.id]: http(
      env('REACT_APP_RSK_MAINNET_RPC') || env('VITE_RSK_MAINNET_RPC') || undefined
    ),
    [rootstockTestnet.id]: http(
      env('REACT_APP_RSK_TESTNET_RPC') || env('VITE_RSK_TESTNET_RPC') || undefined
    ),
  },  
  ssr: false,        // set true only if you wire SSR carefully
})
