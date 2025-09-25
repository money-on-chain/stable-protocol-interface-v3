import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";

import settings from "../settings/settings.json";
import type { TokenConfig } from "../types/hooks";
import type { ContractProtocolStatus, UserBalance } from "../types/status";
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
): Promise<any> => {
    // Mint Collateral token with CA coinbase
    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;

    // Verifications
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
    console.log(
        `To mint ${qTC} ${
            (settings.tokens.TC[caIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );
    const userReserveBalance = (userBalance.data as UserBalance).CA[caIndex]
        .balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance    reserveAllowance
    console.log(
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

    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend = await getExecutionFee(
            publicClient,
            (contractProtocolStatus.data as ContractProtocolStatus)[caIndex]
                .tcMintExecCost,
            0
        );
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: "mintTC",
        args: [qTC, address, vendorAddress],
        account: address,
        value: valueToSend,
    });

    // Send transaction
    const txHash = await writeContract(config, request);
    console.log("txHash", txHash);
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
): Promise<any> => {
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
): Promise<any> => {
    // Mint pegged token with collateral coinbase
    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;

    // Verifications
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
    console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );
    const userReserveBalance = (userBalance.data as UserBalance).CA[caIndex]
        .balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    console.log(
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
        contractProtocolStatus.data as ContractProtocolStatus
    )[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );

    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend =
            (await getExecutionFee(
                publicClient,
                (contractProtocolStatus.data as ContractProtocolStatus)[caIndex]
                    .tpMintExecCost,
                0
            )) + limitAmount;
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: "mintTP",
        args: [tpAddress, qTP, address, vendorAddress],
        account: address,
        value: valueToSend,
    });

    // Send transaction
    const txHash = await writeContract(config, request);
    console.log("txHash", txHash);
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
): Promise<any> => {
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
