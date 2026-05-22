import {
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
} from "@wagmi/core";
import { type Abi, type TransactionReceipt } from "viem";

import settings from "../settings/settings.json";
import type { TokenConfig } from "../types/hooks";
import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../types/wallets";
import { config } from "../wagmiConfig";
import { getExecutionFee, SLIPPAGE_EXECUTION } from "./utils";

const mintTC = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);
    const { address, contractProtocolStatus, userBalance, vendorAddress } =
        context;

    if (!userBalance.data.CA) throw new Error("CA not found");

    const userReserveBalance = userBalance.data.CA[caIndex].balance;

    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "mintTC",
        [qTC, limitAmount, address, vendorAddress] as const,
        contractProtocolStatus.data[caIndex].tcMintExecCost,
        SLIPPAGE_EXECUTION
    );
};

const redeemTC = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);
    const { address, contractProtocolStatus, userBalance, vendorAddress } =
        context;

    if (limitAmount === 0n)
        throw new Error(
            "limitAmount must be > 0 — a zero minimum would accept receiving nothing"
        );

    if (!userBalance.data[caIndex])
        throw new Error(`Bucket index not found for ${caIndex}`);

    const userTCBalance = userBalance.data[caIndex].TC.balance;
    if (qTC > userTCBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as TokenConfig).name} user balance`
        );

    // There are sufficient TC in the contracts to redeem?
    const tcAvailableToRedeem =
        contractProtocolStatus.data[caIndex].getTCAvailableToRedeem;
    if (qTC > tcAvailableToRedeem)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as TokenConfig).name}available to redeem in contract`
        );

    // There are sufficient CA in the contract
    const caBalance = contractProtocolStatus.data[caIndex].getACBalance;
    if (limitAmount > caBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as TokenConfig).name}`
        );

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "redeemTC",
        [qTC, limitAmount, address, vendorAddress] as const,
        contractProtocolStatus.data[caIndex].tcRedeemExecCost,
        SLIPPAGE_EXECUTION
    );
};

const mintTP = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);
    const {
        contracts,
        address,
        contractProtocolStatus,
        userBalance,
        vendorAddress,
    } = context;

    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[tpIndex]) throw new Error(`TP not found for ${tpIndex}`);
    if (!userBalance.data.CA) throw new Error("CA not found");

    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications
    // User have sufficient reserve to pay?
    /*console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );*/
    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    /*console.log(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );*/
    /*
    const userSpendableBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].allowance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userSpendableBalance))
        throw new Error(
            'Insufficient spendable balance... please make an allowance to the MoC contract'
        );

     */

    // There are sufficient PEGGED in the contracts to mint?
    const tpAvailableToMint =
        contractProtocolStatus.data[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "mintTP",
        [tpAddress, qTP, limitAmount, address, vendorAddress] as const,
        contractProtocolStatus.data[caIndex].tpMintExecCost,
        SLIPPAGE_EXECUTION
    );
};

const redeemTP = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);
    const {
        contracts,
        address,
        contractProtocolStatus,
        userBalance,
        vendorAddress,
    } = context;

    if (limitAmount === 0n)
        throw new Error(
            "limitAmount must be > 0 — a zero minimum would accept receiving nothing"
        );

    // Verifications
    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[tpIndex]) throw new Error(`TP not found for ${tpIndex}`);
    if (!userBalance.data.TP) throw new Error("TP not found");

    const tpAddress = contracts.TP[tpIndex].address;

    // User have sufficient PEGGED Token in balance?
    /*console.log(
        `Redeeming ${qTP} ${(settings.tokens.TP[tpIndex] as TokenConfig).name} ... getting approx: ${limitAmount} ${(settings.tokens.CA[caIndex] as TokenConfig).name}... `
    );*/
    const userTPBalance = userBalance.data.TP[caIndex][tpIndex].balance;
    if (qTP > userTPBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name}  user balance`
        );

    // // There are sufficient Free Pegged Token in the contracts to redeem?
    // const tpAvailableToRedeem = new BigNumber(
    //     Web3.utils.fromWei(contractStatusData.getTPAvailableToMint[tpIndex])
    // );
    // if (new BigNumber(qTP).gt(tpAvailableToRedeem))
    //     throw new Error(
    //         `Insufficient ${settings.tokens.TP[tpIndex].name}  available to redeem in contract`
    //     );

    // There are sufficient CA in the contract
    const caBalance = contractProtocolStatus.data[caIndex].getACBalance;
    if (limitAmount > caBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as TokenConfig).name}`
        );

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "redeemTP",
        [tpAddress, qTP, limitAmount, address, vendorAddress] as const,
        contractProtocolStatus.data[caIndex].tpRedeemExecCost,
        SLIPPAGE_EXECUTION
    );
};

const swapTPforTP = async (
    interfaceContext: InterfaceContext,
    iFromTP: number,
    iToTP: number,
    qTP: bigint,
    caIndex: number,
    limitAmount: bigint,
    qAssetMaxFees: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);

    const {
        contracts,
        address,
        contractProtocolStatus,
        userBalance,
        vendorAddress,
    } = context;

    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[iFromTP]) throw new Error(`TP not found for ${iFromTP}`);
    if (!contracts.TP[iToTP]) throw new Error(`TP not found for ${iToTP}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!userBalance.data.CA) throw new Error("CA not found");

    const tpAddressFrom = contracts.TP[iFromTP].address;
    const tpAddressTo = contracts.TP[iToTP].address;

    // Verifications
    // User have sufficient reserve to pay?
    /*console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );*/

    /*
    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    /*console.log(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );*/
    /*
    const userSpendableBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].allowance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userSpendableBalance))
        throw new Error(
            'Insufficient spendable balance... please make an allowance to the MoC contract'
        );

     */

    // There are sufficient PEGGED in the contracts to mint?
    /*const tpAvailableToMint =
        contractProtocolStatus.data[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );*/

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "swapTPforTP",
        [
            tpAddressFrom,
            tpAddressTo,
            qTP,
            limitAmount,
            qAssetMaxFees,
            address,
            vendorAddress,
        ] as const,
        contractProtocolStatus.data[caIndex].swapTPforTPExecCost,
        SLIPPAGE_EXECUTION
    );
};

