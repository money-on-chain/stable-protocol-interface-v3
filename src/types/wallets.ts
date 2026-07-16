// Generic interface context consumed by backend helpers
import type { TransactionReceipt } from "viem";
import type { usePublicClient } from "wagmi";
import type { useWalletClient } from "wagmi";
import type { useConnect } from "wagmi";

import type { useContractLendingStatus } from "../hooks/useContractLendingStatus";
import type { useContractOmocStatus } from "../hooks/useContractOmocStatus";
import type { useContractProtocolStatus } from "../hooks/useContractProtocolStatus";
import type { useIncentiveV2 } from "../hooks/useIncentiveV2";
import type { UsePriceProviderResult } from "../hooks/usePriceProvider";
// import type { useProposalCount } from "../hooks/useProposalCount";
import type { useUserVeto } from "../hooks/useUserVeto";
import type { UseBaseCoinBalanceResult } from "../types/status";
import type { DContracts } from "./hooks";
import type {
    ContractProtocolStatusV1Result,
    DContractsV1,
    UserBalanceV1Result,
} from "./hooks-v1";
import type {
    ContractProtocolStatusResult,
    UserBalanceResult,
    UserLendingResult,
    UserOmocBalanceResult,
    UserVestingResult,
} from "./status";

// Reusable EVM address
export type Address = `0x${string}`;

// Contracts bag: include the known ones you use (VotingMachine) and allow more
export type ContractsAddress = {
    VotingMachine?: Address;
    [k: string]: Address | undefined;
};

export interface InterfaceContext {
    publicClient: ReturnType<typeof usePublicClient> | undefined;
    walletClient: ReturnType<typeof useWalletClient>;
    contractProtocolStatus: ContractProtocolStatusResult;
    userBalance: UserBalanceResult;
    address?: Address;
    contracts: DContracts | null;
}

export type OnTransaction = (hash: string) => void;
export type OnReceipt = (receipt: unknown) => void;
export type OnError = (error: unknown) => void;
export type WalletContextType = {
    isConnected: boolean;
    isOnCorrectChain: boolean;
    address?: Address;
    connect: ReturnType<typeof useConnect>["connect"];
    disconnect: () => void;

    contractsAddress: DContracts | null;
    contractsAddressLoaded: boolean;

    contractStatusOmoc: ReturnType<typeof useContractOmocStatus>;
    contractProtocolStatus: ReturnType<typeof useContractProtocolStatus>;
    contractLendingStatus: ReturnType<typeof useContractLendingStatus>;

    userLending: UserLendingResult;

    userBalance: UserBalanceResult;
    userOmocBalance: UserOmocBalanceResult;
    userBaseCoinBalance: UseBaseCoinBalanceResult;

    // moc-v1 (legacy) — populated only when
    // REACT_APP_ENVIRONMENT_APP_PROJECT === "moc-v1"; see feedback memory
    // "shared wallet context": these live alongside the v3 fields above rather
    // than replacing them, so v3 components keep their existing types untouched.
    contractsAddressV1: DContractsV1 | null;
    contractProtocolStatusV1: ContractProtocolStatusV1Result;
    userBalanceV1: UserBalanceV1Result;
    interfaceMintBProV1: (
        btcAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<TransactionReceipt | undefined>;
    interfaceMintDocV1: (
        btcAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<TransactionReceipt | undefined>;
    interfaceRedeemBProV1: (
        bproAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<TransactionReceipt | undefined>;
    interfaceRedeemFreeDocV1: (
        docAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<TransactionReceipt | undefined>;
    userVesting: UserVestingResult;
    userIncentiveV2: ReturnType<typeof useIncentiveV2>;
    userVeto: ReturnType<typeof useUserVeto>;

    blockNumber?: bigint;
    offChainPrices: unknown;
    priceProvider: UsePriceProviderResult;
    // proposalCount?: ReturnType<typeof useProposalCount>;

    publicClient: ReturnType<typeof usePublicClient> | undefined;
    walletClient: ReturnType<typeof useWalletClient>;

    readContractsAddresses: () => Promise<void>;

    interfaceTransferToken: (
        currencyYouExchange: string,
        amount: bigint,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<void>;

    interfaceTransferCoinbase: (
        amount: bigint,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<void>;

    interfaceAllowanceAmount: (
        currencyYouExchange: string,
        currencyYouReceive: string,
        amountAllowance: bigint,
        caIndex: number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<void>;

    interfaceExchangeMethod: (
        currencyYouExchange: string,
        currencyYouReceive: string,
        tokenAmount: bigint,
        limitAmount: bigint,
        qAssetMaxFees: bigint,
        caIndex: number,
        tpIndex: number,
        operationType: string,
        anotherTokenAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<unknown>;

    interfaceAllowUseTokenMigrator: (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceMigrateToken: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceStakingApprove: (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceStakingAddStake: (
        amount: bigint,
        address: Address,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceStakingDelayMachineWithdraw: (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceStakingDelayMachineCancelWithdraw: (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    isVestingLoaded: () => boolean;
    vestingAddress: string | undefined;
    vestingOn: boolean;
    toggleVesting: () => void;
    onShowModalAccount: () => void;
    onShowModalAccountVesting: () => void;
    onHideModalAccount: () => void;
    setVestingMachine: (vAddress: string) => void;

    interfaceIncentiveV2Claim: (
        signDataResponse: string | { signature: string },
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceStakingUnStake: (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVestingWithdraw: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVestingVerify: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVotingPreVote: (
        changeContractAddress: Address,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVotingVote: (
        inFavorAgainst: boolean,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVotingPreVoteStep: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVotingVoteStep: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVotingAcceptedStep: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVotingUnRegister: (
        changeContractAddress: Address,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVetoVote: (
        proposalAddress: Address,
        caIndex: number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    interfaceVetoWithdraw: (
        proposalAddress: Address,
        tcAddress: Address,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<unknown>;

    onShowModalProviders: () => void;
    onHideModalProviders: () => void;

    // keep these if you need them exposed
    readUserVesting: () => void;

    // RPC error handling
    rpcError: {
        hasError: boolean;
        errorMessage: string;
        isRetrying: boolean;
        retryCount: number;
    };
    handleRpcError: (error: unknown) => void;
    retryConnection: () => Promise<void>;
    clearRpcError: () => void;
    isRpcHealthy: boolean;
    checkConnectivityNow: () => void;
};
