import { useMemo } from 'react'

import type {
    ContractInfo,
    DContracts,
    MultiCallInput,
} from "../types/hooks";
import { useMultiCall } from './useMulticall'

/**
 * Custom hook to fetch and keep updated the proposal count from the VotingMachine contract.
 * If the contract env var is not defined, it skips execution and returns undefined.
 */

export function useProposalCount(
 contracts?: DContracts, 
 refetchInterval = 60_000
) {

  const callsRequests = useMemo(() => {
    if (!contracts) return []
    const callRequest: MultiCallInput[] = [];

    if (typeof contracts.IRegistry !== "undefined") {
      callRequest.push({
                contract: contracts.VotingMachine as ContractInfo,
                functionName: 'getProposalCount',
                args: [],
                resultType: "uint256",
                keys: ["votingMachine", "getProposalCount"]
        });
        
      callRequest.push({
                contract: contracts.VotingMachine as ContractInfo,
                functionName: 'getProposalsLength',
                args: [],
                resultType: "uint256",
                keys: ["votingMachine", "getProposalsLength"]
        });
     }

      return callRequest
    }, [contracts])

    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
      refetchInterval: refetchInterval,
      enabled: callsRequests.length > 0,
      scopeKey: ["proposalCount"].join(":"),
    })
  
    return multicallState
  }
