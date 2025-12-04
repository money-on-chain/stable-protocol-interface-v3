import "./Styles.scss";

import React, { useCallback, useEffect, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import {
    divPrecision,
    isZeroLike,
    mulPrecision,
} from "../../helpers/precision";
import { formatTimestamp } from "../../helpers/staking";
import { useProjectTranslation } from "../../helpers/translations";
import Proposals from "./Proposals";
import Vote from "./Vote";

interface VotingData {
    winnerProposal: string;
    inFavorVotes: bigint;
    againstVotes: bigint;
    votingExpirationTime: bigint;
    expired: boolean;
    totalVotedPCT: bigint;
    totalVoted: bigint;
    votingExpirationTimeFormat: string;
    inFavorVotesTotalSupplyPCT: bigint;
    againstVotesTotalSupplyPCT: bigint;
    inFavorVotesPCT: bigint;
    againstVotesPCT: bigint;
    totalVetoPCT: bigint;
}

interface VotingInfo {
    winnerProposal: string;
    inFavorVotes: bigint;
    againstVotes: bigint;
}

interface ProposalItem {
    [key: number]: [string, bigint, bigint, bigint];
}

interface InfoVoting {
    globalVotingRound: bigint;
    totalSupply: bigint;
    PRE_VOTE_MIN_TO_WIN: bigint;
    PRE_VOTE_MIN_PCT_TO_WIN: bigint;
    MIN_PCT_FOR_QUORUM: bigint;
    MIN_FOR_QUORUM: bigint;
    MIN_STAKE: bigint;
    VOTING_POWER: bigint;
    VOTE_MIN_PCT_TO_VETO: bigint;
    VOTE_MIN_TO_VETO: bigint;
    proposals: ProposalItem;
    state: number;
    readyToPreVoteStep: boolean;
    readyToVoteStep: boolean;
    votingData: VotingData;
    votingInfo: VotingInfo;
    isVetoMachine: boolean;
}

interface InfoUser {
    Voting_Power: bigint;
    Voting_Power_PCT: bigint;
}

const Voting: React.FC = () => {
    const { t } = useProjectTranslation();

    const {
        userOmocBalance,
        contractStatusOmoc,
        isVestingLoaded,
        userVesting,
    } = useWalletContext();

    const defaultInfoVoting: InfoVoting = {
        globalVotingRound: 0n,
        totalSupply: 0n,
        PRE_VOTE_MIN_TO_WIN: 0n,
        PRE_VOTE_MIN_PCT_TO_WIN: 0n,
        MIN_PCT_FOR_QUORUM: 0n,
        MIN_FOR_QUORUM: 0n,
        MIN_STAKE: 0n,
        VOTING_POWER: 0n,
        VOTE_MIN_PCT_TO_VETO: 0n,
        VOTE_MIN_TO_VETO: 0n,
        proposals: {},
        state: 0,
        readyToPreVoteStep: false,
        readyToVoteStep: false,
        votingData: {
            winnerProposal: "",
            inFavorVotes: 0n,
            againstVotes: 0n,
            votingExpirationTime: 0n,
            expired: true,
            totalVotedPCT: 0n,
            totalVoted: 0n,
            votingExpirationTimeFormat: "",
            inFavorVotesTotalSupplyPCT: 0n,
            againstVotesTotalSupplyPCT: 0n,
            inFavorVotesPCT: 0n,
            againstVotesPCT: 0n,
            totalVetoPCT: 0n,
        },
        votingInfo: {
            winnerProposal: "",
            inFavorVotes: 0n,
            againstVotes: 0n,
        },
        isVetoMachine: false,
    };


    const infoVoting: InfoVoting = React.useMemo(() => {
        if (!contractStatusOmoc.data || !userOmocBalance.data) {
            return defaultInfoVoting;
        }
    
        const vm = contractStatusOmoc.data.votingmachine;
        if (
            !vm ||
            !vm.totalSupply ||
            !vm.PRE_VOTE_MIN_PCT_TO_WIN
        ) {
            return defaultInfoVoting;
        }
    
        const nowTimestamp: bigint = BigInt(Date.now());
    
        const cData: InfoVoting = {
            ...defaultInfoVoting,
            proposals: vm.getProposalByIndex as unknown as ProposalItem,
            state: Number(vm.getState || 0n),
            readyToPreVoteStep: vm.readyToPreVoteStep || false,
            readyToVoteStep: vm.readyToVoteStep || false,
            globalVotingRound: BigInt(vm.getVotingRound || 0),
            totalSupply: BigInt(vm.totalSupply || 0),
            PRE_VOTE_MIN_PCT_TO_WIN: BigInt(vm.PRE_VOTE_MIN_PCT_TO_WIN || 0),
            MIN_STAKE: BigInt(vm.MIN_STAKE || 0),
            MIN_PCT_FOR_QUORUM: BigInt(vm.MIN_PCT_FOR_QUORUM || 0),
            VOTE_MIN_PCT_TO_VETO: BigInt(vm.VOTE_MIN_PCT_TO_VETO || 0),
            isVetoMachine: !!contractStatusOmoc.data.vetomachine,
        };
    
        cData.PRE_VOTE_MIN_TO_WIN =
            (mulPrecision(cData.totalSupply, cData.PRE_VOTE_MIN_PCT_TO_WIN) /
                100n);
        cData.MIN_FOR_QUORUM =
            (mulPrecision(cData.totalSupply, cData.MIN_PCT_FOR_QUORUM) / 100n);
        cData.VOTE_MIN_TO_VETO =
            (mulPrecision(cData.totalSupply, cData.VOTE_MIN_PCT_TO_VETO) / 100n);
    
        // Voting data
        const [
            winnerProposal,
            inFavorVotes,
            againstVotes,
            votingExpirationTime,
        ] = (vm.getVotingData || []) as [
            string,
            bigint,
            bigint,
            bigint,
        ];
    
        cData.votingData.winnerProposal = winnerProposal;
        cData.votingData.inFavorVotes = inFavorVotes;
        cData.votingData.againstVotes = againstVotes;
        cData.votingData.votingExpirationTime = votingExpirationTime;
        cData.votingData.votingExpirationTimeFormat = formatTimestamp(
            Number((votingExpirationTime || 0n) * 1000n)
        );
    
        const expirationMs = (votingExpirationTime || 0n) * 1000n;
        const expired = expirationMs <= nowTimestamp;
        cData.votingData.expired = expired;
    
        cData.votingData.totalVoted =
            inFavorVotes + againstVotes;
    
        if (!isZeroLike(cData.totalSupply)) {
            const totalSupply = cData.totalSupply || 0n;
            const totalVoted = cData.votingData.totalVoted || 0n;
    
            cData.votingData.totalVotedPCT = divPrecision(
                totalVoted * 100n,
                totalSupply
            );
            cData.votingData.inFavorVotesTotalSupplyPCT = divPrecision(
                (inFavorVotes || 0n) * 100n,
                totalSupply
            );
            cData.votingData.againstVotesTotalSupplyPCT = divPrecision(
                (againstVotes || 0n) * 100n,
                totalSupply
            );
            cData.votingData.inFavorVotesPCT = divPrecision(
                (inFavorVotes || 0n) * 100n,
                totalVoted || 1n
            );
            cData.votingData.againstVotesPCT = divPrecision(
                (againstVotes || 0n) * 100n,
                totalVoted || 1n
            );
        }
    
        // Voting Info
        const [infoWinnerProposal, infoInFavorVotes, infoAgainstVotes] =
            vm.getVoteInfo || [];
    
        cData.votingInfo.winnerProposal = infoWinnerProposal;
        cData.votingInfo.inFavorVotes = infoInFavorVotes;
        cData.votingInfo.againstVotes = infoAgainstVotes;
    
        cData.votingData.totalVetoPCT =
            contractStatusOmoc.data.vetomachine
                ?.getVetoPctForWinnerProposal || 0n;
    
        return cData;
    }, [contractStatusOmoc.data, userOmocBalance.data]);
    

    const defaultInfoUser: InfoUser = {
        Voting_Power: 0n,
        Voting_Power_PCT: 0n,
    };

    const infoUser: InfoUser = React.useMemo(() => {
        if (!contractStatusOmoc.data || !userOmocBalance.data) {
            return defaultInfoUser;
        }
    
        const nowTimestamp: bigint = BigInt(Date.now());
    
        let vUsing: { getBalance: bigint; getLockingInfo: [bigint, bigint] };
    
        if (isVestingLoaded() && userVesting.data) {
            vUsing = userVesting.data.vestingmachine.staking;
        } else {
            vUsing = userOmocBalance.data.stakingmachine;
        }
    
        const uBalance: bigint = vUsing.getBalance;
        if (!vUsing.getLockingInfo) return defaultInfoUser;
    
        const [lockedAmount, untilTimestamp] = vUsing.getLockingInfo;
    
        const votingPower =
            untilTimestamp * 1000n > nowTimestamp
                ? uBalance - lockedAmount
                : uBalance;
    
        const votingPowerPct = divPrecision(
            (votingPower || 0n) * 100n,
            infoVoting.totalSupply || 0n
        );
    
        return {
            Voting_Power: votingPower,
            Voting_Power_PCT: votingPowerPct,
        };
    }, [
        contractStatusOmoc.data,
        userOmocBalance.data,
        userVesting.data,
        isVestingLoaded, // o lo ignorás si te molesta el linter y sabes que es estable
        infoVoting.totalSupply,
    ]);
    
    return (
        <div className="section-container">
            {/* <div className="content-page"> */}
            <div className={"layout-card"}>
                <div className={"layout-card-title"}>
                    <h1>{t("voting.cardTitle.section")}</h1>
                </div>
                {/* PROPOSAL STAGE */}
                {infoVoting["state"] === 0 && (
                    <div>
                        {/* <div className={'layout-card-title'}>
                        <h1>Proposals</h1>
                    </div> */}

                        <div className="section voting__proposals">
                            <Proposals
                                infoVoting={infoVoting}
                                infoUser={infoUser}
                            />
                        </div>
                    </div>
                )}
                {/* VOTING STAGE */}
                {(infoVoting["state"] === 1 || infoVoting["state"] === 2) && (
                    <div>
                        {/* <div className={'layout-card-title'}>
                        <h1>{t('voting.cardTitle.votingStaged')}</h1>
                    </div> */}
                        <div className="section voting">
                            <Vote infoVoting={infoVoting} infoUser={infoUser} />
                        </div>
                    </div>
                )}
            </div>
            {/* </div> */}
        </div>
    );
};

export default Voting;
