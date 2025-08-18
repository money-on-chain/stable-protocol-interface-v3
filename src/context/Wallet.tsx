import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from 'wagmi'
import { useLatestBlockNumber } from '../hooks/useLatestBlockNumber'
import { useOffchainPrices } from '../hooks/useOffchainPrices'
import { useContractProtocolStatus } from '../hooks/useContractProtocolStatus'
import { useProposalCount } from '../hooks/useProposalCount'
import { useContractOmocStatus } from '../hooks/useContractOmocStatus'
import { useUserOmocBalance } from '../hooks/useUserOmocBalance'
import { useUserBalance } from '../hooks/useUserBalance'
import { readContracts } from '../hooks/useReadContracts'
import { useBaseCoinBalance, UseBaseCoinBalanceReturn } from '../hooks/useBaseCoinBalance'
import { useUserVesting } from '../hooks/useUserVesting'
import { useIncentiveV2 } from '../hooks/useIncentiveV2'
import { TokenContract, ApproveTokenContract } from '../helpers/exchange'
import { UseStorageResult } from '../hooks/useMulticall'
import { transferTokenTo, transferCoinbaseTo, AllowanceAmount, AllowUseTokenMigrator, MigrateToken } from '../backend/moc-base'
import ModalAccount from '../components/Modals/Account'
import ModalProviders from '../components/Modals/Providers'
import { exchangeMethod } from "../helpers/exchange";
import {
    addStake as addStakeVesting,
    unStake as unStakeVesting,
    delayMachineWithdraw as delayMachineWithdrawVesting,
    delayMachineCancelWithdraw as delayMachineCancelWithdrawVesting,
    approve as approveVesting,
    withdrawAll,
    vestingVerify,
    preVote as preVoteVesting,
    vote as voteVesting,
} from "../backend/omoc/vesting";
import {
    addStake,
    unStake,
    delayMachineWithdraw,
    delayMachineCancelWithdraw,
    approveStakingMachine,
} from "../backend/omoc/staking";
import { claimV2 } from "../backend/omoc/incentivev2";
import {
    acceptedStep,
    preVote,
    preVoteStep,
    vote,
    voteStep,
    unRegister,
} from "../backend/omoc/voting";
import {
    loadVestingAddressesFromLocalStorage,
    saveVestingAddressesToLocalStorage,
} from "../helpers/vesting";
import api from "../services/api";

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
  publicClient: any
  walletClient: any
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
  interfaceAllowanceAmount: (
    currencyYouExchange: string,
    currencyYouReceive: string,
    amountAllowance: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
  ) => Promise<void>
  interfaceExchangeMethod: (
    currencyYouExchange: string,
    currencyYouReceive: string,
    tokenAmount: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
  ) => Promise<any>
  interfaceAllowUseTokenMigrator: (
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceMigrateToken: (
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceStakingApprove: (
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceStakingAddStake: (
    amount: bigint,
    address: string,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceStakingDelayMachineWithdraw: (
    idWithdraw: string | number,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceStakingDelayMachineCancelWithdraw: (
    idWithdraw: string | number,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  isVestingLoaded: () => boolean
  vestingAddress: string | undefined
  onShowModalAccount: () => void
  onShowModalAccountVesting: () => void
  onHideModalAccount: () => void
  setVestingMachine: (vAddress: string) => void
  interfaceIncentiveV2Claim: (
    signDataResponse: any,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceStakingUnStake: (
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceVestingWithdraw: (
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceVestingVerify: (
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceVotingPreVote: (
    changeContractAddress: string,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceVotingVote: (
    inFavorAgainst: boolean,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceVotingPreVoteStep: (
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceVotingVoteStep: (
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceVotingAcceptedStep: (
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  interfaceVotingUnRegister: (
    changeContractAddress: string,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
  ) => Promise<any>
  userBaseCoinBalance: UseBaseCoinBalanceReturn
  userVesting: UseStorageResult<any>
  userIncentiveV2: UseStorageResult<any>
  onShowModalProviders: () => void
  onHideModalProviders: () => void
  userOmocBalance: UseStorageResult<any>
}

interface VestingTransaction {
    vesting: string;
    [key: string]: any;
}

interface VestingResponse {
    transactions?: VestingTransaction[];
    [key: string]: any;
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

const REFRESH_INTERVAL_BLOCKS_NUMBER = 5_000
const REFRESH_INTERVAL_OFFCHAIN_PRICES = 20_000
const REFRESH_INTERVAL_CONTRACT_PROTOCOL_STATUS = 30_000
const REFRESH_INTERVAL_CONTRACT_STATUS_OMOC = 30_000
const REFRESH_INTERVAL_USER_BALANCE = 30_000

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { address, isConnected } = useAccount()
    const { connect } = useConnect()
    const { disconnect } = useDisconnect()
    const publicClient = usePublicClient()
    const walletClient = useWalletClient()
    
    const [contractsAddress, setContractsAddress] = useState(null)
    const [contractsAddressLoaded, setContractsAddressLoaded] = useState(false)
    const [vestingAddress, setVestingAddress] = useState<string | undefined>(undefined)

    const [offChainPrices, setOffChainPrices] = useState(null)
    const [showModalAccount, setShowModalAccount] = useState<boolean>(false)
    const [showModalProviders, setShowModalProviders] = useState<boolean>(false)
    const [vestingOn, setVestingOn] = useState<boolean>(false)

    /*useEffect(() => {
        if (isConnected) {
          console.log('🔄 Account changed:', address)
          // invalidate queries
          if (userBalance.queryKey) {            
            queryClient.invalidateQueries({ queryKey: userBalance.queryKey })
          }
          if (userOmocBalance.queryKey) {
            queryClient.invalidateQueries({ queryKey: userOmocBalance.queryKey })
          }
          if (userVesting.queryKey) {
            queryClient.invalidateQueries({ queryKey: userVesting.queryKey })
          }
          if (userIncentiveV2.queryKey) {
            queryClient.invalidateQueries({ queryKey: userIncentiveV2.queryKey })
          }
        }
        
      }, [address])*/

    // Hooks for contract data

    const { blockNumber } = useLatestBlockNumber(REFRESH_INTERVAL_BLOCKS_NUMBER)
    
    const offChainPricesAPI = useOffchainPrices(REFRESH_INTERVAL_OFFCHAIN_PRICES)    

    const contractProtocolStatus = useContractProtocolStatus(
        contractsAddressLoaded ? contractsAddress : undefined,
        Number(blockNumber),
        offChainPrices ?? undefined,
        REFRESH_INTERVAL_CONTRACT_PROTOCOL_STATUS
    )

    const { proposalCount } = useProposalCount(
        contractsAddressLoaded ? contractsAddress?.VotingMachine : undefined,
        120_000
    )

    const contractStatusOmoc = useContractOmocStatus(
        contractsAddressLoaded ? contractsAddress : undefined,
        proposalCount,
        REFRESH_INTERVAL_CONTRACT_STATUS_OMOC
    )

    // Hooks for user data

    const userBaseCoinBalance = useBaseCoinBalance(address, REFRESH_INTERVAL_USER_BALANCE)

    const userBalance = useUserBalance(
        contractsAddressLoaded ? contractsAddress : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    )

    const userOmocBalance = useUserOmocBalance(
        contractsAddressLoaded ? contractsAddress : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    )

    const userVesting = useUserVesting(
        contractsAddressLoaded ? contractsAddress : undefined,
        address,
        vestingAddress,
        REFRESH_INTERVAL_USER_BALANCE
    )

    const userIncentiveV2 = useIncentiveV2(
        contractsAddressLoaded ? contractsAddress : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    )

    useEffect(() => {
        if (offChainPricesAPI.parsedPrices) {
            setOffChainPrices(offChainPricesAPI.parsedPrices)
        }
    }, [offChainPricesAPI.parsedPrices])

    /*useEffect(() => {
        if (contractProtocolStatus.data) {
            //console.log('Protocol:', contractProtocolStatus.data)
        }
    }, [contractProtocolStatus.data])  */

    /*useEffect(() => {
        if (contractStatusOmoc.data) {
            //console.log('Omoc:', contractStatusOmoc.data)
        }
    }, [contractStatusOmoc.data])  */

    /*useEffect(() => {
        if (userBalance.data) {
            console.log('User balance:', userBalance.data)
        }
    }, [userBalance.data])*/

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
   
    const onDisconnect = (): void => {
        disconnect();
    };

    const onShowModalAccount = (): void => {
        setShowModalAccount(true);
    };

    const onShowModalProviders = (): void => {
        setShowModalProviders(true);
    };

    const onShowModalAccountVesting = (): void => {
        setVestingOn(true);
        setShowModalAccount(true);
    };

    const onHideModalAccount = (): void => {
        setShowModalAccount(false);
    };

    const onHideModalProviders = (): void => {
        setShowModalProviders(false);
    };

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

    /* VESTING */

    const setVestingMachine = (vAddress: string): void => {
        setVestingAddress(vAddress)
    };

    const saveUserVesting = (response: VestingResponse): void => {
        if (
            response.transactions !== undefined &&
            response.transactions.length > 0
        ) {
            const vFromStorage = loadVestingAddressesFromLocalStorage(
                address
            );
            let vLowerFromStorage = vFromStorage.map((v: string) => v.toLowerCase());

            const newVesting: string[] = [];
            response.transactions.forEach((data) => {
                if (!vLowerFromStorage.includes(data.vesting.toLowerCase())) {
                    newVesting.push(data.vesting.toLowerCase());
                }
            });

            if (newVesting.length > 0) {
                vLowerFromStorage.push(...newVesting);
                saveVestingAddressesToLocalStorage(
                    address,
                    vLowerFromStorage
                );
            }
        }
    };

    const readUserVesting = (): void => {
        const baseUrl = `${import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS}omoc/vesting_created/`;
        const queryParams = new URLSearchParams({
            holder: address || "",
            limit: "20",
            skip: "0",
        }).toString();
        const url = `${baseUrl}?${queryParams}`;

        api("get", url)
            .then((response: VestingResponse) => {
                saveUserVesting(response);
            })
            .catch((error: Error) => {
                console.error(error);
            });
    };

    const isVestingLoaded = (): boolean => {
        return !!(vestingAddress);
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

    const interfaceExchangeMethod = async (
        currencyYouExchange: string,
        currencyYouReceive: string,
        tokenAmount: bigint,
        limitAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return exchangeMethod(
            interfaceContext,
            currencyYouExchange,
            currencyYouReceive,
            tokenAmount,
            limitAmount,
            onTransaction,
            onReceipt
        );
    };

    const interfaceAllowUseTokenMigrator = async (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return AllowUseTokenMigrator(
            interfaceContext,
            amount,
            onTransaction,
            onReceipt,
            onError
        );
    };

    const interfaceMigrateToken = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return MigrateToken(
            interfaceContext,
            onTransaction,
            onReceipt,
            onError
        );
    };

    // OMOC methods
    const interfaceStakingApprove = async (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return approveVesting(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt
            );
        } else {
            return approveStakingMachine(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceStakingAddStake = async (
        amount: bigint,
        address: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const from = address;
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return addStakeVesting(
                interfaceContext,
                amount,
                from,
                onTransaction,
                onReceipt
            );
        } else {
            return addStake(
                interfaceContext,
                amount,
                from,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceStakingDelayMachineWithdraw = async (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return delayMachineWithdrawVesting(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt
            );
        } else {
            return delayMachineWithdraw(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceStakingDelayMachineCancelWithdraw = async (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return delayMachineCancelWithdrawVesting(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt
            );
        } else {
            return delayMachineCancelWithdraw(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceIncentiveV2Claim = async (
        signDataResponse: any,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return claimV2(
            interfaceContext,
            signDataResponse,
            onTransaction,
            onReceipt
        );
    };

    const interfaceStakingUnStake = async (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return unStakeVesting(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt
            );
        } else {
            return unStake(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceVestingWithdraw = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return withdrawAll(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVestingVerify = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return vestingVerify(
            interfaceContext,
            onTransaction,
            onReceipt
        );
    };

    // OMOC Voting
    const interfaceVotingPreVote = async (
        changeContractAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return preVoteVesting(
                interfaceContext,
                changeContractAddress,
                onTransaction,
                onReceipt
            );
        } else {
            return preVote(
                interfaceContext,
                changeContractAddress,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceVotingVote = async (
        inFavorAgainst: boolean,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return voteVesting(
                interfaceContext,
                inFavorAgainst,
                onTransaction,
                onReceipt
            );
        } else {
            return vote(
                interfaceContext,
                inFavorAgainst,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceVotingPreVoteStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return preVoteStep(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVotingVoteStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return voteStep(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVotingAcceptedStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return acceptedStep(
            interfaceContext,
            onTransaction,
            onReceipt
        );
    };

    const interfaceVotingUnRegister = async (
        changeContractAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return unRegister(
            interfaceContext,
            changeContractAddress,
            onTransaction,
            onReceipt
        );
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
            userBaseCoinBalance,
            readContractsAddresses,
            interfaceTransferToken,
            interfaceTransferCoinbase,
            interfaceAllowanceAmount,
            interfaceExchangeMethod,
            interfaceAllowUseTokenMigrator,
            interfaceMigrateToken,
            isVestingLoaded,
            vestingAddress,
            interfaceStakingApprove,
            interfaceStakingAddStake,
            interfaceStakingDelayMachineWithdraw,
            interfaceStakingDelayMachineCancelWithdraw,
            publicClient,
            walletClient,
            onShowModalAccount,
            onShowModalAccountVesting,
            onHideModalAccount,
            setVestingMachine,
            interfaceIncentiveV2Claim,
            interfaceStakingUnStake,
            interfaceVestingWithdraw,
            interfaceVestingVerify,
            interfaceVotingPreVote,
            interfaceVotingVote,
            interfaceVotingPreVoteStep,
            interfaceVotingVoteStep,
            interfaceVotingAcceptedStep,
            interfaceVotingUnRegister,
            readUserVesting,
            userVesting,
            userOmocBalance,
            userIncentiveV2,
            onShowModalProviders,
            onHideModalProviders
        }}
        >
        {children}
            <ModalAccount
                show={showModalAccount}
                onShow={onShowModalAccount}
                onHide={onHideModalAccount}
                vestingOn={vestingOn}
                setVestingOn={setVestingOn}
            />
            <ModalProviders
                show={showModalProviders}
                onShow={onShowModalProviders}
                onHide={onHideModalProviders}
                
            />
        </WalletContext.Provider>
    )
}
