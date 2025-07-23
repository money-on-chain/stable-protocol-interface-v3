import { useBalance } from 'wagmi'

export function useBaseCoinBalance(
  address?: `0x${string}`,
  refetchInterval = 15_000
) {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useBalance({
    address,
    watch: true,
    refetchInterval,
    enabled: !!address,
  })

  return {
    balance: data?.value,
    formatted: data?.formatted,
    symbol: data?.symbol,
    isLoading,
    isFetching,
    error,
    refetch,
  }
}
