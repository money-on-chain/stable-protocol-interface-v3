import BigNumber from "bignumber.js";
import { getGasPrice, toContractPrecisionDecimals } from "../utils";
import Web3 from "web3";
import settings from "../../../settings/settings.json";

// Type definitions
interface InterfaceContext {
    web3: any;
    account: string;
}

interface DContracts {
    contracts: {
        VestingMachine: any;
        StakingMachine: any;
        DelayMachine: any;
        VotingMachine: any;
        TG: any;
        [key: string]: any;
    };
}

type TransactionCallback = (hash: string) => void;
type ReceiptCallback = (receipt: any) => void;

const vestingVerify = async (
    interfaceContext: InterfaceContext,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;

    const VestingMachine = dContracts.contracts.VestingMachine;

    const estimateGas = await VestingMachine.methods
        .verify()
        .estimateGas({ from: account, value: "0x" });

    const receipt = VestingMachine.methods
        .verify()
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

const approve = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const tokenDecimals = settings.tokens.TG[0].decimals;

    const VestingMachine = dContracts.contracts.VestingMachine;
    const amountBN = new BigNumber(amount);

    const estimateGas = await VestingMachine.methods
        .approve(toContractPrecisionDecimals(amountBN, tokenDecimals))
        .estimateGas({ from: account, value: "0x" });

    const receipt = VestingMachine.methods
        .approve(toContractPrecisionDecimals(amountBN, tokenDecimals))
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

const deposit = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const tokenDecimals = settings.tokens.TG[0].decimals;
    const VestingMachine = dContracts.contracts.VestingMachine;

    const amountBN = new BigNumber(amount);

    const estimateGas = await VestingMachine.methods
        .deposit(toContractPrecisionDecimals(amountBN, tokenDecimals))
        .estimateGas({ from: account, value: "0x" });

    const receipt = VestingMachine.methods
        .deposit(toContractPrecisionDecimals(amountBN, tokenDecimals))
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

const withdraw = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const tokenDecimals = settings.tokens.TG[0].decimals;
    const VestingMachine = dContracts.contracts.VestingMachine;

    const amountBN = new BigNumber(amount);

    const estimateGas = await VestingMachine.methods
        .withdraw(toContractPrecisionDecimals(amountBN, tokenDecimals))
        .estimateGas({ from: account, value: "0x" });

    const receipt = VestingMachine.methods
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

const withdrawAll = async (
    interfaceContext: InterfaceContext,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;

    const VestingMachine = dContracts.contracts.VestingMachine;

    const estimateGas = await VestingMachine.methods
        .withdrawAll()
        .estimateGas({ from: account, value: "0x" });

    const receipt = VestingMachine.methods
        .withdrawAll()
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

const _callWithData = async (
    interfaceContext: InterfaceContext,
    target: string,
    data: string,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;

    const VestingMachine = dContracts.contracts.VestingMachine;

    const estimateGas = await VestingMachine.methods
        .callWithData(target, data)
        .estimateGas({ from: account, value: "0x" });

    const receipt = VestingMachine.methods
        .callWithData(target, data)
        .send({
            from: account,
            value: 0,
            gasPrice: await getGasPrice(web3),
            gas: estimateGas * BigInt(2),
            gasLimit: estimateGas * BigInt(2),
        })
        .on("transactionHash", onTransaction)
        .on("receipt", onReceipt);

    return receipt;
};

const addStake = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    address: string,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const dContracts = (window as any).dContracts as DContracts;
    const StakingMachine = dContracts.contracts.StakingMachine;
    const VestingMachine = dContracts.contracts.VestingMachine;
    const tokenDecimals = settings.tokens.TG[0].decimals;

    const amountBN = new BigNumber(amount);

    const target = Web3.utils.toChecksumAddress(StakingMachine.options.address);
    const data = StakingMachine.methods
        .deposit(
            toContractPrecisionDecimals(amountBN, tokenDecimals),
            Web3.utils.toChecksumAddress(VestingMachine.options.address)
        )
        .encodeABI();

    const receipt = _callWithData(
        interfaceContext,
        target,
        data,
        onTransaction,
        onReceipt
    );

    return receipt;
};

const unStake = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const dContracts = (window as any).dContracts as DContracts;
    const StakingMachine = dContracts.contracts.StakingMachine;
    const tokenDecimals = settings.tokens.TG[0].decimals;

    const amountBN = new BigNumber(amount);

    const target = Web3.utils.toChecksumAddress(StakingMachine.options.address);
    const data = StakingMachine.methods
        .withdraw(toContractPrecisionDecimals(amountBN, tokenDecimals))
        .encodeABI();

    const receipt = _callWithData(
        interfaceContext,
        target,
        data,
        onTransaction,
        onReceipt
    );

    return receipt;
};

