import { usePublicClient } from 'wagmi'
import { readContract } from 'viem/actions'
import { useQuery } from '@tanstack/react-query'

/**
 * Custom hook to fetch and keep updated the proposal count from the VotingMachine contract.
 * If the contract env var is not defined, it skips execution and returns undefined.
 */
export function useProposalCount(
  votingMachine: { address: `0x${string}`; abi: any },
  refetchInterval = 10_000
) {
  const publicClient = usePublicClient()

  // Check for environment variable condition
  if (typeof import.meta.env.REACT_APP_CONTRACT_IREGISTRY === 'undefined') {
    return {
      proposalCount: undefined,
      isLoading: false,
      isFetching: false,
      refetch: () => {},
      error: undefined,
    }
  }

  const {
    data: proposalCount,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['proposalCountVoting', votingMachine?.address],
    queryFn: async () => {
      return await readContract(publicClient, {
        address: votingMachine.address,
        abi: votingMachine.abi,
        functionName: 'getProposalCount',
        args: [],
      })
    },
    enabled: !!publicClient && !!votingMachine?.address,
    refetchInterval,
  })

  return { proposalCount, isLoading, isFetching, refetch, error }
}
