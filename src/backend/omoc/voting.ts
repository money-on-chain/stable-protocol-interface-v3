import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import { checksumAddress, type TransactionReceipt } from "viem";

import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../../types/wallets";
import { config } from "../../wagmiConfig";

const preVote = async (
    interfaceContext: InterfaceContext,
    changeContractAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VotingMachine) return;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: "preVote",
        args: [checksumAddress(changeContractAddress)],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const unRegister = async (
    interfaceContext: InterfaceContext,
    changeContractAddress: `0x${string}`,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VotingMachine) return;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: "unregister",
        args: [checksumAddress(changeContractAddress)],
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
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VotingMachine) return;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: "vote",
        args: [inFavorAgainst],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const preVoteStep = async (
    interfaceContext: InterfaceContext,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VotingMachine) return;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: "preVoteStep",
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

const voteStep = async (
    interfaceContext: InterfaceContext,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VotingMachine) return;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: "voteStep",
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

const acceptedStep = async (
    interfaceContext: InterfaceContext,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VotingMachine) return;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: "acceptedStep",
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

export { acceptedStep, preVote, preVoteStep, unRegister, vote, voteStep };
