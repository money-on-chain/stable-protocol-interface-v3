
import { writeContract, simulateContract, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '../wagmiConfig' 


type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;
type OnError = (error: any) => void;

const AllowanceAmount = async (
    interfaceContext: any,
    token: any,
    contractAllow: any,
    amountAllowance: bigint,    
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address } = interfaceContext;
    const contractAllowAddress = contractAllow.address;

    const { request } = await simulateContract(config, {
        address: token.address,
        abi: token.abi,
        functionName: 'approve',
        args: [contractAllowAddress, amountAllowance],
        account: address,
      })
    
    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
    
};

const transferTokenTo = async (
    interfaceContext: any,
    token: any,
    to: string,
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address } = interfaceContext;

    
    const { request } = await simulateContract(config, {
        address: token.address,
        abi: token.abi,
        functionName: 'transfer',
        args: [to, amount],
        account: address,
      })
    
    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
};

const transferCoinbaseTo = async (
    interfaceContext: any,
    to: string,
    amount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    
    const { address, walletClient } = interfaceContext;
    
    const hash = await walletClient.sendTransaction({
        to,
        account: address,
        value: amount,
        //gas: 21_000n,        // fijo para transferencia simple
        //gasPrice,            // opcional: si querés forzar gasPrice
    })

    onTransaction?.(hash)

    const publicClient = walletClient.extendPublicClient() // si ya lo tenés, podés pasarlo directamente

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    onReceipt?.(receipt)

    return receipt
};

const AllowUseTokenMigrator = async (
    interfaceContext: any,
    newAllowance: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
): Promise<any> => {
    
    const { address, contracts } = interfaceContext;
    const tp_legacy = contracts.tp_legacy;
    const tokenMigrator = contracts.token_migrator;

    if (!contracts.tp_legacy)
        console.log(
            "Error: Please set token migrator address in environment vars!"
        );

    const { request } = await simulateContract(config, {
        address: tp_legacy.address,
        abi: tp_legacy.abi,
        functionName: 'approve',
        args: [tokenMigrator.address, newAllowance],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
};

const MigrateToken = async (
    interfaceContext: any,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    onError: OnError
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    

    if (!contracts.token_migrator)
        console.log(
            "Error: Please set token migrator address in environment vars!"
        );

    const tokenMigrator = contracts.token_migrator;

    const { request } = await simulateContract(config, {
        address: tokenMigrator.address,
        abi: tokenMigrator.abi,
        functionName: 'migrateToken',
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

export {
    AllowanceAmount,
    transferTokenTo,
    AllowUseTokenMigrator,
    MigrateToken,
    transferCoinbaseTo,
};
