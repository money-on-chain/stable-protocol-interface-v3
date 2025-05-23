import {
    mintTC as mintTC_,
    redeemTC as redeemTC_,
    mintTP as mintTP_,
    redeemTP as redeemTP_,
} from "./moc-core.jsx";

const mintTC = async (
    interfaceContext,
    caIndex,
    qTC,
    limitAmount,
    onTransaction,
    onReceipt
) => {
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
    interfaceContext,
    caIndex,
    qTC,
    limitAmount,
    onTransaction,
    onReceipt
) => {
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
    interfaceContext,
    caIndex,
    tpIndex,
    qTP,
    limitAmount,
    onTransaction,
    onReceipt
) => {
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
    interfaceContext,
    caIndex,
    tpIndex,
    qTP,
    limitAmount,
    onTransaction,
    onReceipt
) => {
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
