import BigNumber from "bignumber.js";
import Web3 from "web3";
import {
    mintTC as mintTC_,
    redeemTC as redeemTC_,
    mintTP as mintTP_,
    redeemTP as redeemTP_,
} from "./moc-core";

// Type definitions
interface InterfaceContext {
    web3: Web3;
    contractStatusData: any[];
    userBalanceData: any;
    account: string;
    [key: string]: any;
}

type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;

const mintTC = async (
    interfaceContext: InterfaceContext,
    caIndex: number,
    qTC: string | number,
    limitAmount: BigNumber,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
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
    qTC: string | number,
    limitAmount: BigNumber,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
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
    qTP: string | number,
    limitAmount: BigNumber,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
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
    qTP: string | number,
    limitAmount: BigNumber,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> => {
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

export { mintTC, redeemTC, mintTP, redeemTP };