const delayMachineCancelWithdraw = async (
    interfaceContext: InterfaceContext,
    idWithdraw: string | number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const dContracts = (window as any).dContracts as DContracts;
    const DelayMachine = dContracts.contracts.DelayMachine;

    const target = Web3.utils.toChecksumAddress(DelayMachine.options.address);
    const data = DelayMachine.methods.cancel(idWithdraw).encodeABI();

    const receipt = _callWithData(
        interfaceContext,
        target,
        data,
        onTransaction,
        onReceipt
    );

    return receipt;
};

const delayMachineWithdraw = async (
    interfaceContext: InterfaceContext,
    idWithdraw: string | number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const dContracts = (window as any).dContracts as DContracts;
    const DelayMachine = dContracts.contracts.DelayMachine;

    const target = Web3.utils.toChecksumAddress(DelayMachine.options.address);
    const data = DelayMachine.methods.withdraw(idWithdraw).encodeABI();

    const receipt = _callWithData(
        interfaceContext,
        target,
        data,
        onTransaction,
        onReceipt
    );

    return receipt;
};

const approveStakingMachine = async (
    interfaceContext: InterfaceContext,
    amount: string | number | BigNumber,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const dContracts = (window as any).dContracts as DContracts;

    const StakingMachine = dContracts.contracts.StakingMachine;
    const TG = dContracts.contracts.TG;
    const tokenDecimals = settings.tokens.TG[0].decimals;

    const amountBN = new BigNumber(amount);

    const target = Web3.utils.toChecksumAddress(TG.options.address);
    const data = TG.methods
        .approve(
            Web3.utils.toChecksumAddress(StakingMachine.options.address),
            toContractPrecisionDecimals(amountBN, tokenDecimals)
        )
        .encodeABI();

    const receipt = _callWithData(
        interfaceContext,
        target,
        data,
        onTransaction,
        onReceipt
    );

    return receipt;
};

const preVote = async (
    interfaceContext: InterfaceContext,
    changeContractAddress: string,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const dContracts = (window as any).dContracts as DContracts;
    const VotingMachine = dContracts.contracts.VotingMachine;

    const target = Web3.utils.toChecksumAddress(VotingMachine.options.address);
    const data = VotingMachine.methods
        .preVote(Web3.utils.toChecksumAddress(changeContractAddress))
        .encodeABI();

    const receipt = _callWithData(
        interfaceContext,
        target,
        data,
        onTransaction,
        onReceipt
    );

    return receipt;
};

const vote = async (
    interfaceContext: InterfaceContext,
    inFavorAgainst: boolean,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const dContracts = (window as any).dContracts as DContracts;
    const VotingMachine = dContracts.contracts.VotingMachine;

    const target = Web3.utils.toChecksumAddress(VotingMachine.options.address);
    const data = VotingMachine.methods.vote(inFavorAgainst).encodeABI();

    const receipt = _callWithData(
        interfaceContext,
        target,
        data,
        onTransaction,
        onReceipt
    );

    return receipt;
};

export {
    vestingVerify,
    approve,
    deposit,
    withdraw,
    withdrawAll,
    addStake,
    unStake,
    delayMachineCancelWithdraw,
    delayMachineWithdraw,
    approveStakingMachine,
    preVote,
    vote,
};
