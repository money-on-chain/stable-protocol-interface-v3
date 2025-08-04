import { writeContract, simulateContract, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '../../wagmiConfig' 


// SignDataResponse can be a string (signature) or an object with signature property
type SignDataResponse = string | { signature: string };

type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;



const claimV2 = async (
    interfaceContext: any,
    signDataResponse: SignDataResponse,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const IncentiveV2 = contracts.IncentiveV2;

    // Handle both string and object formats for signDataResponse
    const signature: string = typeof signDataResponse === 'string' 
        ? signDataResponse 
        : signDataResponse.signature;
    
    const r: string = "0x" + signature.slice(2).slice(0, 64);
    const s: string = "0x" + signature.slice(2).slice(64, 128);
    const v: number = Number.parseInt(signature.slice(2).slice(128), 16);

    const { request } = await simulateContract(config, {
        address: IncentiveV2.address,
        abi: IncentiveV2.abi,
        functionName: 'claimV2',
        args: [[v], [r], [s]],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt
    
};

export { claimV2 };
