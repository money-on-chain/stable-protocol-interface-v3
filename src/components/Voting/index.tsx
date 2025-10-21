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
    const [infoVoting, setInfoVoting] = useState<InfoVoting>(defaultInfoVoting);

    const defaultInfoUser: InfoUser = {
        Voting_Power: 0n,
        Voting_Power_PCT: 0n,
    };
    const [infoUser, setInfoUser] = useState<InfoUser>(defaultInfoUser);

    const refreshData = useCallback((): void => {
        if (!contractStatusOmoc.data) return;
        if (!userOmocBalance.data) return;

        // Check if votingmachine data exists before accessing it
        if (
            !contractStatusOmoc.data.votingmachine ||
            !contractStatusOmoc.data.votingmachine.totalSupply ||
            !contractStatusOmoc.data.votingmachine.PRE_VOTE_MIN_PCT_TO_WIN
        ) {
            return;
        }

        // Calculate current timestamp inside the callback
        const nowTimestamp: bigint = BigInt(Date.now());

        const cData: InfoVoting = {
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

        cData["proposals"] = contractStatusOmoc.data.votingmachine
            .getProposalByIndex as unknown as ProposalItem;
        cData["state"] = Number(
            contractStatusOmoc.data.votingmachine.getState || 0n
        );
        cData["readyToPreVoteStep"] =
            contractStatusOmoc.data.votingmachine.readyToPreVoteStep || false;
        cData["readyToVoteStep"] =
            contractStatusOmoc.data.votingmachine.readyToVoteStep || false;
        cData["globalVotingRound"] = BigInt(
            contractStatusOmoc.data.votingmachine.getVotingRound || 0
        );
        cData["totalSupply"] = BigInt(
            contractStatusOmoc.data.votingmachine.totalSupply || 0
        );
        cData["PRE_VOTE_MIN_PCT_TO_WIN"] = BigInt(
            contractStatusOmoc.data.votingmachine.PRE_VOTE_MIN_PCT_TO_WIN || 0
        );
        cData["PRE_VOTE_MIN_TO_WIN"] =
            mulPrecision(
                cData["totalSupply"],
                cData["PRE_VOTE_MIN_PCT_TO_WIN"]
            ) / 100n;
        cData["MIN_STAKE"] = BigInt(
            contractStatusOmoc.data.votingmachine.MIN_STAKE || 0
        );
        cData["MIN_PCT_FOR_QUORUM"] = BigInt(
            contractStatusOmoc.data.votingmachine.MIN_PCT_FOR_QUORUM || 0
        );
        cData["MIN_FOR_QUORUM"] =
            mulPrecision(cData["totalSupply"], cData["MIN_PCT_FOR_QUORUM"]) /
            100n;
        cData["VOTE_MIN_PCT_TO_VETO"] = BigInt(
            contractStatusOmoc.data.votingmachine.VOTE_MIN_PCT_TO_VETO || 0
        );
        cData["VOTE_MIN_TO_VETO"] =
            mulPrecision(cData["totalSupply"], cData["VOTE_MIN_PCT_TO_VETO"]) /
            100n;

        // Voting Data
        const [
            winnerProposal,
            inFavorVotes,
            againstVotes,
            votingExpirationTime,
        ] = (contractStatusOmoc.data.votingmachine.getVotingData || []) as [
            string,
            bigint,
            bigint,
            bigint,
        ];
        cData["votingData"]["winnerProposal"] = winnerProposal;
        cData["votingData"]["inFavorVotes"] = inFavorVotes;
        cData["votingData"]["againstVotes"] = againstVotes;
        cData["votingData"]["votingExpirationTime"] = votingExpirationTime;
        cData["votingData"]["votingExpirationTimeFormat"] = formatTimestamp(
            Number((cData["votingData"]["votingExpirationTime"] || 0n) * 1000n)
        );

        let expired: boolean = true;
        if (
            (cData["votingData"]["votingExpirationTime"] || 0n) * 1000n >
            nowTimestamp
        )
            expired = false;

        cData["votingData"]["expired"] = expired;
        cData["votingData"]["totalVoted"] =
            cData["votingData"]["inFavorVotes"] +
            cData["votingData"]["againstVotes"];

        cData["votingData"]["totalVotedPCT"] = 0n;
        cData["votingData"]["inFavorVotesTotalSupplyPCT"] = 0n;
        cData["votingData"]["againstVotesTotalSupplyPCT"] = 0n;
        cData["votingData"]["inFavorVotesPCT"] = 0n;
        cData["votingData"]["againstVotesPCT"] = 0n;

        if (!isZeroLike(cData["totalSupply"])) {
            cData["votingData"]["totalVotedPCT"] = divPrecision(
                (cData["votingData"]["totalVoted"] || 0n) * 100n,
                cData["totalSupply"] || 0n
            );
            cData["votingData"]["inFavorVotesTotalSupplyPCT"] = divPrecision(
                (cData["votingData"]["inFavorVotes"] || 0n) * 100n,
                cData["totalSupply"] || 0n
            );
            cData["votingData"]["againstVotesTotalSupplyPCT"] = divPrecision(
                (cData["votingData"]["againstVotes"] || 0n) * 100n,
                cData["totalSupply"] || 0n
            );
            cData["votingData"]["inFavorVotesPCT"] = divPrecision(
                (cData["votingData"]["inFavorVotes"] || 0n) * 100n,
                cData["votingData"]["totalVoted"] || 0n
            );
            cData["votingData"]["againstVotesPCT"] = divPrecision(
                (cData["votingData"]["againstVotes"] || 0n) * 100n,
                cData["votingData"]["totalVoted"] || 0n
            );
        }

        // Voting Info
        const [infoWinnerProposal, infoInFavorVotes, infoAgainstVotes] =
            contractStatusOmoc.data.votingmachine.getVoteInfo || [];

        cData["votingInfo"]["winnerProposal"] = infoWinnerProposal;
        cData["votingInfo"]["inFavorVotes"] = infoInFavorVotes;
        cData["votingInfo"]["againstVotes"] = infoAgainstVotes;
        cData["votingData"]["totalVetoPCT"] =
            contractStatusOmoc.data.vetomachine?.getVetoPctForWinnerProposal ||
            0n;
        cData["isVetoMachine"] = contractStatusOmoc.data.vetomachine
            ? true
            : false;
        setInfoVoting(cData);

        const cDataUser: InfoUser = {
            Voting_Power: 0n,
            Voting_Power_PCT: 0n,
        };

        let vUsing: { getBalance: bigint; getLockingInfo: [bigint, bigint] };
        if (isVestingLoaded() && userVesting.data) {
            vUsing = userVesting.data.vestingmachine.staking;
        } else {
            vUsing = userOmocBalance.data.stakingmachine;
        }

        const uBalance: bigint = vUsing.getBalance;

        if (!vUsing.getLockingInfo) return;

        const [lockedAmount, untilTimestamp] = vUsing.getLockingInfo;

        if (untilTimestamp * 1000n > nowTimestamp) {
            cDataUser["Voting_Power"] = uBalance - lockedAmount;
        } else {
            cDataUser["Voting_Power"] = uBalance;
        }

        cDataUser["Voting_Power_PCT"] = divPrecision(
            (cDataUser["Voting_Power"] || 0n) * 100n,
            cData["totalSupply"]
        );

        setInfoUser(cDataUser);
    }, [
        contractStatusOmoc.data,
        userOmocBalance.data,
        userVesting.data,
        isVestingLoaded,
    ]);

    useEffect(() => {
        if (contractStatusOmoc.data && userOmocBalance.data) {
            refreshData();
        }
    }, [contractStatusOmoc.data, userOmocBalance.data, refreshData]);

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