const swapTCforTP = async (
    interfaceContext: InterfaceContext,
    tpIndex: number,
    qTC: bigint,
    caIndex: number,
    limitAmount: bigint,
    qAssetMaxFees: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);

    const {
        contracts,
        address,
        contractProtocolStatus,
        userBalance,
        vendorAddress,
    } = context;

    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[tpIndex]) throw new Error(`TP not found for ${tpIndex}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!userBalance.data.CA) throw new Error("CA not found");

    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications
    // User have sufficient reserve to pay?
    /*console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );*/

    /*
    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    /*console.log(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );*/
    /*
    const userSpendableBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].allowance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userSpendableBalance))
        throw new Error(
            'Insufficient spendable balance... please make an allowance to the MoC contract'
        );

     */

    // There are sufficient PEGGED in the contracts to mint?
    /*const tpAvailableToMint =
        contractProtocolStatus.data[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );*/

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "swapTCforTP",
        [
            tpAddress,
            qTC,
            limitAmount,
            qAssetMaxFees,
            address,
            vendorAddress,
        ] as const,
        contractProtocolStatus.data[caIndex].swapTCforTPExecCost,
        SLIPPAGE_EXECUTION
    );
};

const swapTPforTC = async (
    interfaceContext: InterfaceContext,
    tpIndex: number,
    qTP: bigint,
    caIndex: number,
    limitAmount: bigint,
    qAssetMaxFees: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);

    const {
        contracts,
        address,
        contractProtocolStatus,
        userBalance,
        vendorAddress,
    } = context;

    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[tpIndex]) throw new Error(`TP not found for ${tpIndex}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!userBalance.data.CA) throw new Error("CA not found");

    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications
    // User have sufficient reserve to pay?
    /*console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );*/

    /*
    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    /*console.log(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );*/
    /*
    const userSpendableBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].allowance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userSpendableBalance))
        throw new Error(
            'Insufficient spendable balance... please make an allowance to the MoC contract'
        );

     */

    // There are sufficient PEGGED in the contracts to mint?
    /*const tpAvailableToMint =
        contractProtocolStatus.data[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );*/

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "swapTPforTC",
        [
            tpAddress,
            qTP,
            limitAmount,
            qAssetMaxFees,
            address,
            vendorAddress,
        ] as const,
        contractProtocolStatus.data[caIndex].swapTPforTCExecCost,
        SLIPPAGE_EXECUTION
    );
};

