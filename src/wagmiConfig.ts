// wagmiConfig.ts
import { http, createConfig } from 'wagmi'
import { rootstockTestnet } from 'wagmi/chains'
import { injected, walletConnect, metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [rootstockTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId: import.meta.env.REACT_APP_WALLET_CONNECT_PROJECT_ID }),
    metaMask(),
  ],
  transports: {
    [rootstockTestnet.id]: http(),
  },
  ssr: false,
})
