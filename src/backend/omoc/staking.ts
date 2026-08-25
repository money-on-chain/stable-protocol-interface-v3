import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import type { TransactionReceipt } from "viem";
import { checksumAddress } from "viem";

import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../../types/wallets";
import { config } from "../../wagmiConfig";

const addStake = async (
    interfaceContext: InterfaceContext,
    amount: bigint,
    userAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    const StakingMachine = contracts.StakingMachine;

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: "deposit",
        args: [amount, checksumAddress(userAddress)],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const unStake = async (
    interfaceContext: InterfaceContext,
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    const StakingMachine = contracts.StakingMachine;

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: "withdraw",
        args: [amount],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const delayMachineWithdraw = async (
    interfaceContext: InterfaceContext,
    idWithdraw: string | number,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.DelayMachine) return;
    const DelayMachine = contracts.DelayMachine;

    const { request } = await simulateContract(config, {
        address: DelayMachine.address,
        abi: DelayMachine.abi,
        functionName: "withdraw",
        args: [idWithdraw],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const delayMachineCancelWithdraw = async (
    interfaceContext: InterfaceContext,
    idWithdraw: string | number,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.DelayMachine) return;
    const DelayMachine = contracts.DelayMachine;

    const { request } = await simulateContract(config, {
        address: DelayMachine.address,
        abi: DelayMachine.abi,
        functionName: "cancel",
        args: [idWithdraw],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const approveStakingMachine = async (
    interfaceContext: InterfaceContext,
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    if (!contracts.TG) return;
    const StakingMachine = contracts.StakingMachine;
    const TG = contracts.TG;

    const { request } = await simulateContract(config, {
        address: TG.address,
        abi: TG.abi,
        functionName: "approve",
        args: [StakingMachine.address, amount],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const subscribeToCoinPair = async (
    interfaceContext: InterfaceContext,
    coinPair: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    const StakingMachine = contracts.StakingMachine;

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: "subscribeToCoinPair",
        args: [coinPair],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const unsubscribeFromCoinPair = async (
    interfaceContext: InterfaceContext,
    coinPair: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    const StakingMachine = contracts.StakingMachine;

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: "unSubscribeFromCoinPair",
        args: [coinPair],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const registerOracle = async (
    interfaceContext: InterfaceContext,
    oracleAddr: `0x${string}`,
    url: string,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    const StakingMachine = contracts.StakingMachine;

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: "registerOracle",
        args: [oracleAddr, url],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const removeOracle = async (
    interfaceContext: InterfaceContext,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    const StakingMachine = contracts.StakingMachine;

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: "removeOracle",
        args: [],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const setOracleName = async (
    interfaceContext: InterfaceContext,
    url: string,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    const StakingMachine = contracts.StakingMachine;

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: "setOracleName",
        args: [url],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const setOracleAddress = async (
    interfaceContext: InterfaceContext,
    oracleAddr: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    const StakingMachine = contracts.StakingMachine;

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: "setOracleAddress",
        args: [oracleAddr],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

export {
    addStake,
    approveStakingMachine,
    delayMachineCancelWithdraw,
    delayMachineWithdraw,
    registerOracle,
    removeOracle,
    setOracleAddress,
    setOracleName,
    subscribeToCoinPair,
    unStake,
    unsubscribeFromCoinPair,
};
