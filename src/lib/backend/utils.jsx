import BigNumber from "bignumber.js";
import Web3 from "web3";

BigNumber.config({
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    FORMAT: { decimalSeparator: ".", groupSeparator: "," },
});

const getGasPrice = async (web3) => {
    try {
        const gasPrice = await web3.eth.getGasPrice();
        //gasPrice = web3.utils.fromWei(gasPrice);
        return gasPrice;
    } catch (e) {
        console.log(e);
    }
};

const getNetworkFromProject = () => {
    let network
    switch (import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT.toLowerCase()) {
        case "flipmoney":
            network = "rsk"
            break;
        case "stablex":
            network = "arbitrum"
            break;
        default:
            network = "rsk"
    }
    return network;
}


const getExecutionFee = async (web3, execCost, slippage) => {
    //const lastBlock = await web3.eth.getBlock("latest")

    const lastBlock = await web3.currentProvider.request({
        method: "eth_getBlockByNumber",
        params: ["latest", false]
    });

    let latestBaseFee
    if (getNetworkFromProject()==="rsk") {
        latestBaseFee = lastBlock.minimumGasPrice
    } else {
        latestBaseFee = lastBlock.baseFeePerGas
    }

    const execFee = new BigNumber(latestBaseFee)
        .times(new BigNumber(execCost))
        .times(new BigNumber(1 + slippage / 100));

    //const execFee = BigInt(execCost) * BigInt(latestBaseFee) * 1.01//BigInt( 1 + slippage / 100)
    //console.log(`Using Base Fee: ${latestBaseFee} * slippage ${slippage.toString()} % = ${execFee.toString()}`)
    return execFee;
}


const toContractPrecision = (amount) => {
    return Web3.utils.toWei(
        BigNumber(amount).toFormat(18, BigNumber.ROUND_DOWN),
        "ether"
    );
};

const toContractPrecisionDecimals = (amount, decimals) => {
    const result = new BigNumber(
        amount.toFormat(decimals, BigNumber.ROUND_DOWN)
    )
        .times(precision(decimals))
        .toFixed(0);
    return result;
};

const precision = (contractDecimals) =>
    new BigNumber(10).exponentiatedBy(contractDecimals);

const fromContractPrecisionDecimals = (amount, decimals) => {
    return new BigNumber(amount).div(precision(decimals));
};

export {
    getGasPrice,
    toContractPrecision,
    toContractPrecisionDecimals,
    fromContractPrecisionDecimals,
    getExecutionFee,
    getNetworkFromProject
};
