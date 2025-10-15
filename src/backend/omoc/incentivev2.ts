import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import type { TransactionReceipt } from "viem";

import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../../types/wallets";
import { config } from "../../wagmiConfig";

// SignDataResponse can be a string (signature) or an object with signature property
type SignDataResponse = string | { signature: string };

const claimV2 = async (
    interfaceContext: InterfaceContext,
    signDataResponse: SignDataResponse,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.IncentiveV2) return;
    const IncentiveV2 = contracts.IncentiveV2;

    // Handle both string and object formats for signDataResponse
    const signature: string =
        typeof signDataResponse === "string"
            ? signDataResponse
            : signDataResponse.signature;

    const r: string = "0x" + signature.slice(2).slice(0, 64);
    const s: string = "0x" + signature.slice(2).slice(64, 128);
    const v: number = Number.parseInt(signature.slice(2).slice(128), 16);

    const { request } = await simulateContract(config, {
        address: IncentiveV2.address,
        abi: IncentiveV2.abi,
        functionName: "claimV2",
        args: [[v], [r], [s]],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

export { claimV2 };
