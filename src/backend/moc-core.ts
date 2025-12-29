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
import { getExecutionFee } from "./utils";
import { divPrecision, mulPrecision } from "../helpers/precision";
import { calculateLimit } from "../helpers/exchange";

const mintTC = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    // Mint Collateral token with CA

    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = (import.meta.env
        .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;

    // Basic verifications
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
        throw new Error("Contract protocol status not found");

    const MoCContract = contracts.Moc[caIndex];

    // Verifications

    // User have sufficient reserve to pay?
    /*
    console.warn(
        `To mint ${qTC} ${
            (settings.tokens.TC[caIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );*/

    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance    reserveAllowance
    /* console.log(
        `Allowance: To mint ${qTC} ${
            (settings.tokens.TC[caIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );*/
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
        args: [qTC, limitAmount, address, vendorAddress] as const,
        account: address,
    };

    const executionFee = await getExecutionFee(
        publicClient,
        contractProtocolStatus.data[caIndex].tcMintExecCost,
        2
    );

    if (executionFee > 0n) {
        configParams.value = executionFee
    }

    const { request } = await simulateContract(config, configParams);

    //console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request);
    //console.log("txHash", txHash);
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
    // Redeem Collateral token receiving CA

    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = (import.meta.env
        .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;

    // Verifications
    if (!address) throw new Error("Address not found");
    if (!publicClient) throw new Error("Public client not found");
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
    /*console.log(
        `Redeeming ${qTC} ${(settings.tokens.TC[0] as TokenConfig).name} ... getting approx limit down to: ${limitAmount} ${(settings.tokens.CA[caIndex] as TokenConfig).name}... `
    );*/

    const userTCBalance = userBalance.data[caIndex].TC.balance;
    if (qTC > userTCBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as TokenConfig).name} user balance`
        );

    // There are sufficient TC in the contracts to redeem?
    const tcAvailableToRedeem =
        contractProtocolStatus.data[caIndex].getTCAvailableToRedeem;
    if (qTC > tcAvailableToRedeem)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as TokenConfig).name}available to redeem in contract`
        );

    // There are sufficient CA in the contract
    const caBalance = contractProtocolStatus.data[caIndex].getACBalance;
    if (limitAmount > caBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as TokenConfig).name}`
        );

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
        functionName: "redeemTC",
        args: [qTC, limitAmount, address, vendorAddress] as const,
        account: address,
    };

    const executionFee = await getExecutionFee(
        publicClient,
        contractProtocolStatus.data[caIndex].tcRedeemExecCost,
        2
    );

    if (executionFee > 0n) {
        configParams.value = executionFee
    }

    const { request } = await simulateContract(config, configParams);

    //console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request);
    //console.log("txHash", txHash);
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
): Promise<TransactionReceipt | undefined> => {
    // Mint pegged token with collateral CA

    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = (import.meta.env
        .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;

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
        throw new Error("Contract protocol status not found");

    const MoCContract = contracts.Moc[caIndex];
    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications
    // User have sufficient reserve to pay?
    /*console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );*/
    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    /*console.log(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );*/
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
    const tpAvailableToMint =
        contractProtocolStatus.data[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );

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
        args: [tpAddress, qTP, limitAmount, address, vendorAddress] as const,
        account: address,
    };

    const executionFee = await getExecutionFee(
        publicClient,
        contractProtocolStatus.data[caIndex].tpMintExecCost,
        2
    );

    if (executionFee > 0n) {
        configParams.value = executionFee
    }

    const { request } = await simulateContract(config, configParams);

    //console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request);
    //console.log("txHash", txHash);
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
    // Redeem pegged token receiving CA

    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = (import.meta.env
        .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;

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
    if (!userBalance.data.TP) throw new Error("TP not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");
    if (!contractProtocolStatus.data[caIndex])
        throw new Error("Contract protocol status not found");

    const MoCContract = contracts.Moc[caIndex];
    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications

    // User have sufficient PEGGED Token in balance?
    /*console.log(
        `Redeeming ${qTP} ${(settings.tokens.TP[tpIndex] as TokenConfig).name} ... getting approx: ${limitAmount} ${(settings.tokens.CA[caIndex] as TokenConfig).name}... `
    );*/
    const userTPBalance = userBalance.data.TP[caIndex][tpIndex].balance;
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
    const caBalance = contractProtocolStatus.data[caIndex].getACBalance;
    if (limitAmount > caBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as TokenConfig).name}`
        );

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
        functionName: "redeemTP",
        args: [tpAddress, qTP, limitAmount, address, vendorAddress] as const,
        account: address,
    };

    const executionFee = await getExecutionFee(
        publicClient,
        contractProtocolStatus.data[caIndex].tpRedeemExecCost,
        4
    );

    if (executionFee > 0n) {
        configParams.value = executionFee
    }

    const { request } = await simulateContract(config, configParams);

    //console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request);
    //console.log("txHash", txHash);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const swapTPforTP = async (
    interfaceContext: InterfaceContext,
    iFromTP: number,
    iToTP: number,
    qTP: bigint,
    caIndex: number,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    // Mint pegged token with collateral CA

    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = (import.meta.env
        .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;

    // Verifications
    if (!address) throw new Error("Address not found");
    if (!publicClient) throw new Error("Public client not found");
    if (!contracts) throw new Error("Contracts not found");
    if (!contracts.Moc) throw new Error("Moc not found");
    if (!contracts.Moc[caIndex])
        throw new Error(`Moc not found for ${caIndex}`);
    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[iFromTP]) throw new Error(`TP not found for ${iFromTP}`);
    if (!contracts.TP[iToTP]) throw new Error(`TP not found for ${iToTP}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!userBalance.data.CA) throw new Error("CA not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");
    if (!contractProtocolStatus.data[caIndex])
        throw new Error("Contract protocol status not found");

    const MoCContract = contracts.Moc[caIndex];
    //const tpAddressFrom = contracts.TP[iFromTP].address;
    //const tpAddressTo = contracts.TP[iToTP].address;

    const tpPriceFrom = contractProtocolStatus.data[caIndex].PP_TP[iFromTP][0]
    const tpPriceTo = contractProtocolStatus.data[caIndex].PP_TP[iToTP][0]
    const SwapFees = contractProtocolStatus.data[caIndex].swapTPforTPFee

    const qCAtp_From = divPrecision(qTP, tpPriceFrom)
    const qCAtp_To = mulPrecision(qCAtp_From, tpPriceTo)

    const feeOperation = mulPrecision(qCAtp_From, SwapFees)

    const qAssetMaxFees = calculateLimit(feeOperation, 0.1)
    

    // Verifications
    // User have sufficient reserve to pay?
    /*console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );*/

    /*
    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    /*console.log(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );*/
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
    /*const tpAvailableToMint =
        contractProtocolStatus.data[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );*/

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
        functionName: "swapTPforTP",
        args: [iFromTP, iToTP, qTP, limitAmount, qAssetMaxFees, address, vendorAddress] as const,
        account: address,
    };

    const executionFee = await getExecutionFee(
        publicClient,
        contractProtocolStatus.data[caIndex].swapTPforTPExecCost,
        2
    );

    if (executionFee > 0n) {
        configParams.value = executionFee
    }

    const { request } = await simulateContract(config, configParams);

    //console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request);
    //console.log("txHash", txHash);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};


export { mintTC, mintTP, redeemTC, redeemTP, swapTPforTP };
