import { getGasPrice } from "../utils";
import Web3 from "web3";

// Type definitions
interface InterfaceContext {
    web3: any;
    account: string;
}

interface DContracts {
    contracts: {
        VotingMachine: any;
        [key: string]: any;
    };
}

type TransactionCallback = (hash: string) => void;
type ReceiptCallback = (receipt: any) => void;

const preVote = async (
    interfaceContext: InterfaceContext,
    changeContractAddress: string,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const VotingMachine = dContracts.contracts.VotingMachine;

    const estimateGas = await VotingMachine.methods
        .preVote(Web3.utils.toChecksumAddress(changeContractAddress))
        .estimateGas({ from: account, value: "0x" });

    const receipt = VotingMachine.methods
        .preVote(Web3.utils.toChecksumAddress(changeContractAddress))
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

const unRegister = async (
    interfaceContext: InterfaceContext,
    changeContractAddress: string,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const VotingMachine = dContracts.contracts.VotingMachine;

    const estimateGas = await VotingMachine.methods
        .unregister(Web3.utils.toChecksumAddress(changeContractAddress))
        .estimateGas({ from: account, value: "0x" });

    const receipt = VotingMachine.methods
        .unregister(Web3.utils.toChecksumAddress(changeContractAddress))
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

const vote = async (
    interfaceContext: InterfaceContext,
    inFavorAgainst: boolean,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const VotingMachine = dContracts.contracts.VotingMachine;

    const estimateGas = await VotingMachine.methods
        .vote(inFavorAgainst)
        .estimateGas({ from: account, value: "0x" });

    const receipt = VotingMachine.methods
        .vote(inFavorAgainst)
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

const preVoteStep = async (
    interfaceContext: InterfaceContext,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const VotingMachine = dContracts.contracts.VotingMachine;

    const estimateGas = await VotingMachine.methods
        .preVoteStep()
        .estimateGas({ from: account, value: "0x" });

    const receipt = VotingMachine.methods
        .preVoteStep()
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

const voteStep = async (
    interfaceContext: InterfaceContext,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const VotingMachine = dContracts.contracts.VotingMachine;

    const estimateGas = await VotingMachine.methods
        .voteStep()
        .estimateGas({ from: account, value: "0x" });

    const receipt = VotingMachine.methods
        .voteStep()
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

const acceptedStep = async (
    interfaceContext: InterfaceContext,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = (window as any).dContracts as DContracts;
    const VotingMachine = dContracts.contracts.VotingMachine;

    const estimateGas = await VotingMachine.methods
        .acceptedStep()
        .estimateGas({ from: account, value: "0x" });

    const receipt = VotingMachine.methods
        .acceptedStep()
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

export { preVote, vote, preVoteStep, voteStep, acceptedStep, unRegister };
