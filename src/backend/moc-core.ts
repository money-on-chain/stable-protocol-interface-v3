import { writeContract, simulateContract, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '../wagmiConfig' 
import settings from "../settings/settings.json";
import {    
    getExecutionFee,
    getNetworkFromProject
} from "./utils";


type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;

const mintTC = async (
    interfaceContext: any,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    // Mint Collateral token with CA
    
    const { address, contracts, contractProtocolStatus, userBalance, publicClient } = interfaceContext;
    
    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;
    const MoCContract = contracts.Moc[caIndex];

    // Verifications

    // User have sufficient reserve to pay?
    console.log(
        `To mint ${qTC} ${
            (settings.tokens.TC[caIndex] as any).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as any).name
        } in your balance`
    );
    
    const userReserveBalance = userBalance.data.CA[caIndex].balance;    
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as any).name} balance`
        );

    // Allowance    reserveAllowance
    console.log(
        `Allowance: To mint ${qTC} ${
            (settings.tokens.TC[caIndex] as any).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as any).name
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
        valueToSend = await getExecutionFee(publicClient, contractProtocolStatus.data[caIndex].tcMintExecCost, 2);
    } else {
        valueToSend = 0n;
    }
    
    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: 'mintTC',
        args: [qTC, limitAmount, address, vendorAddress],
        account: address,
        value: valueToSend
      })
    
    console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request)
    console.log("txHash", txHash);
    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
};

const redeemTC = async (
    interfaceContext: any,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    // Redeem Collateral token receiving CA

    const { address, contracts, contractProtocolStatus, userBalance, publicClient } = interfaceContext;
    
    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;
    const MoCContract = contracts.Moc[caIndex];

    // Verifications

    // User have sufficient TC in balance?
    console.log(
        `Redeeming ${qTC} ${(settings.tokens.TC[0] as any).name} ... getting approx limit down to: ${limitAmount} ${(settings.tokens.CA[caIndex] as any).name}... `
    );
    const userTCBalance = userBalance.data.TC[caIndex].balance;
    if (qTC > userTCBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as any).name} user balance`
        );

    // There are sufficient TC in the contracts to redeem?
    const tcAvailableToRedeem = contractProtocolStatus.data[caIndex].getTCAvailableToRedeem;
    if (qTC > tcAvailableToRedeem)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as any).name}available to redeem in contract`
        );

    // There are sufficient CA in the contract
    const caBalance = contractProtocolStatus.data[caIndex].getACBalance;
    if (limitAmount > caBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as any).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as any).name}`
        );

    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend = await getExecutionFee(publicClient, contractProtocolStatus.data[caIndex].tcRedeemExecCost, 2);
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: 'redeemTC',
        args: [qTC, limitAmount, address, vendorAddress],
        account: address,
        value: valueToSend
      })
    
    console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request)
    console.log("txHash", txHash);
    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
};

const mintTP = async (
    interfaceContext: any,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    // Mint pegged token with collateral CA

    const { address, contracts, contractProtocolStatus, userBalance, publicClient } = interfaceContext;
    
    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;
    const MoCContract = contracts.Moc[caIndex];
    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications
    // User have sufficient reserve to pay?
    console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as any).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as any).name
        } in your balance`
    );
    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as any).name} balance`
        );

    // Allowance
    console.log(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as any).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as any).name
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
    const tpAvailableToMint = contractProtocolStatus.data[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as any).name} available to mint`
        );

    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend = await getExecutionFee(publicClient, contractProtocolStatus.data[caIndex].tpMintExecCost, 2);
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: 'mintTP',
        args: [tpAddress, qTP,limitAmount, address, vendorAddress],
        account: address,
        value: valueToSend
      })
    
    console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request)
    console.log("txHash", txHash);
    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
};

const redeemTP = async (
    interfaceContext: any,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    // Redeem pegged token receiving CA

    const { address, contracts, contractProtocolStatus, userBalance, publicClient } = interfaceContext;
    
    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;
    const MoCContract = contracts.Moc[caIndex];
    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications

    // User have sufficient PEGGED Token in balance?
    console.log(
        `Redeeming ${qTP} ${(settings.tokens.TP[tpIndex] as any).name} ... getting approx: ${limitAmount} ${(settings.tokens.CA[caIndex] as any).name}... `
    );
    const userTPBalance = userBalance.data.TP[tpIndex]//.balance;
    if (qTP > userTPBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as any).name}  user balance`
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
            `Insufficient ${(settings.tokens.CA[caIndex] as any).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as any).name}`
        );

    let valueToSend;
    if (getNetworkFromProject() === "rsk") {
        valueToSend = await getExecutionFee(publicClient, contractProtocolStatus.data[caIndex].tpRedeemExecCost, 4);
    } else {
        valueToSend = 0n;
    }

    const { request } = await simulateContract(config, {
        address: MoCContract.address,
        abi: MoCContract.abi,
        functionName: 'redeemTP',
        args: [tpAddress, qTP, limitAmount, address, vendorAddress],
        account: address,
        value: valueToSend
      })
    
    console.log("request", request);
    // Send transaction
    const txHash = await writeContract(config, request)
    console.log("txHash", txHash);
    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
};

export { mintTC, redeemTC, mintTP, redeemTP };
