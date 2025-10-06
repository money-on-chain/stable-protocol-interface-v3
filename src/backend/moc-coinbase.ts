import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import { type Abi, type TransactionReceipt } from "viem";

import settings from "../settings/settings.json";
import type { TokenConfig } from "../types/hooks";
import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../types/wallets";
import { config } from "../wagmiConfig";
import { redeemTC as redeemTC_, redeemTP as redeemTP_ } from "./moc-core";
import { getExecutionFee, getNetworkFromProject } from "./utils";

const mintTC = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    // Mint Collateral token with CA coinbase
    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = (import.meta.env
        .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

    // Verifications
    if (!address) throw new Error("Address not found");
    if (!publicClient) throw new Error("Public client not found");
    if (!contracts) throw new Error("Contracts not found");
    if (!contracts.Moc) throw new Error("Moc not found");
    if (!contracts.Moc[caIndex])
        throw new Error(`Moc not found for ${caIndex}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!userBalance.data.CA) throw new Error("CA not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");
    if (!contractProtocolStatus.data[caIndex])
        throw new Error(`Contract protocol status not found for ${caIndex}`);

    const MoCContract = contracts.Moc[caIndex];

    // Verifications
    // User have sufficient reserve to pay?
    console.warn(
        `To mint ${qTC} ${
            (settings.tokens.TC[caIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );
    const userReserveBalance = (userBalance.data).CA[caIndex]
        .balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance    reserveAllowance
    console.warn(
        `Allowance: To mint ${qTC} ${
            (settings.tokens.TC[caIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );
    /*
    const userSpendableBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].allowance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userSpendableBalance))
        throw new Error(
            'Insufficient spendable balance... please make an allowance to the MoC contract'
        );
    */

    const isRsk = getNetworkFromProject() === "rsk";
    const configParams: {
        address: `0x${string}`;
        abi: Abi;
        functionName: string;
        args: readonly unknown[];
        account: `0x${string}`;
        value?: bigint;
    } = {
        address: MoCContract.address,
        abi: MoCContract.abi as Abi,
        functionName: "mintTC",
        args: [qTC, address, vendorAddress] as const,
        account: address,
    };
    if (isRsk) {
        configParams.value = await getExecutionFee(
            publicClient,
            (contractProtocolStatus.data)[caIndex]
                .tcMintExecCost,
            0
        );
    }
    const { request } = await simulateContract(config, configParams);

    // Send transaction
    const txHash = await writeContract(config, request);
    console.warn("txHash", txHash);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const redeemTC = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    // Redeem Collateral token receiving CA support vendors
    return redeemTC_(
        interfaceContext,
        caIndex,
        qTC,
        limitAmount,
        onTransaction,
        onReceipt
    );
};

const mintTP = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    // Mint pegged token with collateral coinbase
    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = (import.meta.env
        .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

    // Verifications
    if (!address) throw new Error("Address not found");
    if (!publicClient) throw new Error("Public client not found");
    if (!contracts) throw new Error("Contracts not found");
    if (!contracts.Moc) throw new Error("Moc not found");
    if (!contracts.Moc[caIndex])
        throw new Error(`Moc not found for ${caIndex}`);
    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[tpIndex]) throw new Error(`TP not found for ${tpIndex}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!userBalance.data.CA) throw new Error("CA not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");
    if (!contractProtocolStatus.data[caIndex])
        throw new Error(`Contract protocol status not found for ${caIndex}`);

    const MoCContract = contracts.Moc[caIndex];
    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications

    // User have sufficient reserve to pay?
    console.warn(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );
    const userReserveBalance = (userBalance.data).CA[caIndex]
        .balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    console.warn(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );
    /*
    const userSpendableBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].allowance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userSpendableBalance))
        throw new Error(
            'Insufficient spendable balance... please make an allowance to the MoC contract'
        );

     */

    // There are sufficient PEGGED in the contracts to mint?
    const tpAvailableToMint = (
        contractProtocolStatus.data
    )[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );

    const isRsk = getNetworkFromProject() === "rsk";
    const configParams: {
        address: `0x${string}`;
        abi: Abi;
        functionName: string;
        args: readonly unknown[];
        account: `0x${string}`;
        value?: bigint;
    } = {
        address: MoCContract.address,
        abi: MoCContract.abi as Abi,
        functionName: "mintTP",
        args: [tpAddress, qTP, address, vendorAddress] as const,
        account: address,
    };
    if (isRsk) {
        configParams.value =
            (await getExecutionFee(
                publicClient,
                (contractProtocolStatus.data)[caIndex]
                    .tpMintExecCost,
                0
            )) + limitAmount;
    }
    const { request } = await simulateContract(config, configParams);

    // Send transaction
    const txHash = await writeContract(config, request);
    console.warn("txHash", txHash);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const redeemTP = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    // Redeem pegged token receiving CA support vendor
    return redeemTP_(
        interfaceContext,
        caIndex,
        tpIndex,
        qTP,
        limitAmount,
        onTransaction,
        onReceipt
    );
};

export { mintTC, mintTP, redeemTC, redeemTP };
