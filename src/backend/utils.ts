import type { PublicClient } from "viem";

type NetworkType = "rsk" | "arbitrum";

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
    publicClient: PublicClient,
    execCost: bigint,
    slippage: number
): Promise<bigint> => {
    //const lastBlock = await web3.eth.getBlock("latest")

    const lastBlock = await publicClient.getBlock({ blockTag: "latest" });

    let latestBaseFee: bigint;
    if (getNetworkFromProject() === "rsk") {
        // RSK uses minimumGasPrice instead of baseFeePerGas
        const blockWithMinGasPrice = lastBlock as typeof lastBlock & {
            minimumGasPrice?: bigint | string;
        };
        const minGasPrice = blockWithMinGasPrice.minimumGasPrice;
        latestBaseFee =
            typeof minGasPrice === "bigint"
                ? minGasPrice
                : BigInt(minGasPrice ?? 0);
    } else {
        latestBaseFee = BigInt(lastBlock.baseFeePerGas ?? 0);
    }

    // calculate slippageMultiplier as bigint escalated to 6 decimals
    // Ej: 1.005 → 1005000 / 1000000
    const slippagePercent =
        typeof slippage === "number" ? slippage : parseFloat(slippage);
    const multiplier = Math.floor((1 + slippagePercent / 100) * 1_000_000); // escalated 1e6
    const multiplierBigInt = BigInt(multiplier);

    // execFee = execCost * latestBaseFee * slippageMultiplier
    const baseExecFee = execCost * latestBaseFee;
    const execFee = (baseExecFee * multiplierBigInt) / 1_000_000n;

    /*console.warn(
        `Using Base Fee: ${latestBaseFee.toString()} * slippage ${slippage}% = ${execFee.toString()}`
    );*/
    return execFee;
};

export { getExecutionFee, getNetworkFromProject };
