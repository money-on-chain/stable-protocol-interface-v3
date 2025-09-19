
import { simulateContract, waitForTransactionReceipt,writeContract } from '@wagmi/core'
import { checksumAddress } from 'viem';

import { config } from '../../wagmiConfig' 


type TransactionCallback = (hash: string) => void;
type ReceiptCallback = (receipt: any) => void;

const addStake = async (
    interfaceContext: any,
    amount: bigint,
    userAddress: `0x${string}`,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const StakingMachine = contracts.StakingMachine;    

    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
        functionName: 'deposit',
        args: [amount, checksumAddress(userAddress)],
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
    
    const { request } = await simulateContract(config, {
        address: StakingMachine.address,
        abi: StakingMachine.abi,
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

const delayMachineWithdraw = async (
    interfaceContext: any,
    idWithdraw: string | number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;    
    const DelayMachine = contracts.DelayMachine;

    const { request } = await simulateContract(config, {
        address: DelayMachine.address,
        abi: DelayMachine.abi,
        functionName: 'withdraw',
        args: [idWithdraw],
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

    const { request } = await simulateContract(config, {
        address: DelayMachine.address,
        abi: DelayMachine.abi,
        functionName: 'cancel',
        args: [idWithdraw],
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
    

    const { request } = await simulateContract(config, {
        address: TG.address,
        abi: TG.abi,
        functionName: 'approve',
        args: [StakingMachine.address, amount],
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
    addStake,
    approveStakingMachine,
    delayMachineCancelWithdraw,
    delayMachineWithdraw,
    unStake,
};
