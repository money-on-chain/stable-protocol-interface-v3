import { type TransactionReceipt } from "viem";

import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
} from "../types/wallets";
import {
    mintTC as mintTC_,
    mintTP as mintTP_,
    redeemTC as redeemTC_,
    redeemTP as redeemTP_,
    swapTPforTP as swapTPforTP_,
    swapTCforTP as swapTCforTP_,
    swapTPforTC as swapTPforTC_,
} from "./moc-core";

const mintTC = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<TransactionReceipt | undefined> => {
    // Mint Collateral token with CA support vendors
    return mintTC_(
        interfaceContext,
        caIndex,
        qTC,
        limitAmount,
        onTransaction,
        onReceipt
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
    // Redeem Collateral token receiving CA support vendors
    return redeemTC_(
        interfaceContext,
        caIndex,
        qTC,
        limitAmount,
        onTransaction,
        onReceipt
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
    // Mint pegged token with collateral CA BAG support vendor
    return mintTP_(
        interfaceContext,
        caIndex,
        tpIndex,
        qTP,
        limitAmount,
        onTransaction,
        onReceipt
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
    // Redeem pegged token receiving CA support vendor
    return redeemTP_(
        interfaceContext,
        caIndex,
        tpIndex,
        qTP,
        limitAmount,
        onTransaction,
        onReceipt
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
    // Swap pegged token for another pegged token
    return swapTPforTP_(
        interfaceContext,
        iFromTP,
        iToTP,
        qTP,
        caIndex,
        limitAmount,
        qAssetMaxFees,
        onTransaction,
        onReceipt
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
    // Swap collateral token for pegged token
    return swapTCforTP_(
        interfaceContext,
        tpIndex,
        qTC,
        caIndex,
        limitAmount,
        qAssetMaxFees,
        onTransaction,
        onReceipt
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
    // Swap collateral token for pegged token
    return swapTPforTC_(
        interfaceContext,
        tpIndex,
        qTP,
        caIndex,
        limitAmount,
        qAssetMaxFees,
        onTransaction,
        onReceipt
    );
};

export { mintTC, mintTP, redeemTC, redeemTP, swapTPforTP, swapTCforTP, swapTPforTC };
