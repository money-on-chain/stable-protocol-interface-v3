import { useMemo } from 'react'
import { useMultiCall } from "./useMulticall";


/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useUserOmocBalance(contracts?: any, userAddress?: string, refetchInterval = 30_000) {
    const callsRequests = useMemo(() => {
        if (!contracts) return []
        if (!userAddress) return []
                
        const callRequest = []        
                

        if (typeof contracts.DelayMachine !== "undefined") {

            callRequest.push({
                contract: contracts.DelayMachine,
                functionName: 'getTransactions',
                args: [userAddress],
                resultType: [
                    { type: "uint256[]", name: "ids" },
                    { type: "uint256[]", name: "amounts" },
                    { type: "uint256[]", name: "expirations" },
                ] as any,
                keys: ["delaymachine", "getTransactions"]
            });

            callRequest.push({
                contract: contracts.DelayMachine,
                functionName: 'getBalance',
                args: [userAddress],
                resultType: "uint256" as any,
                keys: ["delaymachine", "getBalance"]
            });

        }

        if (typeof contracts.TG !== "undefined") {
            callRequest.push({
                contract: contracts.TG,
                functionName: 'balanceOf',
                args: [userAddress],
                resultType: "uint256" as any,
                keys: ["TG", "balance"]
            });

            callRequest.push({
                contract: contracts.TG,
                functionName: 'allowance',
                args: [userAddress, contracts.StakingMachine.address],
                resultType: "uint256" as any,
                keys: ["stakingmachine", "tgAllowance"]
            });

        }

        if (typeof contracts.VotingMachine !== "undefined") {

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getUserVote',
                args: [userAddress],
                resultType: [
                    { type: "address", name: "voteAddress" },
                    { type: "uint256", name: "voteRound" },
                ] as any,
                keys: ["votingmachine", "getUserVote"]
            });

        }

        if (typeof contracts.StakingMachine !== "undefined") {
                        
            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getBalance',
                args: [userAddress],
                resultType: "uint256" as any,
                keys: ["stakingmachine", "getBalance"]                
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getLockedBalance',
                args: [userAddress],
                resultType: "uint256" as any,
                keys: ["stakingmachine", "getLockedBalance"]
            });            

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getLockingInfo',
                args: [userAddress],
                resultType: [
                    { type: "uint256", name: "amount" },
                    { type: "uint256", name: "untilTimestamp" },
                ] as any,
                keys: ["stakingmachine", "getLockingInfo"]
            });        
            
        }
        // Incentive V2
        if (contracts.IncentiveV2.address) {

            callRequest.push({
                contract: contracts.TG,
                functionName: 'balanceOf',
                args: [contracts.IncentiveV2.address],
                resultType: "uint256" as any,
                keys: ["incentiveV2", "contractBalance"]
            });

            callRequest.push({
                contract: contracts.IncentiveV2,
                functionName: 'get_balance',
                args: [userAddress],
                resultType: "uint256" as any,
                keys: ["incentiveV2", "userBalance"]
            });            
        }             

        return callRequest

    }, [contracts, userAddress])

      
    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
      refetchInterval: refetchInterval,
      enabled: callsRequests.length > 0,
      scopeKey: ['userOmocBalance', userAddress].join(':')  
    })
  
    return multicallState
  }
