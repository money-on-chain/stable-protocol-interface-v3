import { useBalance } from "wagmi";

import type { UseBaseCoinBalanceResult } from "../types/status";

export function useBaseCoinBalance(
    address?: `0x${string}`,
    refetchInterval = 15_000
): UseBaseCoinBalanceResult {
    const { data, isLoading, isFetching, error, refetch } = useBalance({
        address,
        query: {
            refetchInterval,
            enabled: !!address,
        },
    });

    return {
        balance: data?.value,
        formatted: data?.formatted,
        symbol: data?.symbol,
        isLoading,
        isFetching,
        error,
        refetch: () => {
            refetch().catch(console.error);
        },
    };
}
