import settings from "../../settings/settings.json";
import BigNumber from "bignumber.js";

import {
    toContractPrecisionDecimals,
    getGasPrice,
    fromContractPrecisionDecimals,
    getExecutionFee
} from "./utils";
import { redeemTC as redeemTC_, redeemTP as redeemTP_ } from "./moc-core.jsx";

const mintTC = async (
    interfaceContext,
    caIndex,
    qTC,
    limitAmount,
    onTransaction,
    onReceipt
) => {
    // Mint Collateral token with CA coinbase
    const { web3, contractStatusData, userBalanceData, account } =
        interfaceContext;
    const dContracts = window.dContracts;
    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;
    const MoCContract = dContracts.contracts.Moc[caIndex];

    // Verifications
    // User have sufficient reserve to pay?
    console.log(
        `To mint ${qTC} ${
            settings.tokens.TC[caIndex].name
        } you need > ${limitAmount.toString()} ${
            settings.tokens.CA[caIndex].name
        } in your balance`
    );
    const userReserveBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].balance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userReserveBalance))
        throw new Error(
            `Insufficient ${settings.tokens.CA[caIndex].name} balance`
        );

    // Allowance    reserveAllowance
    console.log(
        `Allowance: To mint ${qTC} ${
            settings.tokens.TC[caIndex].name
        } you need > ${limitAmount.toString()} ${
            settings.tokens.CA[caIndex].name
        } in your spendable balance`
    );
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

    let valueToSend = new BigNumber(await getExecutionFee(web3, contractStatusData[caIndex].tcMintExecCost, 0)).plus(limitAmount)

    valueToSend = toContractPrecisionDecimals(
        valueToSend,
        settings.tokens.CA[caIndex].decimals
    );

    // Calculate estimate gas cost
    const estimateGas = await MoCContract.methods
        .mintTC(
            toContractPrecisionDecimals(
                new BigNumber(qTC),
                settings.tokens.TC[caIndex].decimals
            ),
            account,
            vendorAddress
        )
        .estimateGas({ from: account, value: valueToSend });

    const receipt = MoCContract.methods
        .mintTC(
            toContractPrecisionDecimals(
                new BigNumber(qTC),
                settings.tokens.TC[caIndex].decimals
            ),
            account,
            vendorAddress
        )
        .send({
            from: account,
            value: valueToSend,
            gasPrice: await getGasPrice(web3),
            gas: estimateGas,
            gasLimit: estimateGas,
        })
        .on("transactionHash", onTransaction)
        .on("receipt", onReceipt);

    return receipt;
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
    // Mint pegged token with collateral coinbase
    const { web3, contractStatusData, userBalanceData, account } =
        interfaceContext;
    const dContracts = window.dContracts;
    const vendorAddress = import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS;
    const MoCContract = dContracts.contracts.Moc[caIndex];
    const tpAddress = dContracts.contracts.TP[tpIndex].options.address;
    console.log("tpAddress", tpAddress);
    console.log("contractStatusData", contractStatusData);
    console.log("vendor address is ", vendorAddress);
    // Verifications

    // User have sufficient reserve to pay?
    console.log(
        `To mint ${qTP} ${
            settings.tokens.TP[tpIndex].name
        } you need > ${limitAmount.toString()} ${
            settings.tokens.CA[caIndex].name
        } in your balance`
    );
    const userReserveBalance = new BigNumber(
        fromContractPrecisionDecimals(
            userBalanceData.CA[caIndex].balance,
            settings.tokens.CA[caIndex].decimals
        )
    );
    if (limitAmount.gt(userReserveBalance))
        throw new Error(
            `Insufficient ${settings.tokens.CA[caIndex].name} balance`
        );

    // Allowance
    console.log(
        `Allowance: To mint ${qTP} ${
            settings.tokens.TP[tpIndex].name
        } you need > ${limitAmount.toString()} ${
            settings.tokens.CA[caIndex].name
        } in your spendable balance`
    );
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
    const tpAvailableToMint = new BigNumber(
        fromContractPrecisionDecimals(
            contractStatusData[caIndex].getTPAvailableToMint[tpIndex],
            settings.tokens.TP[tpIndex].decimals
        )
    );

    if (new BigNumber(qTP).gt(tpAvailableToMint))
        throw new Error(
            `Insufficient ${settings.tokens.TP[tpIndex].name} available to mint`
        );

    let valueToSend = new BigNumber(await getExecutionFee(web3, contractStatusData[caIndex].tpMintExecCost, 0)).plus(limitAmount)


    valueToSend = toContractPrecisionDecimals(
        valueToSend,
        settings.tokens.CA[caIndex].decimals
    );

    // Calculate estimate gas cost
    const estimateGas = await MoCContract.methods
        .mintTP(
            tpAddress,
            toContractPrecisionDecimals(
                new BigNumber(qTP),
                settings.tokens.TP[tpIndex].decimals
            ),
            account,
            vendorAddress
        )
        .estimateGas({ from: account, value: valueToSend });

    // Send tx
    const receipt = MoCContract.methods
        .mintTP(
            tpAddress,
            toContractPrecisionDecimals(
                new BigNumber(qTP),
                settings.tokens.TP[tpIndex].decimals
            ),
            account,
            vendorAddress
        )
        .send({
            from: account,
            value: valueToSend,
            gasPrice: await getGasPrice(web3),
            gas: estimateGas,
            gasLimit: estimateGas,
        })
        .on("transactionHash", onTransaction)
        .on("receipt", onReceipt);

    return receipt;
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
