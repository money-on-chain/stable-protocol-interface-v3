import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import type { TransactionReceipt } from "viem";
import { checksumAddress } from "viem";

type SimulateParams = {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args: unknown[];
    account: Address | undefined;
    value?: bigint;
    gasPrice?: bigint;
};

import { env } from "../../constants/v1";
import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../../types/wallets";
import { config } from "../../wagmiConfig";

type Address = `0x${string}`;

/**
 * Legacy MoC v1's own mintDoc/redeemFreeDoc enforce a hardcoded max
 * tx.gasprice (a protocol-level value that can be changed by governance,
 * observed at ~30.3M wei) — a deliberate guard, not a bug. Any call that
 * ends up routing through that swap (repayWithAC sells vault collateral for
 * TP via MoC v1) must pin its own gas price below that cap explicitly: the
 * wallet's default gas price isn't derived from the network's current base
 * fee, so there's no other way to keep it under the limit from here. Must
 * also stay above the network's current base fee (e.g. e2e's
 * realistic-mining loop holds it at 22M) or the transaction is simply
 * invalid and never gets mined. Configurable via env since MoC v1's cap can
 * change without a corresponding dapp release.
 */
const MOC_V1_SAFE_GAS_PRICE = BigInt(
    env("REACT_APP_MOC_V1_SAFE_GAS_PRICE") || "28000000"
);

/**
 * waitForTransactionReceipt resolves once a transaction lands in a block,
 * whether it succeeded or reverted — it does not throw on revert. Callers
 * here otherwise treat any resolved receipt as a completed operation, so a
 * reverted transaction (e.g. legacy MoC v1's own gas-price guard rejecting
 * the swap inside a queued operation) would silently be reported as success.
 */
const waitForSuccessfulReceipt = async (
    hash: `0x${string}`,
    operationName: string
): Promise<TransactionReceipt> => {
    const receipt = await waitForTransactionReceipt(config, { hash });
    if (receipt.status === "reverted") {
        throw new Error(`${operationName} transaction reverted (hash: ${hash})`);
    }
    return receipt;
};

/**
 * Approve a TP token so the LendingManager can pull it for deposit.
 */
