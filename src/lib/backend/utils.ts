import BigNumber from "bignumber.js";
import Web3 from "web3";

// Type definitions
interface Web3Instance {
    eth: {
        getGasPrice: () => Promise<string>;
    };
    currentProvider: {
        request: (params: { method: string; params: any[] }) => Promise<any>;
    };
}

interface BlockResponse {
    minimumGasPrice?: string;
    baseFeePerGas?: string;
    [key: string]: any;
}

type NetworkType = "rsk" | "arbitrum";

BigNumber.config({
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    FORMAT: { decimalSeparator: ".", groupSeparator: "," },
});

const getGasPrice = async (web3: Web3Instance): Promise<string | undefined> => {
    try {
        const gasPrice = await web3.eth.getGasPrice();
        //gasPrice = web3.utils.fromWei(gasPrice);
        return gasPrice.toString();
    } catch (e) {
        console.log(e);
        return undefined;
    }
};

const getNetworkFromProject = (): NetworkType => {
    let network: NetworkType;
    switch (import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT.toLowerCase()) {
        case "flipmoney":
            network = "rsk";
            break;
        case "stablex":
            network = "arbitrum";
            break;
        default:
            network = "rsk";
    }
    return network;
};

const getExecutionFee = async (
    web3: Web3Instance,
    execCost: string | number,
    slippage: number
): Promise<BigNumber> => {
    //const lastBlock = await web3.eth.getBlock("latest")

    const lastBlock = await web3.currentProvider.request({
        method: "eth_getBlockByNumber",
        params: ["latest", false]
    }) as BlockResponse;

    let latestBaseFee: string;
    if (getNetworkFromProject() === "rsk") {
        latestBaseFee = lastBlock.minimumGasPrice || "0";
    } else {
        latestBaseFee = lastBlock.baseFeePerGas || "0";
    }

    const execFee = new BigNumber(latestBaseFee)
        .times(new BigNumber(execCost))
        .times(new BigNumber(1 + (slippage / 100)));

    //const execFee = BigInt(execCost) * BigInt(latestBaseFee) * 1.01//BigInt( 1 + slippage / 100)
    //console.log(`Using Base Fee: ${latestBaseFee} * slippage ${slippage.toString()} % = ${execFee.toString()}`)
    return execFee;
};

const toContractPrecision = (amount: string | number): string => {
    return Web3.utils.toWei(
        BigNumber(amount).toFormat(18, BigNumber.ROUND_DOWN),
        "ether"
    );
};

const toContractPrecisionDecimals = (amount: BigNumber, decimals: number): string => {
    const result = new BigNumber(
        amount.toFormat(decimals, BigNumber.ROUND_DOWN)
    )
        .times(precision(decimals))
        .toFixed(0);
    return result;
};

const precision = (contractDecimals: number): BigNumber =>
    new BigNumber(10).exponentiatedBy(contractDecimals);

const fromContractPrecisionDecimals = (amount: string | number, decimals: number): BigNumber => {
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
