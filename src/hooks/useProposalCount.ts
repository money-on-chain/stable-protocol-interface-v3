import { useQuery } from "@tanstack/react-query";
import { readContract } from "viem/actions";
import { usePublicClient } from "wagmi";

import type { ContractInfo, UseProposalCountResult } from "../types/hooks";

/**
 * Custom hook to fetch and keep updated the proposal count from the VotingMachine contract.
 * If the contract env var is not defined, it skips execution and returns undefined.
 */

export function useProposalCount(
    votingMachine: ContractInfo | undefined,
    refetchInterval = 60_000
): UseProposalCountResult {
    const publicClient = usePublicClient();

    const {
        data: proposalCount,
        isLoading,
        isFetching,
        refetch,
        error,
    } = useQuery({
        queryKey: ["proposalCountVoting", votingMachine?.address],
        queryFn: async () => {
            if (!publicClient) throw new Error("Public client not available");
            if (!votingMachine) throw new Error("Voting machine contract not available");
            return await readContract(publicClient, {
                address: votingMachine.address,
                abi: votingMachine.abi,
                functionName: "getProposalCount",
                args: [],
            });
        },
        enabled: typeof import.meta.env.REACT_APP_CONTRACT_IREGISTRY !== "undefined" && !!publicClient && !!votingMachine?.address,
        refetchInterval,
    });

    return { 
        proposalCount: proposalCount as bigint | undefined, 
        isLoading, 
        isFetching, 
        refetch: () => {
            refetch().catch(console.error);
        }, 
        error 
    };
}