const approveTP = async (
    interfaceContext: InterfaceContext,
    tpToken: { address: Address; abi: readonly unknown[] },
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;

    const { request } = await simulateContract(config, {
        address: tpToken.address,
        abi: tpToken.abi,
        functionName: "approve",
        args: [contracts.LendingManager.address, amount],
        account: address,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "approveTP");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

/**
 * Deposit TP tokens into the lending pool.
 * Requires prior TP approval to LendingManager.
 */
const deposit = async (
    interfaceContext: InterfaceContext,
    recipient: Address,
    tpToken: Address,
    tpAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;
    const LendingManager = contracts.LendingManager;

    const { request } = await simulateContract(config, {
        address: LendingManager.address,
        abi: LendingManager.abi,
        functionName: "deposit",
        args: [checksumAddress(recipient), checksumAddress(tpToken), tpAmount],
        account: address,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "deposit");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

/**
 * Withdraw deposit units from the lending pool, redeeming the underlying TP.
 */
const withdraw = async (
    interfaceContext: InterfaceContext,
    recipient: Address,
    tpToken: Address,
    depositUnits: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;
    const LendingManager = contracts.LendingManager;

    const { request } = await simulateContract(config, {
        address: LendingManager.address,
        abi: LendingManager.abi,
        functionName: "withdraw",
        args: [
            checksumAddress(recipient),
            checksumAddress(tpToken),
            depositUnits,
        ],
        account: address,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "withdraw");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

/**
 * Add AC collateral to a vault.
 * For coinbase-based AC: pass acAmount as value (msg.value = acAmount).
 * For ERC-20 AC: pass value = 0n (contract pulls via transferFrom).
 */
const addACtoVault = async (
    interfaceContext: InterfaceContext,
    recipient: Address,
    tpToken: Address,
    mocBucket: Address,
    acAmount: bigint,
    value: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;
    const LendingManager = contracts.LendingManager;

    const simParams: SimulateParams = {
        address: LendingManager.address,
        abi: LendingManager.abi,
        functionName: "addACtoVault",
        args: [
            checksumAddress(recipient),
            checksumAddress(tpToken),
            checksumAddress(mocBucket),
            acAmount,
        ],
        account: address,
    };
    simParams.value = value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { request } = await simulateContract(config, simParams as any);

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "addACtoVault");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

/**
 * Remove AC collateral from a vault.
 * If useQueue is active: executionFee = coinbaseForPayExecutions, else 0n.
 */
const removeACfromVault = async (
    interfaceContext: InterfaceContext,
    recipient: Address,
    tpToken: Address,
    mocBucket: Address,
    acAmount: bigint,
    executionFee: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;
    const LendingManager = contracts.LendingManager;

    const simParams: SimulateParams = {
        address: LendingManager.address,
        abi: LendingManager.abi,
        functionName: "removeACfromVault",
        args: [
            checksumAddress(recipient),
            checksumAddress(tpToken),
            checksumAddress(mocBucket),
            acAmount,
        ],
        account: address,
    };
    simParams.value = executionFee;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { request } = await simulateContract(config, simParams as any);

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "removeACfromVault");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

/**
 * Borrow TP from a vault.
 * If useQueue is active: executionFee = coinbaseForPayExecutions, else 0n.
 */
const borrow = async (
    interfaceContext: InterfaceContext,
    recipient: Address,
    tpToken: Address,
    mocBucket: Address,
    tpAmount: bigint,
    executionFee: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;
    const LendingManager = contracts.LendingManager;

    const simParams: SimulateParams = {
        address: LendingManager.address,
        abi: LendingManager.abi,
        functionName: "borrow",
        args: [
            checksumAddress(recipient),
            checksumAddress(tpToken),
            checksumAddress(mocBucket),
            tpAmount,
        ],
        account: address,
    };
    simParams.value = executionFee;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { request } = await simulateContract(config, simParams as any);

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "borrow");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

/**
 * Repay borrowed TP using TP tokens directly.
 * Requires prior TP approval to LendingManager.
 */
const repay = async (
    interfaceContext: InterfaceContext,
    recipient: Address,
    tpToken: Address,
    mocBucket: Address,
    creditUnits: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;
    const LendingManager = contracts.LendingManager;

    const { request } = await simulateContract(config, {
        address: LendingManager.address,
        abi: LendingManager.abi,
        functionName: "repay",
        args: [
            checksumAddress(recipient),
            checksumAddress(tpToken),
            checksumAddress(mocBucket),
            creditUnits,
        ],
        account: address,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "repay");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

/**
 * Repay borrowed TP by selling vault AC collateral (swap-based repayment).
 * If useQueue is active: executionFee = coinbaseForPayExecutions, else 0n.
 */
const repayWithAC = async (
    interfaceContext: InterfaceContext,
    tpToken: Address,
    mocBucket: Address,
    creditUnits: bigint,
    executionFee: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;
    const LendingManager = contracts.LendingManager;

    const simParams: SimulateParams = {
        address: LendingManager.address,
        abi: LendingManager.abi,
        functionName: "repayWithAC",
        args: [
            checksumAddress(tpToken),
            checksumAddress(mocBucket),
            creditUnits,
        ],
        account: address,
    };
    simParams.value = executionFee;
    simParams.gasPrice = MOC_V1_SAFE_GAS_PRICE;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { request } = await simulateContract(config, simParams as any);

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "repayWithAC");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

/**
 * Execute all pending queued operations, sending coinbase to recipient as refund.
 */
const execute = async (
    interfaceContext: InterfaceContext,
    recipient: Address,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts?.LendingManager) return;
    const LendingManager = contracts.LendingManager;

    const { request } = await simulateContract(config, {
        address: LendingManager.address,
        abi: LendingManager.abi,
        functionName: "execute",
        args: [checksumAddress(recipient)],
        account: address,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForSuccessfulReceipt(txHash, "execute");
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

export {
    addACtoVault,
    approveTP,
    borrow,
    deposit,
    execute,
    removeACfromVault,
    repay,
    repayWithAC,
    withdraw,
};
