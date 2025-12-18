import type { PublicClient } from "viem";

function toBigIntOrZero(v: unknown): bigint {
    if (typeof v === "bigint") return v;
    if (typeof v === "string") {
        try {
            return BigInt(v);
        } catch {
            return 0n;
        }
    }
    return 0n;
}

async function getLatestGasBase(publicClient: PublicClient): Promise<bigint> {
    const block = await publicClient.getBlock({ blockTag: "latest" });

    // safe access, without assuming shape
    const blockAny = block as Record<string, unknown>;

    if ("baseFeePerGas" in blockAny) {
        const baseFee = toBigIntOrZero(blockAny.baseFeePerGas);
        if (baseFee > 0n) return baseFee;
    }

    if ("minimumGasPrice" in blockAny) {
        const minGas = toBigIntOrZero(blockAny.minimumGasPrice);
        if (minGas > 0n) return minGas;
    }

    // fallback explicit
    return 0n;
}

const getExecutionFee = async (
    publicClient: PublicClient,
    execCost: bigint,
    slippage: number
): Promise<bigint> => {
    const gasBase = await getLatestGasBase(publicClient);

    const multiplier = Math.floor((1 + slippage / 100) * 1_000_000);
    const multiplierBigInt = BigInt(multiplier);

    return (execCost * gasBase * multiplierBigInt) / 1_000_000n;
};

export { getExecutionFee };
