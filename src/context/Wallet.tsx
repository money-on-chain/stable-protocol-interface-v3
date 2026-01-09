import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import type { TransactionReceipt } from "viem";
import {
    useAccount,
    useConnect,
    useDisconnect,
    usePublicClient,
    useWalletClient,
} from "wagmi";

import {
    AllowanceAmount,
    AllowUseTokenMigrator,
    MigrateToken,
    transferCoinbaseTo,
    transferTokenTo,
} from "../backend/moc-base";
import { claimV2 } from "../backend/omoc/incentivev2";
import {
    addStake,
    approveStakingMachine,
    delayMachineCancelWithdraw,
    delayMachineWithdraw,
    unStake,
} from "../backend/omoc/staking";
import {
    addStake as addStakeVesting,
    approve as approveVesting,
    delayMachineCancelWithdraw as delayMachineCancelWithdrawVesting,
    delayMachineWithdraw as delayMachineWithdrawVesting,
    preVote as preVoteVesting,
    unStake as unStakeVesting,
    vestingVerify,
    vote as voteVesting,
    withdrawAll as withdrawAllVesting,
} from "../backend/omoc/vesting";
import { vetoVote, vetoWithdraw } from "../backend/omoc/veto";
import {
    acceptedStep,
    preVote,
    preVoteStep,
    unRegister,
    vote,
    voteStep,
} from "../backend/omoc/voting";
import ModalAccount from "../components/Modals/Account";
import ModalProviders from "../components/Modals/Providers";
import { ApproveTokenContract, TokenContract } from "../helpers/exchange";
import { exchangeMethod } from "../helpers/exchange";
import {
    loadVestingAddressesFromLocalStorage,
    saveVestingAddressesToLocalStorage,
} from "../helpers/vesting";
import { useBaseCoinBalance } from "../hooks/useBaseCoinBalance";
import { useContractOmocStatus } from "../hooks/useContractOmocStatus";
import { useContractProtocolStatus } from "../hooks/useContractProtocolStatus";
import { useIncentiveV2 } from "../hooks/useIncentiveV2";
import { useLatestBlockNumber } from "../hooks/useLatestBlockNumber";
import { useOffchainPrices } from "../hooks/useOffchainPrices";
import { useOnchainPrices } from "../hooks/useOnchainPrices";
import { readContracts } from "../hooks/useReadContracts";
import { useRpcErrorHandler } from "../hooks/useRpcErrorHandler";
import { useRpcErrorIntegration } from "../hooks/useRpcErrorIntegration";
import { useUserBalance } from "../hooks/useUserBalance";
import { useUserOmocBalance } from "../hooks/useUserOmocBalance";
import { useUserVesting } from "../hooks/useUserVesting";
import { useUserVeto } from "../hooks/useUserVeto";
import api from "../services/api";
import type { DContracts, ParsedPrices } from "../types/hooks";
import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
    WalletContextType,
} from "../types/wallets";

// Callback types — avoid `any`

interface VestingTransaction {
    vesting: string;
    [key: string]: unknown;
}

interface VestingResponse {
    transactions?: VestingTransaction[];
    [key: string]: unknown;
}

export const WalletContext = createContext<WalletContextType | null>(null);

export const useWalletContext = () => {
    const ctx = useContext(WalletContext);
    if (!ctx) {
        throw new Error("useWalletContext must be used inside WalletProvider");
    }
    return ctx;
};

