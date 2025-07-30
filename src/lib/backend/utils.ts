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
    publicClient: any,
    execCost: bigint,
    slippage: number
): Promise<bigint> => {
    //const lastBlock = await web3.eth.getBlock("latest")

    const lastBlock = await publicClient.getBlock({ blockTag: 'latest' });

    let latestBaseFee;
    if (getNetworkFromProject() === "rsk") {
        latestBaseFee = BigInt(lastBlock.minimumGasPrice ?? 0);
    } else {
        latestBaseFee = BigInt(lastBlock.baseFeePerGas ?? 0);
    }
    
    // calculate slippageMultiplier as bigint escalated to 6 decimals
    // Ej: 1.005 → 1005000 / 1000000
    const slippagePercent = typeof slippage === 'number' ? slippage : parseFloat(slippage);
    const multiplier = Math.floor((1 + slippagePercent / 100) * 1_000_000); // escalated 1e6
    const multiplierBigInt = BigInt(multiplier);

    // execFee = execCost * latestBaseFee * slippageMultiplier
    const baseExecFee = execCost * latestBaseFee;
    const execFee = (baseExecFee * multiplierBigInt) / 1_000_000n;

    console.log(`Using Base Fee: ${latestBaseFee.toString()} * slippage ${slippage}% = ${execFee.toString()}`);
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
