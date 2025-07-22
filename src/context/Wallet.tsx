import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, usePublicClient } from 'wagmi'
import { useLatestBlockNumber } from '../hooks/useLatestBlockNumber'
import { useOffchainPrices } from '../hooks/useOffchainPrices'
import { useContractProtocolStatus } from '../hooks/useContractProtocolStatus'
import { useProposalCount } from '../hooks/useProposalCount'
import { useContractsOmocStatus } from '../hooks/useContractsOmocStatus'
import { useUserBalance } from '../hooks/useUserBalance'
import { readContracts } from '../lib/backend/contracts'

export type WalletContextType = {
  isConnected: boolean
  address?: `0x${string}`
  contractsAddress: any
  contractsAddressLoaded: boolean
  contractStatusOmoc: any
  contractProtocolStatus: any
  userBalance: any
  blockNumber?: bigint
  offChainPrices: any
  proposalCount?: bigint
  initContractsConnection: () => Promise<void>
}

export const WalletContext = createContext<WalletContextType | null>(null)

export const useWalletContext = () => {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWalletContext must be used inside WalletProvider')
  }
  return ctx
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()

  const [contractsAddress, setContractsAddress] = useState(null)
  const [contractsAddressLoaded, setContractsAddressLoaded] = useState(false)
  const [offChainPrices, setOffChainPrices] = useState(null)

  const { blockNumber } = useLatestBlockNumber(5_000)
  const offChainPricesAPI = useOffchainPrices()

  const contractProtocolStatus = useContractProtocolStatus(
    contractsAddressLoaded ? contractsAddress : undefined,
    Number(blockNumber),
    offChainPrices ?? undefined
  )

  const { proposalCount } = useProposalCount(
    contractsAddressLoaded ? contractsAddress?.VotingMachine : undefined,
    30_000
  )

  const contractStatusOmoc = useContractsOmocStatus(
    contractsAddressLoaded ? contractsAddress : undefined,
    proposalCount
  )

  const userBalance = useUserBalance(
    contractsAddressLoaded ? contractsAddress : undefined,
    address
  )

  useEffect(() => {
    if (offChainPricesAPI.parsedPrices) {
      setOffChainPrices(offChainPricesAPI.parsedPrices)
    }
  }, [offChainPricesAPI.parsedPrices])

  const initContractsConnection = async (): Promise<void> => {
    if (!isConnected || contractsAddressLoaded) return

    try {
      const contracts = await readContracts(publicClient)
      setContractsAddress(contracts)
      setContractsAddressLoaded(true)
    } catch (e) {
      console.error("Error loading contracts:", e)
    }
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        contractsAddress,
        contractsAddressLoaded,
        contractStatusOmoc,
        contractProtocolStatus,
        userBalance,
        blockNumber,
        offChainPrices,
        proposalCount,
        initContractsConnection,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
