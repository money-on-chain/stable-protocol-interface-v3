import { useMemo } from 'react'
import { useMultiCall } from "./useMultiCall";
import omoc from "../settings/omoc/omoc.json";

const onErrorProposal = () => {
    console.warn("Proposal not exist");
    return { value: null, canOperate: true };
};

/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useContractsOmocStatus(contracts?: any, proposalCountVoting?: bigint) {
    const callsRequests = useMemo(() => {

        console.log('DEBUG')
        console.log(contracts)
        console.log(proposalCountVoting)

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
                keyName: "stakingmachine",
                keyIndex: 'getWithdrawLockTime'
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getSupporters',
                args: [],
                resultType: 'address',
                keyName: 'stakingmachine',
                keyIndex: 'getSupporters'
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getOracleManager',
                args: [],
                resultType: 'address',
                keyName: 'stakingmachine',
                keyIndex: 'getOracleManager'
            });

            callRequest.push({
                contract: contracts.StakingMachine,
                functionName: 'getDelayMachine',
                args: [],
                resultType: 'address',
                keyName: 'stakingmachine',
                keyIndex: 'getDelayMachine'
            });

            callRequest.push({
                contract: contracts.DelayMachine,
                functionName: 'getLastId',
                args: [],
                resultType: 'uint256',
                keyName: 'delaymachine',
                keyIndex: 'getLastId'
            });

            callRequest.push({
                contract: contracts.DelayMachine,
                functionName: 'getSource',
                args: [],
                resultType: 'address',
                keyName: 'delaymachine',
                keyIndex: 'getSource'
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'isReadyToDistribute',
                args: [],
                resultType: 'bool',
                keyName: 'supporters',
                keyIndex: 'isReadyToDistribute'
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'mocToken',
                args: [],
                resultType: 'address',
                keyName: 'supporters',
                keyIndex: 'mocToken'
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'period',
                args: [],
                resultType: 'uint256',
                keyName: 'supporters',
                keyIndex: 'period'
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'totalMoc',
                args: [],
                resultType: 'uint256',
                keyName: 'supporters',
                keyIndex: 'totalMoc'
            });

            callRequest.push({
                contract: contracts.Supporters,
                functionName: 'totalToken',
                args: [],
                resultType: 'uint256',
                keyName: 'supporters',
                keyIndex: 'totalToken'
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getState',
                args: [],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'getState'
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getVotingRound',
                args: [],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'getVotingRound'
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
                keyName: 'votingmachine',
                keyIndex: 'getVoteInfo'
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'readyToPreVoteStep',
                args: [],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'readyToPreVoteStep'
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'readyToVoteStep',
                args: [],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'readyToVoteStep'
            });

            callRequest.push({
                contract: contracts.VotingMachine,
                functionName: 'getProposalCount',
                args: [],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'getProposalCount'
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
                keyName: 'votingmachine',
                keyIndex: 'getVotingData'
            });

            callRequest.push({
                contract: contracts.TG,
                functionName: 'totalSupply',
                args: [],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'totalSupply'
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
                            keyName: "votingmachine",
                            keyIndex: "getProposalByIndex",
                            keySubIndex: indexProp,
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
                keyName: 'votingmachine',
                keyIndex: 'MIN_STAKE'
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PRE_VOTE_EXPIRATION_TIME_DELTA],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'PRE_VOTE_EXPIRATION_TIME_DELTA'
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_MAX_PRE_PROPOSALS],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'MAX_PRE_PROPOSALS'
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PRE_VOTE_MIN_PCT_TO_WIN],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'PRE_VOTE_MIN_PCT_TO_WIN'
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_TO_VETO],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'VOTE_MIN_PCT_TO_VETO'
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_FOR_QUORUM],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'MIN_PCT_FOR_QUORUM'
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_TO_ACCEPT],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'VOTE_MIN_PCT_TO_ACCEPT'
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PCT_PRECISION],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'PCT_PRECISION'
            });

            callRequest.push({
                contract: contracts.IRegistry,
                functionName: 'getUint',
                args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTING_TIME_DELTA],
                resultType: 'uint256',
                keyName: 'votingmachine',
                keyIndex: 'VOTING_TIME_DELTA'
            });
        }

      return callRequest
    }, [contracts, proposalCountVoting])

      
    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
      refetchInterval: 30_000,
      enabled: callsRequests.length > 0,
    })
  
    return multicallState
  }
