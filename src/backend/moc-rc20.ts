import {
    mintTC as mintTC_,
    mintTP as mintTP_,
    redeemTC as redeemTC_,
    redeemTP as redeemTP_,
} from "./moc-core";


type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;

const mintTC = async (
    interfaceContext: any,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
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
    interfaceContext: any,
    caIndex: number,
    qTC: bigint,
    limitAmount: bigint,
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
    interfaceContext: any,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
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
    interfaceContext: any,
    caIndex: number,
    tpIndex: number,
    qTP: bigint,
    limitAmount: bigint,
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

export { mintTC, mintTP, redeemTC, redeemTP };
