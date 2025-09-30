import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";

import settings from "../settings/settings.json";
import type { TokenConfig } from "../types/hooks";
import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../types/wallets";
import { config } from "../wagmiConfig";
import { getExecutionFee, getNetworkFromProject } from "./utils";

const mintTC = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    // Mint Collateral token with CA

    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;

    // Basic verifications
    if (!contracts) throw new Error("Contracts not found");
    if (!contracts.Moc) throw new Error("Moc not found");
    if (!contracts.Moc[caIndex])
        throw new Error(`Moc not found for ${caIndex}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!userBalance.data.CA) throw new Error("CA not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");
    if (!contractProtocolStatus.data[caIndex])
        throw new Error("Contract protocol status not found");

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

    const userReserveBalance = (userBalance.data).CA[caIndex]
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

    // TODO: view functions returns baseFee == 0, if we use another value the estimateGas function will revert
    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend = await getExecutionFee(
            publicClient,
            (contractProtocolStatus.data)[caIndex]
                .tcMintExecCost,
            2
        );
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: "mintTC",
        args: [qTC, limitAmount, address, vendorAddress],
        account: address,
        value: valueToSend,
    });

    console.log("request", request);
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
    // Redeem Collateral token receiving CA

    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;
    
    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;
    if (!contracts) throw new Error("Contracts not found");
    if (!contracts.Moc) throw new Error("Moc not found");
    if (!contracts.Moc[caIndex])
        throw new Error(`Moc not found for ${caIndex}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!userBalance.data[caIndex])
        throw new Error(`Bucket index not found for ${caIndex}`);
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");
    if (!contractProtocolStatus.data[caIndex])
        throw new Error("Contract protocol status not found");
    const MoCContract = contracts.Moc[caIndex];

    // Verifications

    // User have sufficient TC in balance?
    console.log(
        `Redeeming ${qTC} ${(settings.tokens.TC[0] as TokenConfig).name} ... getting approx limit down to: ${limitAmount} ${(settings.tokens.CA[caIndex] as TokenConfig).name}... `
    );

    const userTCBalance = (userBalance.data)[caIndex].TC.balance;
    if (qTC > userTCBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as TokenConfig).name} user balance`
        );

    // There are sufficient TC in the contracts to redeem?
    const tcAvailableToRedeem = (
        contractProtocolStatus.data
    )[caIndex].getTCAvailableToRedeem;
    if (qTC > tcAvailableToRedeem)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as TokenConfig).name}available to redeem in contract`
        );

    // There are sufficient CA in the contract
    const caBalance = (contractProtocolStatus.data)[
        caIndex
    ].getACBalance;
    if (limitAmount > caBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as TokenConfig).name}`
        );

    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend = await getExecutionFee(
            publicClient,
            (contractProtocolStatus.data)[caIndex]
                .tcRedeemExecCost,
            2
        );
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: "redeemTC",
        args: [qTC, limitAmount, address, vendorAddress],
        account: address,
        value: valueToSend,
    });

    console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request);
    console.log("txHash", txHash);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
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
    // Mint pegged token with collateral CA

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
        throw new Error("Contract protocol status not found");

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
    const userReserveBalance = (userBalance.data).CA[caIndex]
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
        contractProtocolStatus.data
    )[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );

    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend = await getExecutionFee(
            publicClient,
            (contractProtocolStatus.data)[caIndex]
                .tpMintExecCost,
            2
        );
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: "mintTP",
        args: [tpAddress, qTP, limitAmount, address, vendorAddress],
        account: address,
        value: valueToSend,
    });

    console.log("request", request);
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
    // Redeem pegged token receiving CA

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
    if (!userBalance.data.TP) throw new Error("TP not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");
    if (!contractProtocolStatus.data[caIndex])
        throw new Error("Contract protocol status not found");

    const MoCContract = contracts.Moc[caIndex];
    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications

    // User have sufficient PEGGED Token in balance?
    console.log(
        `Redeeming ${qTP} ${(settings.tokens.TP[tpIndex] as TokenConfig).name} ... getting approx: ${limitAmount} ${(settings.tokens.CA[caIndex] as TokenConfig).name}... `
    );
    const userTPBalance = (userBalance.data).TP[caIndex][tpIndex]
        .balance;
    if (qTP > userTPBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name}  user balance`
        );

    // // There are sufficient Free Pegged Token in the contracts to redeem?
    // const tpAvailableToRedeem = new BigNumber(
    //     Web3.utils.fromWei(contractStatusData.getTPAvailableToMint[tpIndex])
    // );
    // if (new BigNumber(qTP).gt(tpAvailableToRedeem))
    //     throw new Error(
    //         `Insufficient ${settings.tokens.TP[tpIndex].name}  available to redeem in contract`
    //     );

    // There are sufficient CA in the contract
    const caBalance = (contractProtocolStatus.data)[
        caIndex
    ].getACBalance;
    if (limitAmount > caBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as TokenConfig).name}`
        );

    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend = await getExecutionFee(
            publicClient,
            (contractProtocolStatus.data)[caIndex]
                .tpRedeemExecCost,
            4
        );
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: "redeemTP",
        args: [tpAddress, qTP, limitAmount, address, vendorAddress],
        account: address,
        value: valueToSend,
    });

    console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request);
    console.log("txHash", txHash);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

export { mintTC, mintTP, redeemTC, redeemTP };
