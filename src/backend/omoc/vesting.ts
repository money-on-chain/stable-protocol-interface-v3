
import { writeContract, simulateContract, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '../../wagmiConfig' 
import { checksumAddress } from 'viem';


type TransactionCallback = (hash: string) => void;
type ReceiptCallback = (receipt: any) => void;

const vestingVerify = async (
    interfaceContext: any,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;    
    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'verify',
        args: [],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
};

const approve = async (
    interfaceContext: any,
    amount: bigint,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    
    const VestingMachine = contracts.VestingMachine;
    
    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'approve',
        args: [amount],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
};

const deposit = async (
    interfaceContext: any,
    amount: bigint,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'deposit',
        args: [amount],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
};

const withdraw = async (
    interfaceContext: any,
    amount: bigint,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'withdraw',
        args: [amount],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
};

const withdrawAll = async (
    interfaceContext: any,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;

    const VestingMachine = contracts.VestingMachine;

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'withdrawAll',
        args: [],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
};


const addStake = async (
    interfaceContext: any,
    amount: bigint,
    userAddress: `0x${string}`,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const StakingMachine = contracts.StakingMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(StakingMachine.address);
    const data = StakingMachine.methods
        .deposit(
            amount,
            checksumAddress(userAddress)
        )
        .encodeABI();

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'callWithData',
        args: [target, data],
        account: address,
        })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt    

};

const unStake = async (
    interfaceContext: any,
    amount: bigint,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const StakingMachine = contracts.StakingMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(StakingMachine.address);
    const data = StakingMachine.methods
        .withdraw(amount)
        .encodeABI();

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'callWithData',
        args: [target, data],
        account: address,
        })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt    
};

const delayMachineCancelWithdraw = async (
    interfaceContext: any,
    idWithdraw: string | number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const DelayMachine = contracts.DelayMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(DelayMachine.address);
    const data = DelayMachine.methods.cancel(idWithdraw).encodeABI();

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'callWithData',
        args: [target, data],
        account: address,
        })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt    
};

const delayMachineWithdraw = async (
    interfaceContext: any,
    idWithdraw: string | number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const DelayMachine = contracts.DelayMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(DelayMachine.address);
    const data = DelayMachine.methods.withdraw(idWithdraw).encodeABI();

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'callWithData',
        args: [target, data],
        account: address,
        })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt    
};

const approveStakingMachine = async (
    interfaceContext: any,
    amount: bigint,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const StakingMachine = contracts.StakingMachine;
    const TG = contracts.TG;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(TG.address);
    const data = TG.methods
        .approve(
            checksumAddress(StakingMachine.address),
            amount
        )
        .encodeABI();

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'callWithData',
        args: [target, data],
        account: address,
        })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt    
};

const preVote = async (
    interfaceContext: any,
    changeContractAddress: `0x${string}`,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VotingMachine = contracts.VotingMachine;
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(VotingMachine.address);
    const data = VotingMachine.methods
        .preVote(checksumAddress(changeContractAddress))
        .encodeABI();

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'callWithData',
        args: [target, data],
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
    const VestingMachine = contracts.VestingMachine;

    const target = checksumAddress(VotingMachine.address);
    const data = VotingMachine.methods.vote(inFavorAgainst).encodeABI();

    const { request } = await simulateContract(config, {
        address: VestingMachine.address,
        abi: VestingMachine.abi,
        functionName: 'callWithData',
        args: [target, data],
        account: address,
        })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt    
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
