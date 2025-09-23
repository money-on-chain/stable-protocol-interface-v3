import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import { checksumAddress } from "viem";

import { config } from "../../wagmiConfig";

type TransactionCallback = (hash: string) => void;
type ReceiptCallback = (receipt: any) => void;

const vetoVote = async (
    interfaceContext: any,
    proposalAddress: `0x${string}`,
    caIndex: number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts, userBalance } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VetoMachine) return;
    const VetoMachine = contracts.VetoMachine;

    const tcAddress = contracts.CollateralToken[caIndex].address;
    const userTCBalance = userBalance.data[caIndex].TC.balance;

    const { request } = await simulateContract(config, {
        address: VetoMachine.address,
        abi: VetoMachine.abi,
        functionName: "vote",
        args: [
            checksumAddress(proposalAddress),
            checksumAddress(tcAddress),
            userTCBalance,
        ],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

const vetoWithdraw = async (
    interfaceContext: any,
    proposalAddress: `0x${string}`,
    tcAddress: `0x${string}`,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    if (!contracts) return;
    if (!contracts.VetoMachine) return;
    const VetoMachine = contracts.VetoMachine;

    const { request } = await simulateContract(config, {
        address: VetoMachine.address,
        abi: VetoMachine.abi,
        functionName: "withdraw",
        args: [
            checksumAddress(proposalAddress),
            address,
            checksumAddress(tcAddress),
        ],
        account: address,
    });

    // Send transaction
    const txHash = await writeContract(config, request);

    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

export { vetoVote, vetoWithdraw };
