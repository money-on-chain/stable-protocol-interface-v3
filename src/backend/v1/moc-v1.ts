// Transaction backend for the legacy v1 MoC contracts (main-RBTC-contract).
// No caIndex, no MocQueue — mint/redeem execute synchronously in one transaction
// directly against MoC.sol (see src/hooks/useReadContractsV1.ts for discovery).
import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import { type Abi, type TransactionReceipt } from "viem";

import { VENDOR_ADDRESS_V1 } from "../../constants/v1";
import type { InterfaceContextV1 } from "../../types/hooks-v1";
import type { OnReceipt, OnTransaction } from "../../types/wallets";
import { config } from "../../wagmiConfig";
import { previewFeesV1 } from "./fees-v1";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const vendorAddress = (): `0x${string}` => VENDOR_ADDRESS_V1 ?? ZERO_ADDRESS;

const mintBPro = async (
    interfaceContext: InterfaceContextV1,
    btcAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts, contractProtocolStatus } = interfaceContext;

    if (!address) throw new Error("Address not found");
    if (!contracts) throw new Error("Contracts not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");

    // Safe upper-bound msg.value — see fees-v1.ts for why this covers both the
    // RBTC-fee-path and MOC-fee-path cases (excess is refunded on-chain).
    const { valueToSend } = previewFeesV1(
        btcAmount,
        contractProtocolStatus.data.mintBProFeesRbtc,
        contractProtocolStatus.data.vendorMarkup
    );

    const { request } = await simulateContract(config, {
        address: contracts.Moc.address,
        abi: contracts.Moc.abi as Abi,
        functionName: "mintBProVendors",
        args: [btcAmount, vendorAddress()] as const,
        account: address,
        value: valueToSend,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const mintDoc = async (
    interfaceContext: InterfaceContextV1,
    btcAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts, contractProtocolStatus } = interfaceContext;

    if (!address) throw new Error("Address not found");
    if (!contracts) throw new Error("Contracts not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");

    const { valueToSend } = previewFeesV1(
        btcAmount,
        contractProtocolStatus.data.mintDocFeesRbtc,
        contractProtocolStatus.data.vendorMarkup
    );

    const { request } = await simulateContract(config, {
        address: contracts.Moc.address,
        abi: contracts.Moc.abi as Abi,
        functionName: "mintDocVendors",
        args: [btcAmount, vendorAddress()] as const,
        account: address,
        value: valueToSend,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const redeemBPro = async (
    interfaceContext: InterfaceContextV1,
    bproAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;

    if (!address) throw new Error("Address not found");
    if (!contracts) throw new Error("Contracts not found");

    // Redeem burns BPro directly (bproToken.burn) — no ERC20 allowance needed.
    const { request } = await simulateContract(config, {
        address: contracts.Moc.address,
        abi: contracts.Moc.abi as Abi,
        functionName: "redeemBProVendors",
        args: [bproAmount, vendorAddress()] as const,
        account: address,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const redeemFreeDoc = async (
    interfaceContext: InterfaceContextV1,
    docAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;

    if (!address) throw new Error("Address not found");
    if (!contracts) throw new Error("Contracts not found");

    // Redeem burns DOC directly (docToken.burn) — no ERC20 allowance needed.
    const { request } = await simulateContract(config, {
        address: contracts.Moc.address,
        abi: contracts.Moc.abi as Abi,
        functionName: "redeemFreeDocVendors",
        args: [docAmount, vendorAddress()] as const,
        account: address,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

// Approves the Moc contract to spend the caller's MOC (MoCToken) — needed so
// MoC.sol's transferCommissions() picks the MOC-fee path instead of RBTC (see
// fees-v1.ts's header comment: the contract chooses based on live MOC
// balance/allowance, there's no explicit "pay fee in MOC" contract parameter).
const allowanceMoc = async (
    interfaceContext: InterfaceContextV1,
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;

    if (!address) throw new Error("Address not found");
    if (!contracts) throw new Error("Contracts not found");

    const { request } = await simulateContract(config, {
        address: contracts.MoCToken.address,
        abi: contracts.MoCToken.abi as Abi,
        functionName: "approve",
        args: [contracts.Moc.address, amount] as const,
        account: address,
    });

    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });
    if (onReceipt) onReceipt(receipt);

    return receipt;
};

export { allowanceMoc, mintBPro, mintDoc, redeemBPro, redeemFreeDoc };
