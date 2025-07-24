import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from 'wagmi'
import { useLatestBlockNumber } from '../hooks/useLatestBlockNumber'
import { useOffchainPrices } from '../hooks/useOffchainPrices'
import { useContractProtocolStatus } from '../hooks/useContractProtocolStatus'
import { useProposalCount } from '../hooks/useProposalCount'
import { useContractsOmocStatus } from '../hooks/useContractsOmocStatus'
import { useUserBalance } from '../hooks/useUserBalance'
import { readContracts } from '../hooks/useReadContracts'
import { useBaseCoinBalance } from '../hooks/useBaseCoinBalance'
import { TokenContract, ApproveTokenContract } from '../helpers/exchange'
import { transferTokenTo, transferCoinbaseTo, AllowanceAmount } from '../lib/backend/moc-base'


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
  interfaceTransferToken: (
    currencyYouExchange: string,
    amount: bigint,
    destinationAddress: string,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
  ) => Promise<void>
  interfaceTransferCoinbase: (
    amount: bigint,
    destinationAddress: string,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
  ) => Promise<void>
}

export const WalletContext = createContext<WalletContextType | null>(null)

export const useWalletContext = () => {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWalletContext must be used inside WalletProvider')
  }
  return ctx
}

type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;
type OnError = (error: any) => void;


export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { address, isConnected } = useAccount()
    const { connect } = useConnect()
    const { disconnect } = useDisconnect()
    const publicClient = usePublicClient()
    const walletClient = useWalletClient()

    const [contractsAddress, setContractsAddress] = useState(null)
    const [contractsAddressLoaded, setContractsAddressLoaded] = useState(false)

    const userBaseCoinBalance = useBaseCoinBalance(address, 30_000)

    const [offChainPrices, setOffChainPrices] = useState(null)

    const { blockNumber } = useLatestBlockNumber(5_000)
    const offChainPricesAPI = useOffchainPrices(20_000)

    const contractProtocolStatus = useContractProtocolStatus(
        contractsAddressLoaded ? contractsAddress : undefined,
        Number(blockNumber),
        offChainPrices ?? undefined,
        30_000
    )

    const { proposalCount } = useProposalCount(
        contractsAddressLoaded ? contractsAddress?.VotingMachine : undefined,
        120_000
    )

    const contractStatusOmoc = useContractsOmocStatus(
        contractsAddressLoaded ? contractsAddress : undefined,
        proposalCount,
        30_000
    )

    const userBalance = useUserBalance(
        contractsAddressLoaded ? contractsAddress : undefined,
        address,
        30_000
    )

    useEffect(() => {
        if (offChainPricesAPI.parsedPrices) {
            setOffChainPrices(offChainPricesAPI.parsedPrices)
        }
    }, [offChainPricesAPI.parsedPrices])

    useEffect(() => {
        if (contractProtocolStatus.data) {
            console.log('Protocol:', contractProtocolStatus.data)
        }
    }, [contractProtocolStatus.data])  

    useEffect(() => {
        if (contractStatusOmoc.data) {
            console.log('Omoc:', contractStatusOmoc.data)
        }
    }, [contractStatusOmoc.data])

    useEffect(() => {
        if (userBalance.data) {
            console.log('User balance:', userBalance.data)
        }
    }, [userBalance.data])

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

    const buildInterfaceContext = (): any => {
        return {
            publicClient,
            walletClient,
            contractProtocolStatus,
            userBalance,
            address,
            contracts: contractsAddress,
        };
    };

    const interfaceTransferToken = async (
        currencyYouExchange: string,
        amount: bigint,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<void> => {
        if (!contractsAddress) return;
    
        const tContract = TokenContract(contractsAddress, currencyYouExchange);
        if (tContract.token) {
            const interfaceContext = buildInterfaceContext();
            await transferTokenTo(
                interfaceContext,
                tContract.token,                
                destinationAddress,
                amount,
                onTransaction,
                onReceipt
            );
        }
    };
    
    const interfaceTransferCoinbase = async (
        amount: bigint,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<void> => {
        const interfaceContext = buildInterfaceContext();
        await transferCoinbaseTo(
            interfaceContext,
            destinationAddress,
            amount,
            onTransaction,
            onReceipt
        );
    };

    const interfaceAllowanceAmount = async (
        currencyYouExchange: string,
        currencyYouReceive: string,
        amountAllowance: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<void> => {
        if (!contractsAddress) return;

        const approveInfo = ApproveTokenContract(
            contractsAddress,
            currencyYouExchange,
            currencyYouReceive
        );
        if (approveInfo.token) {
            const interfaceContext = buildInterfaceContext();
            await AllowanceAmount(
                interfaceContext,
                approveInfo.token,
                approveInfo.contractAllow,
                amountAllowance,                
                onTransaction,
                onReceipt
            );
        }
    };

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
            interfaceTransferToken,
            interfaceTransferCoinbase,
            interfaceAllowanceAmount,
        }}
        >
        {children}
        </WalletContext.Provider>
    )
}
