import { useMemo } from 'react'
import { useMultiCall } from "./useMulticall";
import omoc from "../settings/omoc/omoc.json";

const onErrorProposal = () => {
    console.warn("Proposal not exist");
    return { value: null, canOperate: true };
};

/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useContractOmocStatus(contracts?: any, proposalCountVoting?: bigint, refetchInterval = 30_000) {
    const callsRequests = useMemo(() => {
        
        if (!contracts) return []

        if (!proposalCountVoting) proposalCountVoting = 0n
                
        const callRequest = []        

        // OMOC
        if (typeof contracts.IRegistry !== "undefined") {
            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getWithdrawLockTime',
                args: [],
                resultType: "uint256",
                keys: ["stakingmachine", "getWithdrawLockTime"]
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getSupporters',
                args: [],
                resultType: 'address',
                keys: ["stakingmachine", "getSupporters"]
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getOracleManager',
                args: [],
                resultType: 'address',
                keys: ["stakingmachine", "getOracleManager"]
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getDelayMachine',
                args: [],
                resultType: 'address',
                keys: ["stakingmachine", "getDelayMachine"]
            });

            callRequest.push({
                contract: contracts.DelayMachine,
                functionName: 'getLastId',
                args: [],
                resultType: 'uint256',
                keys: ["delaymachine", "getLastId"]
            });

            callRequest.push({
                contract: contracts.DelayMachine,
                functionName: 'getSource',
                args: [],
                resultType: 'address',
                keys: ["delaymachine", "getSource"]
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'isReadyToDistribute',
                args: [],
                resultType: 'bool',
                keys: ["supporters", "isReadyToDistribute"]
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'mocToken',
                args: [],
                resultType: 'address',
                keys: ["supporters", "mocToken"]
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'period',
                args: [],
                resultType: 'uint256',
                keys: ["supporters", "period"]
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'totalMoc',
                args: [],
                resultType: 'uint256',
                keys: ["supporters", "totalMoc"]
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'totalToken',
                args: [],
                resultType: 'uint256',
                keys: ["supporters", "totalToken"]
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getState',
                args: [],
                resultType: 'uint256',
                keys: ["votingmachine", "getState"]
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getVotingRound',
                args: [],
                resultType: 'uint256',
                keys: ["votingmachine", "getVotingRound"]
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getVoteInfo',
                args: [],
                resultType: [
                    { type: "address", name: "winnerProposal" },
                    { type: "uint256", name: "inFavorVotes" },
                    { type: "uint256", name: "againstVotes" }
                ],
                keys: ["votingmachine", "getVoteInfo"]
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'readyToPreVoteStep',
                args: [],
                resultType: 'uint256',
                keys: ["votingmachine", "readyToPreVoteStep"]
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'readyToVoteStep',
                args: [],
                resultType: 'uint256',
                keys: ["votingmachine", "readyToVoteStep"]
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getProposalCount',
                args: [],
                resultType: 'uint256',
                keys: ["votingmachine", "getProposalCount"]
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getVotingData',
                args: [],
                resultType: [
                    { type: "address", name: "winnerProposal" },
                    { type: "uint256", name: "inFavorVotes" },
                    { type: "uint256", name: "againstVotes" },
                    { type: "uint256", name: "votingExpirationTime" },
                ],
                keys: ["votingmachine", "getVotingData"]
            });

            callRequest.push({
                contract: contracts.TG,
                functionName: 'totalSupply',
                args: [],
                resultType: 'uint256',
                keys: ["votingmachine", "totalSupply"]
            });

            // Proposals
            let indexProp;
            if (proposalCountVoting !== undefined) {
                for (let i = 1; i < 30; i++) {
                    if (proposalCountVoting - BigInt(i) >= 0) {
                        indexProp = proposalCountVoting - BigInt(i);
                        callRequest.push({
                            contract: contracts.VotingMachine,
                            functionName: 'getProposalByIndex',
                            args: [indexProp],
                            resultType: [
                                { type: "address", name: "proposalAddress" },
                                { type: "uint256", name: "votingRound" },
                                { type: "uint256", name: "votes" },
                                { type: "uint256", name: "expirationTimeStamp" },
                            ],
                            keys: ["votingmachine", "getProposalByIndex", indexProp],
                            onError: onErrorProposal
                        });
                    }
                }
            }

            // OMOC REGISTRY CONSTANT
            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_MIN_STAKE],
                resultType: 'uint256',
                keys: ["votingmachine", "MIN_STAKE"]
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PRE_VOTE_EXPIRATION_TIME_DELTA],
                resultType: 'uint256',
                keys: ["votingmachine", "PRE_VOTE_EXPIRATION_TIME_DELTA"]
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_MAX_PRE_PROPOSALS],
                resultType: 'uint256',
                keys: ["votingmachine", "MAX_PRE_PROPOSALS"]
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PRE_VOTE_MIN_PCT_TO_WIN],
                resultType: 'uint256',
                keys: ["votingmachine", "PRE_VOTE_MIN_PCT_TO_WIN"]
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_TO_VETO],
                resultType: 'uint256',
                keys: ["votingmachine", "VOTE_MIN_PCT_TO_VETO"]
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_FOR_QUORUM],
                resultType: 'uint256',
                keys: ["votingmachine", "MIN_PCT_FOR_QUORUM"]
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_TO_ACCEPT],
                resultType: 'uint256',
                keys: ["votingmachine", "VOTE_MIN_PCT_TO_ACCEPT"]
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PCT_PRECISION],
                resultType: 'uint256',
                keys: ["votingmachine", "PCT_PRECISION"]
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTING_TIME_DELTA],
                resultType: 'uint256',
                keys: ["votingmachine", "VOTING_TIME_DELTA"]
            });
        }

      return callRequest
    }, [contracts, proposalCountVoting])

      
    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
      refetchInterval: refetchInterval,
      enabled: callsRequests.length > 0,
    })
  
    return multicallState
  }
