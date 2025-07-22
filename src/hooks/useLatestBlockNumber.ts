import { usePublicClient } from 'wagmi'
import { getBlockNumber } from 'viem/actions'
import { useQuery } from '@tanstack/react-query'

/**
 * Custom hook to keep track of the latest block number from the chain.
 * Updates automatically every `refetchInterval` milliseconds.
 */
export function useLatestBlockNumber(refetchInterval = 10_000) {
  const publicClient = usePublicClient()

  const {
    data: blockNumber,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['latestBlockNumber'],
    queryFn: () => getBlockNumber(publicClient),
    refetchInterval, // default: 10 seconds
    enabled: !!publicClient,
  })

  return { blockNumber, isLoading, isFetching, refetch, error }
}
