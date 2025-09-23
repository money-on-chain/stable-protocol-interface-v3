// Generic interface context consumed by backend helpers
import type { usePublicClient } from "wagmi";
import type { useWalletClient } from "wagmi";
import type { useConnect } from "wagmi";

import type { UseBaseCoinBalanceReturn } from "../hooks/useBaseCoinBalance";
import type { useContractOmocStatus } from "../hooks/useContractOmocStatus";
import type { useContractProtocolStatus } from "../hooks/useContractProtocolStatus";
import type { useIncentiveV2 } from "../hooks/useIncentiveV2";
import type { useUserBalance } from "../hooks/useUserBalance";
import type { useUserOmocBalance } from "../hooks/useUserOmocBalance";
import type { useUserVesting } from "../hooks/useUserVesting";
import type { useUserVeto } from "../hooks/useUserVeto";
import type { DContracts} from "./hooks";

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
    contractProtocolStatus: ReturnType<typeof useContractProtocolStatus>;
    userBalance: ReturnType<typeof useUserBalance>;
    address?: Address;
    contracts: DContracts | null;
}

export type OnTransaction = (hash: string) => void;
export type OnReceipt = (receipt: unknown) => void;
export type OnError = (error: unknown) => void;
export type WalletContextType = {
    isConnected: boolean;
    address?: Address;
    connect: ReturnType<typeof useConnect>['connect'];
    disconnect: () => void;

    contractsAddress: DContracts | null;
    contractsAddressLoaded: boolean;

    contractStatusOmoc: ReturnType<typeof useContractOmocStatus>;
    contractProtocolStatus: ReturnType<typeof useContractProtocolStatus>;

    userBalance: ReturnType<typeof useUserBalance>;
    userOmocBalance: ReturnType<typeof useUserOmocBalance>;
    userBaseCoinBalance: UseBaseCoinBalanceReturn;
    userVesting: ReturnType<typeof useUserVesting>;
    userIncentiveV2: ReturnType<typeof useIncentiveV2>;
    userVeto: ReturnType<typeof useUserVeto>;

    blockNumber?: bigint;
    offChainPrices: unknown;
    proposalCount?: bigint;

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
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<void>;

    interfaceExchangeMethod: (
        currencyYouExchange: string,
        currencyYouReceive: string,
        tokenAmount: bigint,
        limitAmount: bigint,
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
    onShowModalAccount: () => void;
    onShowModalAccountVesting: () => void;
    onHideModalAccount: () => void;
    setVestingMachine: (vAddress: string) => void;

    interfaceIncentiveV2Claim: (
        signDataResponse: unknown,
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
};
