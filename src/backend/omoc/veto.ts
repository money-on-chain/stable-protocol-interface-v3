import { writeContract, simulateContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '../../wagmiConfig';
import { checksumAddress } from 'viem';

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
    const VotingMachine = contracts.VotingMachine;

    const tcAddress = contracts.CollateralToken[caIndex];
    const userTCBalance = userBalance.data[caIndex].TC.balance;

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: 'vote',
        args: [checksumAddress(proposalAddress), checksumAddress(tcAddress), userTCBalance],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt

};

const vetoWithdraw = async (
    interfaceContext: any,
    proposalAddress: `0x${string}`,
    caIndex: number,
    onTransaction: TransactionCallback,
    onReceipt: ReceiptCallback
): Promise<any> => {
    const { address, contracts } = interfaceContext;
    const VotingMachine = contracts.VotingMachine;
    const tcAddress = contracts.CollateralToken[caIndex];

    const { request } = await simulateContract(config, {
        address: VotingMachine.address,
        abi: VotingMachine.abi,
        functionName: 'vote',
        args: [checksumAddress(proposalAddress), address, checksumAddress(tcAddress)],
        account: address,
      })

    // Send transaction
    const txHash = await writeContract(config, request)

    if (onTransaction) onTransaction(txHash)

    const receipt = await waitForTransactionReceipt(config, { hash: txHash })

    if (onReceipt) onReceipt(receipt)

    return receipt

};

export { vetoVote, vetoWithdraw };