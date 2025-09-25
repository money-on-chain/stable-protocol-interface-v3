import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import { checksumAddress, encodeFunctionData } from "viem";

import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../../types/wallets";
import { config } from "../../wagmiConfig";

const vestingVerify = async (
    interfaceContext: InterfaceContext,
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VestingMachine) return;
    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "verify",
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

const approve = async (
    interfaceContext: InterfaceContext,
    amount: bigint,
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VestingMachine) return;
    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "approve",
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

const deposit = async (
    interfaceContext: InterfaceContext,
    amount: bigint,
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VestingMachine) return;
    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "deposit",
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

const withdraw = async (
    interfaceContext: InterfaceContext,
    amount: bigint,
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VestingMachine) return;
    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
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

const withdrawAll = async (
    interfaceContext: InterfaceContext,
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VestingMachine) return;
    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "withdrawAll",
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

const addStake = async (
    interfaceContext: InterfaceContext,
    amount: bigint,
    userAddress: `0x${string}`,
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    if (!contracts.VestingMachine) return;
    const StakingMachine = contracts.StakingMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(StakingMachine.address);
    const data = encodeFunctionData({
        abi: StakingMachine.abi,
        functionName: "deposit",
        args: [amount, checksumAddress(userAddress)],
    });

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "callWithData",
        args: [target, data],
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
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    if (!contracts.VestingMachine) return;
    const StakingMachine = contracts.StakingMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(StakingMachine.address);
    const data = encodeFunctionData({
        abi: StakingMachine.abi,
        functionName: "withdraw",
        args: [amount],
    });

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "callWithData",
        args: [target, data],
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
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.DelayMachine) return;
    if (!contracts.VestingMachine) return;
    const DelayMachine = contracts.DelayMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(DelayMachine.address);
    const data = encodeFunctionData({
        abi: DelayMachine.abi,
        functionName: "cancel",
        args: [idWithdraw],
    });

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "callWithData",
        args: [target, data],
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
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.DelayMachine) return;
    if (!contracts.VestingMachine) return;
    const DelayMachine = contracts.DelayMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(DelayMachine.address);
    const data = encodeFunctionData({
        abi: DelayMachine.abi,
        functionName: "withdraw",
        args: [idWithdraw],
    });

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "callWithData",
        args: [target, data],
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
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.StakingMachine) return;
    if (!contracts.TG) return;
    if (!contracts.VestingMachine) return;
    const StakingMachine = contracts.StakingMachine;
    const TG = contracts.TG;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(TG.address);

    const data = encodeFunctionData({
        abi: TG.abi,
        functionName: "approve",
        args: [checksumAddress(StakingMachine.address), amount],
    });

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "callWithData",
        args: [target, data],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const preVote = async (
    interfaceContext: InterfaceContext,
    changeContractAddress: `0x${string}`,
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VotingMachine) return;
    if (!contracts.VestingMachine) return;
    const VotingMachine = contracts.VotingMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(VotingMachine.address);

    const data = encodeFunctionData({
        abi: VotingMachine.abi,
        functionName: "preVote",
        args: [checksumAddress(changeContractAddress)],
    });

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "callWithData",
        args: [target, data],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const vote = async (
    interfaceContext: InterfaceContext,
    inFavorAgainst: boolean,
    vestingAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VotingMachine) return;
    if (!contracts.VestingMachine) return;
    const VotingMachine = contracts.VotingMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(VotingMachine.address);

    const data = encodeFunctionData({
        abi: VotingMachine.abi,
        functionName: "vote",
        args: [inFavorAgainst],
    });

    const { request } = await simulateContract(config, {
        address: vestingAddress,
        abi: VestingMachine.abi,
        functionName: "callWithData",
        args: [target, data],
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
    approve,
    approveStakingMachine,
    delayMachineCancelWithdraw,
    delayMachineWithdraw,
    deposit,
    preVote,
    unStake,
    vestingVerify,
    vote,
    withdraw,
    withdrawAll,
};
