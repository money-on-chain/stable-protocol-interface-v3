import { useMemo } from 'react'
import { useMultiCall } from "./useMulticall";
import VestingMachine from "../contracts/omoc/VestingMachine.json";


/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useUserVesting(contracts?: any, userAddress?: string, userVestingAddress?: string, refetchInterval = 30_000) {
    const callsRequests = useMemo(() => {
        if (!contracts) return []
        if (!userAddress) return []
        if (!userVestingAddress) return []

        const vestingMachine = {
            address: userVestingAddress,
            abi: VestingMachine.abi,
            name: 'VestingMachine',
            type: ''
        }
                
        const callRequest = []        
        
        if ( 
            typeof contracts.VestingFactory !== "undefined" &&
            typeof contracts.TG !== "undefined" &&
            typeof contracts.StakingMachine !== "undefined" &&
            typeof contracts.DelayMachine !== "undefined"            
            ) {

            callRequest.push({
                contract: contracts.VestingFactory,
                functionName: 'isTGEConfigured',
                args: [],
                resultType: "bool",
                keys: ["vestingfactory", "isTGEConfigured"]
            });

            callRequest.push({
                contract: contracts.VestingFactory,
                functionName: 'getTGETimestamp',
                args: [],
                resultType: "uint256",
                keys: ["vestingfactory", "getTGETimestamp"]
            });
            
            callRequest.push({
                contract: vestingMachine,
                functionName: 'getParameters',
                args: [],
                resultType: [
                    { type: "uint256[]", name: "percentages" },
                    { type: "uint256[]", name: "timeDeltas" },
                ],
                keys: ["vestingmachine", "getParameters"]
            });
                        
            callRequest.push({
                contract: vestingMachine,
                functionName: 'getHolder',
                args: [],
                resultType: "address",
                keys: ["vestingmachine", "getHolder"]
            });
            
            callRequest.push({
                contract: vestingMachine,
                functionName: 'getLocked',
                args: [],
                resultType: "uint256",
                keys: ["vestingmachine", "getLocked"]
            });

            callRequest.push({
                contract: vestingMachine,
                functionName: 'getAvailable',
                args: [],
                resultType: "uint256",
                keys: ["vestingmachine", "getAvailable"]
            });
            
            callRequest.push({
                contract: vestingMachine,
                functionName: 'isVerified',
                args: [],
                resultType: "bool",
                keys: ["vestingmachine", "isVerified"]
            });
            
            callRequest.push({
                contract: vestingMachine,
                functionName: 'getTotal',
                args: [],
                resultType: "uint256",
                keys: ["vestingmachine", "getTotal"]
            });
            
            callRequest.push({
                contract: contracts.TG,
                functionName: 'balanceOf',
                args: [vestingMachine.address],
                resultType: "uint256",
                keys: ["vestingmachine", "tgBalance"]
            });

            callRequest.push({
                contract: contracts.TG,
                functionName: 'allowance',
                args: [userAddress, vestingMachine.address],
                resultType: "uint256",
                keys: ["vestingmachine", "tgAllowance"]
            });
            
            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getBalance',
                args: [vestingMachine.address],
                resultType: "uint256",
                keys: ["vestingmachine", "staking", "balance"]
            });
            callRequest.push({
                contract: contracts.TG,
                functionName: 'allowance',
                args: [vestingMachine.address, contracts.StakingMachine.address],
                resultType: "uint256",
                keys: ["vestingmachine", "staking", "allowance"]
            });

            callRequest.push({
                contract: contracts.DelayMachine, 
                functionName: 'getBalance', 
                args: [vestingMachine.address], 
                resultType: "uint256", 
                keys: ["vestingmachine", "delay", "balance"]
            })

            callRequest.push({
                contract: contracts.TG,
                functionName: 'allowance',
                args: [vestingMachine.address, contracts.DelayMachine.address],
                resultType: "uint256",
                keys: ["vestingmachine", "delay", "allowance"]
            });
            
            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getBalance',
                args: [vestingMachine.address],
                resultType: "uint256",
                keys: ["vestingmachine", "staking", "getBalance"]
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getLockedBalance',
                args: [vestingMachine.address],
                resultType: "uint256",
                keys: ["vestingmachine", "staking", "getLockedBalance"]
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getLockingInfo',
                args: [vestingMachine.address],
                resultType: [
                    { type: "uint256", name: "amount" },
                    { type: "uint256", name: "untilTimestamp" },
                ],
                keys: ["vestingmachine", "staking", "getLockingInfo"]
            });

            callRequest.push({
                contract: contracts.DelayMachine,
                functionName: 'getTransactions',
                args: [vestingMachine.address],
                resultType: [
                    { type: "uint256[]", name: "ids" },
                    { type: "uint256[]", name: "amounts" },
                    { type: "uint256[]", name: "expirations" },
                ],
                keys: ["vestingmachine", "delay", "getTransactions"]
            });

            callRequest.push({
                contract: contracts.DelayMachine,
                functionName: 'getBalance',
                args: [vestingMachine.address],
                resultType: "uint256",
                keys: ["vestingmachine", "delay", "getBalance"]
            });
            
        }

        return callRequest

    }, [contracts, userAddress, userVestingAddress])

      
    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
      refetchInterval: refetchInterval,
      enabled: callsRequests.length > 0,
      scopeKey: ['userVesting', userAddress, userVestingAddress].join(':')
    })
  
    return multicallState
  }
