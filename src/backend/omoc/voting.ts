
import { writeContract, simulateContract, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '../../wagmiConfig' 
import { checksumAddress } from 'viem';


type TransactionCallback = (hash: string) => void;
type ReceiptCallback = (receipt: any) => void;

const preVote = async (
    interfaceContext: any,
    changeContractAddress: `0x${string}`,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: 'preVote',
        args: [checksumAddress(changeContractAddress)],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt

};

const unRegister = async (
    interfaceContext: any,
    changeContractAddress: `0x${string}`,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: 'unregister',
        args: [checksumAddress(changeContractAddress)],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
};

const vote = async (
    interfaceContext: any,
    inFavorAgainst: boolean,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: 'vote',
        args: [inFavorAgainst],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt

};

const preVoteStep = async (
    interfaceContext: any,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: 'preVoteStep',
        args: [],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt;
};

const voteStep = async (
    interfaceContext: any,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: 'voteStep',
        args: [],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)
    
    return receipt;
};

const acceptedStep = async (
    interfaceContext: any,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VotingMachine = contracts.VotingMachine;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: 'acceptedStep',
        args: [],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)
    
    return receipt;

};

export { preVote, vote, preVoteStep, voteStep, acceptedStep, unRegister };
