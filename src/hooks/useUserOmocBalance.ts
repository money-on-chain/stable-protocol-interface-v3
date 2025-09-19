import { useMemo } from 'react'

import type { Address, CallRequest,DContracts } from './types'
import { useMultiCall } from './useMulticall'

/**
 * React hook that wraps useMultiCall to fetch user OMoC balances/status.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useUserOmocBalance(
  contracts?: DContracts | null,
  userAddress?: Address,
  refetchInterval = 30_000
) {
  const callsRequests: CallRequest[] = useMemo(() => {
    if (!contracts) return []
    if (!userAddress) return []

    const c = contracts
    const calls: CallRequest[] = []

    // ---- DelayMachine (optional) ----
    if (c.DelayMachine) {
      calls.push({
        contract: c.DelayMachine,
        functionName: 'getTransactions',
        args: [userAddress],
        resultType: [
          { type: 'uint256[]', name: 'ids' },
          { type: 'uint256[]', name: 'amounts' },
          { type: 'uint256[]', name: 'expirations' },
        ],
        keys: ['delaymachine', 'getTransactions'],
      })

      calls.push({
        contract: c.DelayMachine,
        functionName: 'getBalance',
        args: [userAddress],
        resultType: 'uint256',
        keys: ['delaymachine', 'getBalance'],
      })
    }

    // ---- TG (ERC20) + StakingMachine (for allowance) ----
    if (c.TG) {
      calls.push({
        contract: c.TG,
        functionName: 'balanceOf',
        args: [userAddress],
        resultType: 'uint256',
        keys: ['TG', 'balance'],
      })

      if (c.StakingMachine) {
        calls.push({
          contract: c.TG,
          functionName: 'allowance',
          args: [userAddress, c.StakingMachine.address],
          resultType: 'uint256',
          keys: ['stakingmachine', 'tgAllowance'],
        })
      }
    }

    // ---- VotingMachine ----
    if (c.VotingMachine) {
      calls.push({
        contract: c.VotingMachine,
        functionName: 'getUserVote',
        args: [userAddress],
        resultType: [
          { type: 'address', name: 'voteAddress' },
          { type: 'uint256', name: 'voteRound' },
        ],
        keys: ['votingmachine', 'getUserVote'],
      })
    }

    // ---- StakingMachine ----
    if (c.StakingMachine) {
      calls.push({
        contract: c.StakingMachine,
        functionName: 'getBalance',
        args: [userAddress],
        resultType: 'uint256',
        keys: ['stakingmachine', 'getBalance'],
      })

      calls.push({
        contract: c.StakingMachine,
        functionName: 'getLockedBalance',
        args: [userAddress],
        resultType: 'uint256',
        keys: ['stakingmachine', 'getLockedBalance'],
      })

      calls.push({
        contract: c.StakingMachine,
        functionName: 'getLockingInfo',
        args: [userAddress],
        resultType: [
          { type: 'uint256', name: 'amount' },
          { type: 'uint256', name: 'untilTimestamp' },
        ],
        keys: ['stakingmachine', 'getLockingInfo'],
      })
    }

    // ---- IncentiveV2 (requires TG for contractBalance) ----
    if (c.IncentiveV2 && c.TG) {
      calls.push({
        contract: c.TG,
        functionName: 'balanceOf',
        args: [c.IncentiveV2.address],
        resultType: 'uint256',
        keys: ['incentiveV2', 'contractBalance'],
      })

      calls.push({
        contract: c.IncentiveV2,
        functionName: 'get_balance',
        args: [userAddress],
        resultType: 'uint256',
        keys: ['incentiveV2', 'userBalance'],
      })
    }

    return calls
  }, [contracts, userAddress])

  const multicallState = useMultiCall(callsRequests, {
    refetchInterval,
    enabled: callsRequests.length > 0,
    scopeKey: ['userOmocBalance', userAddress].join(':'),
  })

  return multicallState
}
