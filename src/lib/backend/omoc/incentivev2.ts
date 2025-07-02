import { getGasPrice } from "../utils";
import Web3 from "web3";

// Type definitions
interface InterfaceContext {
    web3: Web3;
    account: string;
    [key: string]: any;
}

// SignDataResponse can be a string (signature) or an object with signature property
type SignDataResponse = string | { signature: string };

type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;

// Extend Window interface for dContracts
declare global {
    interface Window {
        dContracts: {
            contracts: {
                IncentiveV2: {
                    methods: {
                        claimV2: (v: number[], r: string[], s: string[]) => {
                            estimateGas: (options: { from: string; value: string }) => Promise<number>;
                            send: (options: {
                                from: string;
                                value: number;
                                gasPrice: string;
                                gas: number;
                                gasLimit: number;
                            }) => {
                                on: (event: string, callback: (data: any) => void) => any;
                            };
                        };
                    };
                };
            };
        };
    }
}

const claimV2 = async (
    interfaceContext: InterfaceContext,
    signDataResponse: SignDataResponse,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
    const { web3, account } = interfaceContext;
    const dContracts = window.dContracts;
    const IncentiveV2 = dContracts.contracts.IncentiveV2;

    // Handle both string and object formats for signDataResponse
    const signature: string = typeof signDataResponse === 'string' 
        ? signDataResponse 
        : signDataResponse.signature;
    
    const r: string = "0x" + signature.slice(2).slice(0, 64);
    const s: string = "0x" + signature.slice(2).slice(64, 128);
    const v: number = Number.parseInt(signature.slice(2).slice(128), 16);

    const estimateGas: number = await IncentiveV2.methods
        .claimV2([v], [r], [s])
        .estimateGas({ from: account, value: "0x" });

    const receipt = IncentiveV2.methods
        .claimV2([v], [r], [s])
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

export { claimV2 };
