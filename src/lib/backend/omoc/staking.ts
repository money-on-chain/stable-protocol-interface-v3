import BigNumber from "bignumber.js";
import Web3 from "web3";

import { getGasPrice, toContractPrecisionDecimals } from "../utils";
import settings from "../../../settings/settings.json";

// Type definitions
interface InterfaceContext {
    web3: any;
    account: string;
}

interface DContracts {
    contracts: {
        StakingMachine: any;
        DelayMachine: any;
        TG: any;
        [key: string]: any;
    };
}

type TransactionCallback = (hash: string) => void;
type ReceiptCallback = (receipt: any) => void;

const addStake = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    address: string,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const tokenDecimals = settings.tokens.TG[0].decimals;

    const StakingMachine = dContracts.contracts.StakingMachine;
    const amountBN = new BigNumber(amount);

    const estimateGas = await StakingMachine.methods
        .deposit(
            toContractPrecisionDecimals(amountBN, tokenDecimals),
            Web3.utils.toChecksumAddress(address)
        )
        .estimateGas({ from: account, value: "0x" });

    const receipt = StakingMachine.methods
        .deposit(
            toContractPrecisionDecimals(amountBN, tokenDecimals),
            Web3.utils.toChecksumAddress(address)
        )
        .send({
            from: account,
            value: 0,
            gasPrice: await getGasPrice(web3),
            gas: estimateGas,
            gasLimit: estimateGas,
        })
        .on("transactionHash", onTransaction)
        .on("receipt", onReceipt);

    return receipt;
};

const unStake = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const tokenDecimals = settings.tokens.TG[0].decimals;

    const StakingMachine = dContracts.contracts.StakingMachine;
    const amountBN = new BigNumber(amount);

    const estimateGas = await StakingMachine.methods
        .withdraw(toContractPrecisionDecimals(amountBN, tokenDecimals))
        .estimateGas({ from: account, value: "0x" });

    const receipt = StakingMachine.methods
        .withdraw(toContractPrecisionDecimals(amountBN, tokenDecimals))
        .send({
            from: account,
            value: 0,
            gasPrice: await getGasPrice(web3),
            gas: estimateGas,
            gasLimit: estimateGas,
        })
        .on("transactionHash", onTransaction)
        .on("receipt", onReceipt);

    return receipt;
};

const delayMachineWithdraw = async (
    interfaceContext: InterfaceContext,
    idWithdraw: string | number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const DelayMachine = dContracts.contracts.DelayMachine;

    const estimateGas = await DelayMachine.methods
        .withdraw(idWithdraw)
        .estimateGas({ from: account, value: "0x" });

    const receipt = DelayMachine.methods
        .withdraw(idWithdraw)
        .send({
            from: account,
            value: 0,
            gasPrice: await getGasPrice(web3),
            gas: estimateGas,
            gasLimit: estimateGas,
        })
        .on("transactionHash", onTransaction)
        .on("receipt", onReceipt);

    return receipt;
};

const delayMachineCancelWithdraw = async (
    interfaceContext: InterfaceContext,
    idWithdraw: string | number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const DelayMachine = dContracts.contracts.DelayMachine;

    const estimateGas = await DelayMachine.methods
        .cancel(idWithdraw)
        .estimateGas({ from: account, value: "0x" });

    const receipt = DelayMachine.methods
        .cancel(idWithdraw)
        .send({
            from: account,
            value: 0,
            gasPrice: await getGasPrice(web3),
            gas: estimateGas,
            gasLimit: estimateGas,
        })
        .on("transactionHash", onTransaction)
        .on("receipt", onReceipt);

    return receipt;
};

const approveStakingMachine = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;

    const StakingMachine = dContracts.contracts.StakingMachine;
    const TG = dContracts.contracts.TG;
    const tokenDecimals = settings.tokens.TG[0].decimals;

    const amountBN = new BigNumber(amount);

    const estimateGas = await TG.methods
        .approve(
            StakingMachine.options.address,
            toContractPrecisionDecimals(amountBN, tokenDecimals)
        )
        .estimateGas({ from: account, value: "0x" });

    const receipt = TG.methods
        .approve(
            StakingMachine.options.address,
            toContractPrecisionDecimals(amountBN, tokenDecimals)
        )
        .send({
            from: account,
            value: 0,
            gasPrice: await getGasPrice(web3),
            gas: estimateGas,
            gasLimit: estimateGas,
        })
        .on("transactionHash", onTransaction)
        .on("receipt", onReceipt);

    return receipt;
};

export {
    addStake,
    unStake,
    delayMachineWithdraw,
    delayMachineCancelWithdraw,
    approveStakingMachine,
};
