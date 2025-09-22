import { useBalance } from "wagmi";

export interface UseBaseCoinBalanceReturn {
    balance: bigint | undefined;
    formatted: string | undefined;
    symbol: string | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useBaseCoinBalance(
    address?: `0x${string}`,
    refetchInterval = 15_000
): UseBaseCoinBalanceReturn {
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