const REFRESH_INTERVAL_BLOCKS_NUMBER = 5_000;
const REFRESH_INTERVAL_OFFCHAIN_PRICES = 20_000;
const REFRESH_INTERVAL_ONCHAIN_PRICES = 20_000;
const REFRESH_INTERVAL_CONTRACT_PROTOCOL_STATUS = 30_000;
const REFRESH_INTERVAL_CONTRACT_STATUS_OMOC = 30_000;
const REFRESH_INTERVAL_USER_BALANCE = 30_000;

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const publicClient = usePublicClient();
    const walletClient = useWalletClient();

    const [contractsAddress, setContractsAddress] = useState<DContracts | null>(
        null
    );
    const [contractsAddressLoaded, setContractsAddressLoaded] = useState(false);
    const [vestingAddress, setVestingAddress] = useState<string | undefined>(
        undefined
    );

    const [showModalAccount, setShowModalAccount] = useState<boolean>(false);
    const [showModalProviders, setShowModalProviders] =
        useState<boolean>(false);
    const [vestingOn, setVestingOn] = useState<boolean>(false);
    const toggleVesting = useCallback(() => {
        setVestingOn((prev) => !prev);
    }, []);

    // RPC error handling
    const {
        rpcError,
        handleRpcError,
        retryConnection,
        clearError: clearRpcError,
        isRpcHealthy,
        checkConnectivityNow,
    } = useRpcErrorHandler();

    // Integrate RPC error handling globally
    useRpcErrorIntegration();

    // Hooks for contract data
    const { blockNumber } = useLatestBlockNumber(
        REFRESH_INTERVAL_BLOCKS_NUMBER
    );

    const offChainPricesAPI = useOffchainPrices(
        REFRESH_INTERVAL_OFFCHAIN_PRICES
    );

    const onChainPricesHook = useOnchainPrices(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        REFRESH_INTERVAL_ONCHAIN_PRICES
    );
    const offChainPrices =
        (offChainPricesAPI.parsedPrices as ParsedPrices[]) ?? undefined;
    const onChainPrices =
        (onChainPricesHook.data as ParsedPrices[]) ?? undefined;

    const contractProtocolStatus = useContractProtocolStatus(
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        Number(blockNumber),
        offChainPrices,
        onChainPrices,
        REFRESH_INTERVAL_CONTRACT_PROTOCOL_STATUS
    );

    const contractStatusOmoc = useContractOmocStatus(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        REFRESH_INTERVAL_CONTRACT_STATUS_OMOC
    );

    // Hooks for user data

    const userBaseCoinBalance = useBaseCoinBalance(
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userBalance = useUserBalance(
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userOmocBalance = useUserOmocBalance(
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userVesting = useUserVesting(
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        address,
        vestingAddress as `0x${string}` | undefined,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userIncentiveV2 = useIncentiveV2(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userVeto = useUserVeto(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        userBalance.data,
        contractStatusOmoc.data,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const readContractsAddresses = useCallback(async (): Promise<void> => {
        if (!isConnected || contractsAddressLoaded || !publicClient) return;

        try {
            const contractsAddresses = await readContracts(publicClient);
            setContractsAddress(contractsAddresses);
            setContractsAddressLoaded(true);
        } catch (e) {
            console.error("Error loading contracts:", e);
            handleRpcError(e);
        }
    }, [isConnected, contractsAddressLoaded, publicClient, handleRpcError]);

    useEffect(() => {
        if (!contractsAddressLoaded) {
            void readContractsAddresses();
        }
    }, [contractsAddressLoaded, readContractsAddresses]);

    useEffect(() => {
        if (!isConnected && !showModalProviders) {
            setShowModalProviders(true);
        }
    }, [isConnected, showModalProviders]);

    useEffect(() => {
        // Refetch user data when address changes
        if (!address) return;
        void userBaseCoinBalance?.refetch?.();
        void userBalance?.refetch?.();
        void userOmocBalance?.refetch?.();
        void userVesting?.refetch?.();
        void userIncentiveV2?.refetch?.();
    }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const buildInterfaceContext = (): InterfaceContext => {
        return {
            publicClient,
            walletClient,
            contractProtocolStatus,
            userBalance,
            address: address,
            contracts: contractsAddress,
        };
    };

    /* VESTING */

    const setVestingMachine = useCallback((vAddress: string): void => {
        setVestingAddress(vAddress === "" ? undefined : vAddress);
        // Note: userVesting will automatically refetch when vestingAddress changes
        // due to its dependency on userVestingAddress in the useMemo hook
    }, []);

    const saveUserVesting = (response: VestingResponse): void => {
        if (
            response.transactions !== undefined &&
            response.transactions.length > 0
        ) {
            const vFromStorage = loadVestingAddressesFromLocalStorage(
                address as `0x${string}`
            );
            const vLowerFromStorage = vFromStorage.map((v: string) =>
                v.toLowerCase()
            );

            const newVesting: string[] = [];
            response.transactions.forEach((data) => {
                if (!vLowerFromStorage.includes(data.vesting.toLowerCase())) {
                    newVesting.push(data.vesting.toLowerCase());
                }
            });

            if (newVesting.length > 0) {
                vLowerFromStorage.push(...newVesting);
                saveVestingAddressesToLocalStorage(
                    address as `0x${string}`,
                    vLowerFromStorage
                );
            }
        }
    };

    const readUserVesting = (): void => {
        const url = new URL(
            import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS
        );
        url.pathname = "/v1/omoc/vesting_created/";
        url.search = new URLSearchParams({
            holder: address || "",
            limit: "20",
            skip: "0",
        }).toString();

        api<VestingResponse>("get", url.toString())
            .then((response) => {
                saveUserVesting(response as VestingResponse);
            })
            .catch((error: Error) => {
                console.error(error);
            });
    };

    const isVestingLoaded = (): boolean => {
        return !!vestingAddress;
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
    ): Promise<unknown> => {
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
        onError: (error: unknown) => void
    ): Promise<unknown> => {
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
        onError: (error: unknown) => void
    ): Promise<unknown> => {
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
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded() && vestingAddress) {
            return approveVesting(
                interfaceContext,
                amount,
                vestingAddress as `0x${string}`,
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
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const from = address;
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded() && vestingAddress) {
            return addStakeVesting(
                interfaceContext,
                amount,
                from,
                vestingAddress as `0x${string}`,
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
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded() && vestingAddress) {
            return delayMachineWithdrawVesting(
                interfaceContext,
                idWithdraw,
                vestingAddress as `0x${string}`,
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
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded() && vestingAddress) {
            return delayMachineCancelWithdrawVesting(
                interfaceContext,
                idWithdraw,
                vestingAddress as `0x${string}`,
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
        signDataResponse: string | { signature: string },
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
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
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded() && vestingAddress) {
            return unStakeVesting(
                interfaceContext,
                amount,
                vestingAddress as `0x${string}`,
                onTransaction,
                onReceipt
            );
        } else {
            return unStake(interfaceContext, amount, onTransaction, onReceipt);
        }
    };

    const interfaceVestingWithdraw = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return withdrawAllVesting(
            interfaceContext,
            vestingAddress as `0x${string}`,
            onTransaction,
            onReceipt
        );
        /*
        return withdrawVesting(
            interfaceContext,
            1_000_000_000_000_000_000n,
            vestingAddress as `0x${string}`,
            onTransaction,
            onReceipt
        );
         */
    };

    const interfaceVestingVerify = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return vestingVerify(
            interfaceContext,
            vestingAddress as `0x${string}`,
            onTransaction,
            onReceipt
        );
    };

    // OMOC Voting
    const interfaceVotingPreVote = async (
        changeContractAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded() && vestingAddress) {
            return preVoteVesting(
                interfaceContext,
                changeContractAddress,
                vestingAddress as `0x${string}`,
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
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded() && vestingAddress) {
            return voteVesting(
                interfaceContext,
                inFavorAgainst,
                vestingAddress as `0x${string}`,
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
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return preVoteStep(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVotingVoteStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return voteStep(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVotingAcceptedStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return acceptedStep(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVotingUnRegister = async (
        changeContractAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return unRegister(
            interfaceContext,
            changeContractAddress,
            onTransaction,
            onReceipt
        );
    };

    const interfaceVetoVote = async (
        proposalAddress: `0x${string}`,
        caIndex: number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return vetoVote(
            interfaceContext,
            proposalAddress,
            caIndex,
            onTransaction,
            onReceipt
        );
    };

    const interfaceVetoWithdraw = async (
        proposalAddress: `0x${string}`,
        tcAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return vetoWithdraw(
            interfaceContext,
            proposalAddress,
            tcAddress,
            onTransaction,
            onReceipt
        );
    };

    return (
        <WalletContext.Provider
            value={{
                vestingOn,
                toggleVesting,
                isConnected,
                address,
                contractsAddress,
                contractsAddressLoaded,
                contractStatusOmoc,
                contractProtocolStatus,
                userBalance,
                blockNumber,
                offChainPrices,
                userBaseCoinBalance,
                vestingAddress,
                publicClient,
                walletClient,
                userVesting,
                userOmocBalance,
                userIncentiveV2,
                userVeto,
                connect,
                disconnect,
                readContractsAddresses,
                interfaceTransferToken,
                interfaceTransferCoinbase,
                interfaceAllowanceAmount,
                interfaceExchangeMethod,
                interfaceAllowUseTokenMigrator,
                interfaceMigrateToken,
                isVestingLoaded,
                interfaceStakingApprove,
                interfaceStakingAddStake,
                interfaceStakingDelayMachineWithdraw,
                interfaceStakingDelayMachineCancelWithdraw,
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
                interfaceVetoVote,
                interfaceVetoWithdraw,
                readUserVesting,
                onShowModalProviders,
                onHideModalProviders,
                // RPC error handling
                rpcError,
                handleRpcError,
                retryConnection,
                clearRpcError,
                isRpcHealthy,
                checkConnectivityNow,
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
    );
}
