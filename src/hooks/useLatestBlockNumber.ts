import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { getBlockNumber } from "viem/actions";

/**
 * Custom hook to keep track of the latest block number from the chain.
 * Updates automatically every `refetchInterval` milliseconds.
 */
export function useLatestBlockNumber(
    publicClient: PublicClient | undefined,
    refetchInterval = 10_000
) {
    const {
        data: blockNumber,
        isLoading,
        isFetching,
        refetch,
        error,
    } = useQuery({
        queryKey: ["latestBlockNumber"],
        queryFn: () => {
            if (!publicClient) throw new Error("Public client not available");
            return getBlockNumber(publicClient);
        },
        refetchInterval, // default: 10 seconds
        enabled: !!publicClient,
    });

    return { blockNumber, isLoading, isFetching, refetch, error };
}
