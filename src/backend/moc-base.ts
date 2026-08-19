import {
    sendTransaction,
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import { type TransactionReceipt } from "viem";

import type { ContractInfo } from "../types/hooks";
import type {
    InterfaceContext,
    OnError,
    OnReceipt,
    OnTransaction,
} from "../types/wallets";
import { config } from "../wagmiConfig";

const AllowanceAmount = async (
    interfaceContext: InterfaceContext,
    token: ContractInfo,
    contractAllow: ContractInfo,
    amountAllowance: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address } = interfaceContext;
    const contractAllowAddress = contractAllow.address;

    const { request } = await simulateContract(config, {
        address: token.address,
        abi: token.abi,
        functionName: "approve",
        args: [contractAllowAddress, amountAllowance],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const transferTokenTo = async (
    interfaceContext: InterfaceContext,
    token: ContractInfo,
    to: string,
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address } = interfaceContext;

    const { request } = await simulateContract(config, {
        address: token.address,
        abi: token.abi,
        functionName: "transfer",
        args: [to, amount],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const transferCoinbaseTo = async (
    interfaceContext: InterfaceContext,
    to: string,
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, walletClient } = interfaceContext;

    const hash = await sendTransaction(config, {
        to: to as `0x${string}`,
        account: address,
        value: amount,
        //gas: 21_000n,        // fixed for simple transfer
        //gasPrice,            // optional: if you want to force gasPrice
    });

    onTransaction?.(hash);

    const { publicClient } = interfaceContext;

    if (!publicClient) {
        throw new Error("Public client not available");
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    onReceipt?.(receipt);

    return receipt;
};

const AllowUseTokenMigrator = async (
    interfaceContext: InterfaceContext,
    newAllowance: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;

    if (!contracts) return;
    if (!contracts.tp_legacy) return;
    if (!contracts.token_migrator) return;

    const tp_legacy = contracts.tp_legacy;
    const tokenMigrator = contracts.token_migrator;

    if (!contracts.tp_legacy)
        console.error(
            "Error: Please set token migrator address in environment vars!"
        );

    const { request } = await simulateContract(config, {
        address: tp_legacy.address,
        abi: tp_legacy.abi,
        functionName: "approve",
        args: [tokenMigrator.address, newAllowance],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const MigrateToken = async (
    interfaceContext: InterfaceContext,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;

    if (!contracts) return;
    if (!contracts.token_migrator) return;

    if (!contracts.token_migrator)
        console.error(
            "Error: Please set token migrator address in environment vars!"
        );

    const tokenMigrator = contracts.token_migrator;

    const { request } = await simulateContract(config, {
        address: tokenMigrator.address,
        abi: tokenMigrator.abi,
        functionName: "migrateToken",
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

const MigrateRifPro = async (
    interfaceContext: InterfaceContext,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;

    if (!contracts?.rifpro_migrator) {
        onError(new Error("RIFPRO migrator contract is not configured"));
        return;
    }

    const tokenMigrator = contracts.rifpro_migrator;
    const { request } = await simulateContract(config, {
        address: tokenMigrator.address,
        abi: tokenMigrator.abi,
        functionName: "migrateToken",
        args: [],
        account: address,
    });
    const txHash = await writeContract(config, request);

    onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });
    onReceipt(receipt);

    return receipt;
};

export {
    AllowanceAmount,
    AllowUseTokenMigrator,
    MigrateRifPro,
    MigrateToken,
    transferCoinbaseTo,
    transferTokenTo,
};
