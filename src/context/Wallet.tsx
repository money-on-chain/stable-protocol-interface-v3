import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, usePublicClient } from 'wagmi'
import { useLatestBlockNumber } from '../hooks/useLatestBlockNumber'
import { useOffchainPrices } from '../hooks/useOffchainPrices'
import { useContractProtocolStatus } from '../hooks/useContractProtocolStatus'
import { useProposalCount } from '../hooks/useProposalCount'
import { useContractsOmocStatus } from '../hooks/useContractsOmocStatus'
import { useUserBalance } from '../hooks/useUserBalance'
import { readContracts } from '../hooks/useReadContracts'

export type WalletContextType = {
  isConnected: boolean
  address?: `0x${string}`
  connect: () => void
  disconnect: () => void
  contractsAddress: any
  contractsAddressLoaded: boolean
  contractStatusOmoc: any
  contractProtocolStatus: any
  userBalance: any
  blockNumber?: bigint
  offChainPrices: any
  proposalCount?: bigint
  readContractsAddresses: () => Promise<void>
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

    useEffect(() => {
        if (contractProtocolStatus.storage) {
            console.log('Protocol:', contractProtocolStatus.storage)
        }
    }, [contractProtocolStatus.storage])  

    useEffect(() => {
        if (contractStatusOmoc.storage) {
            console.log('Omoc:', contractStatusOmoc.storage)
        }
    }, [contractStatusOmoc.storage])

    useEffect(() => {
        if (userBalance.storage) {
            console.log('User balance:', userBalance.storage)
        }
    }, [userBalance.storage])

    useEffect(() => {
        if (!contractsAddressLoaded) {
            readContractsAddresses()
        }
    }, [contractsAddressLoaded])

    const readContractsAddresses = async (): Promise<void> => {    
        if (!isConnected || contractsAddressLoaded) return

        try {
            const contractsAddresses = await readContracts(publicClient)
            setContractsAddress(contractsAddresses)
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
            connect,
            disconnect,
            contractsAddress,
            contractsAddressLoaded,
            contractStatusOmoc,
            contractProtocolStatus,
            userBalance,
            blockNumber,
            offChainPrices,
            proposalCount,
            readContractsAddresses,
        }}
        >
        {children}
        </WalletContext.Provider>
    )
}