const mintTCandTP = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);
    const {
        contracts,
        address,
        contractProtocolStatus,
        userBalance,
        vendorAddress,
    } = context;

    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[tpIndex]) throw new Error(`TP not found for ${tpIndex}`);
    if (!userBalance.data.CA) throw new Error("CA not found");

    const tpAddress = contracts.TP[tpIndex].address;

    // Verifications
    // User have sufficient reserve to pay?
    /*console.log(
        `To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your balance`
    );*/
    const userReserveBalance = userBalance.data.CA[caIndex].balance;
    if (limitAmount > userReserveBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} balance`
        );

    // Allowance
    /*console.log(
        `Allowance: To mint ${qTP} ${
            (settings.tokens.TP[tpIndex] as TokenConfig).name
        } you need > ${limitAmount.toString()} ${
            (settings.tokens.CA[caIndex] as TokenConfig).name
        } in your spendable balance`
    );*/
    /*
    const userSpendableBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].allowance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userSpendableBalance))
        throw new Error(
            'Insufficient spendable balance... please make an allowance to the MoC contract'
        );

     */

    // There are sufficient PEGGED in the contracts to mint?
    /*const tpAvailableToMint =
        contractProtocolStatus.data[caIndex].getTPAvailableToMint[tpIndex];

    if (qTP > tpAvailableToMint)
        throw new Error(
            `Insufficient ${(settings.tokens.TP[tpIndex] as TokenConfig).name} available to mint`
        );*/

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "mintTCandTP",
        [tpAddress, qTP, limitAmount, address, vendorAddress] as const,
        contractProtocolStatus.data[caIndex].mintTCandTPExecCost,
        SLIPPAGE_EXECUTION
    );
};

const redeemTCandTP = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    tpIndex: number,
    qTC: bigint,
    qTP: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    const context = coreOpContext(caIndex, interfaceContext);
    const {
        contracts,
        address,
        contractProtocolStatus,
        userBalance,
        vendorAddress,
    } = context;

    if (limitAmount === 0n)
        throw new Error(
            "limitAmount must be > 0 — a zero minimum would accept receiving nothing"
        );

    if (!contracts.TP) throw new Error("TP not found");
    if (!contracts.TP[tpIndex]) throw new Error(`TP not found for ${tpIndex}`);
    if (!userBalance.data.CA) throw new Error("CA not found");

    const tpAddress = contracts.TP[tpIndex].address;

    if (!userBalance.data[caIndex])
        throw new Error(`Bucket index not found for ${caIndex}`);

    const userTCBalance = userBalance.data[caIndex].TC.balance;
    if (qTC > userTCBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as TokenConfig).name} user balance`
        );

    // There are sufficient TC in the contracts to redeem?
    /*const tcAvailableToRedeem =
        contractProtocolStatus.data[caIndex].getTCAvailableToRedeem;
    if (qTC > tcAvailableToRedeem)
        throw new Error(
            `Insufficient ${(settings.tokens.TC[caIndex] as TokenConfig).name}available to redeem in contract`
        );*/

    // There are sufficient CA in the contract
    const caBalance = contractProtocolStatus.data[caIndex].getACBalance;
    if (limitAmount > caBalance)
        throw new Error(
            `Insufficient ${(settings.tokens.CA[caIndex] as TokenConfig).name} in the contract. Balance: ${caBalance} ${(settings.tokens.CA[caIndex] as TokenConfig).name}`
        );

    return await sendWithExecFee(
        context,
        caIndex,
        onTransaction,
        onReceipt,
        "redeemTCandTP",
        [tpAddress, qTC, qTP, limitAmount, address, vendorAddress] as const,
        contractProtocolStatus.data[caIndex].redeemTCandTPExecCost,
        SLIPPAGE_EXECUTION
    );
};

interface CoreOpContext
    extends Omit<InterfaceContext, "contracts" | "address"> {
    vendorAddress: string;
    mocContract: NonNullable<NonNullable<InterfaceContext["contracts"]>["Moc"]>[number];
    contracts: NonNullable<InterfaceContext["contracts"]>;
    address: NonNullable<InterfaceContext["address"]>;
    publicClient: NonNullable<InterfaceContext["publicClient"]>;
}
const coreOpContext = (
    caIndex: number,
    interfaceContext: InterfaceContext
): CoreOpContext => {
    const {
        address,
        contracts,
        contractProtocolStatus,
        userBalance,
        publicClient,
    } = interfaceContext;

    const vendorAddress = (import.meta.env
        .REACT_APP_ENVIRONMENT_VENDOR_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;

    if (!address) throw new Error("Address not found");
    if (!publicClient) throw new Error("Public client not found");
    if (!contracts) throw new Error("Contracts not found");
    if (!contracts.Moc) throw new Error("Moc not found");
    if (!contracts.Moc[caIndex])
        throw new Error(`Moc not found for ${caIndex}`);
    if (!userBalance.data) throw new Error("User balance not found");
    if (!contractProtocolStatus.data)
        throw new Error("Contract protocol status not found");
    if (!contractProtocolStatus.data[caIndex])
        throw new Error("Contract protocol status not found");

    return {
        ...interfaceContext,
        contracts,
        address,
        publicClient,
        mocContract: contracts.Moc[caIndex],
        vendorAddress,
    };
};

const sendWithExecFee = async (
    context: CoreOpContext,
    caIndex: number,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt,
    functionName: string,
    args: readonly unknown[],
    execCost: bigint,
    execFeeSlippage: number
): Promise<TransactionReceipt | undefined> => {
    const { address, publicClient, mocContract, contractProtocolStatus } = context;

    const configParams: {
        address: `0x${string}`;
        abi: Abi;
        functionName: string;
        args: readonly unknown[];
        account: CoreOpContext["address"];
        value?: bigint;
    } = {
        address: mocContract.address,
        abi: mocContract.abi as Abi,
        functionName,
        args,
        account: address,
    };

    const totalExecCost =
        execCost + contractProtocolStatus.data[caIndex].priceUpdatesCost;

    const executionFee = await getExecutionFee(
        publicClient,
        totalExecCost,
        execFeeSlippage
    );

    configParams.value = executionFee;

    // Simulating the contract on hardhat nodes will always fail because
    // basefee is set to 0 for simulating and calls, but not for sends and execution.
    // We assume all transports in 127.0.0.1 or localhost to be hardhat, and we
    // simulate with a 0 executionFee. Hopefully we can remove this check in the future.
    try {
        const host = new URL(
            String(
                (
                    publicClient.transport.transports as Array<{
                        value?: { url?: string };
                    }>
                )[0]?.value?.url ?? ""
            )
        ).hostname;
        if (host == "localhost" || host == "127.0.0.1") {
            const clientVersion = await publicClient.request({
                method: "web3_clientVersion",
            });
            if (clientVersion.toLowerCase().includes("hardhat")) {
                configParams.value = 0n;
            }
        }
    } catch {
        // Any exception here means we're not dealing with a local hardhat node.
    }

    const { request } = await simulateContract(config, configParams);

    // We may have simulated a request with a 0 execution fee
    // if we're dealing with a local hardhat node.
    // So we need to make sure the request has the execution fee as its value.
    if (executionFee > 0n) {
        request.value = executionFee;
    }

    // Send transaction
    const txHash = await writeContract(config, request);
    if (onTransaction) onTransaction(txHash);

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });

    if (onReceipt) onReceipt(receipt);

    return receipt;
};

export {
    mintTC,
    mintTCandTP,
    mintTP,
    redeemTC,
    redeemTCandTP,
    redeemTP,
    swapTCforTP,
    swapTPforTC,
    swapTPforTP,
};
