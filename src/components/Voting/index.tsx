import "./Styles.scss";

import React, { useCallback, useEffect, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { divPrecision, mulPrecision } from "../../helpers/precision";
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
    votingExpirationTimeFormat?: string;
    inFavorVotesTotalSupplyPCT?: bigint;
    againstVotesTotalSupplyPCT?: bigint;
    inFavorVotesPCT?: bigint;
    againstVotesPCT?: bigint;
    totalVetoPCT?: bigint;
}

interface VotingInfo {
    winnerProposal: string;
    inFavorVotes: bigint;
    againstVotes: bigint;
}

interface Proposal {
    proposalAddress: string;
    votingRound: bigint;
    votes: bigint;
    expirationTimeStamp: bigint;
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
    proposals: Proposal[];
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

    const nowTimestamp: bigint = BigInt(Date.now());
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
        proposals: [],
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

        const cData: InfoVoting = { ...infoVoting };
        cData["proposals"] = contractStatusOmoc.data.votingmachine
            .getProposalByIndex as Proposal[];
        cData["state"] = Number(
            contractStatusOmoc.data.votingmachine.getState as bigint
        );
        cData["readyToPreVoteStep"] = contractStatusOmoc.data.votingmachine
            .readyToPreVoteStep as boolean;
        cData["readyToVoteStep"] = contractStatusOmoc.data.votingmachine
            .readyToVoteStep as boolean;
        cData["globalVotingRound"] = contractStatusOmoc.data.votingmachine
            .getVotingRound as bigint;
        cData["totalSupply"] = contractStatusOmoc.data.votingmachine
            .totalSupply as bigint;
        cData["PRE_VOTE_MIN_PCT_TO_WIN"] = contractStatusOmoc.data.votingmachine
            .PRE_VOTE_MIN_PCT_TO_WIN as bigint;
        cData["PRE_VOTE_MIN_TO_WIN"] =
            mulPrecision(
                cData["totalSupply"],
                cData["PRE_VOTE_MIN_PCT_TO_WIN"]
            ) / 100n;
        cData["MIN_STAKE"] = contractStatusOmoc.data.votingmachine
            .MIN_STAKE as bigint;
        cData["MIN_PCT_FOR_QUORUM"] = contractStatusOmoc.data.votingmachine
            .MIN_PCT_FOR_QUORUM as bigint;
        cData["MIN_FOR_QUORUM"] =
            mulPrecision(cData["totalSupply"], cData["MIN_PCT_FOR_QUORUM"]) /
            100n;
        cData["VOTE_MIN_PCT_TO_VETO"] = contractStatusOmoc.data.votingmachine
            .VOTE_MIN_PCT_TO_VETO as bigint;
        cData["VOTE_MIN_TO_VETO"] =
            mulPrecision(cData["totalSupply"], cData["VOTE_MIN_PCT_TO_VETO"]) /
            100n;

        // Voting Data
        const [
            winnerProposal,
            inFavorVotes,
            againstVotes,
            votingExpirationTime,
        ] = contractStatusOmoc.data.votingmachine.getVotingData as [
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
            Number(cData["votingData"]["votingExpirationTime"] * 1000n)
        );

        let expired: boolean = true;
        if (cData["votingData"]["votingExpirationTime"] * 1000n > nowTimestamp)
            expired = false;

        cData["votingData"]["expired"] = expired;
        cData["votingData"]["totalVoted"] =
            cData["votingData"]["inFavorVotes"] +
            cData["votingData"]["againstVotes"];
        cData["votingData"]["totalVotedPCT"] = divPrecision(
            cData["votingData"]["totalVoted"] * 100n,
            cData["totalSupply"]
        );
        cData["votingData"]["inFavorVotesTotalSupplyPCT"] = divPrecision(
            cData["votingData"]["inFavorVotes"] * 100n,
            cData["totalSupply"]
        );
        cData["votingData"]["againstVotesTotalSupplyPCT"] = divPrecision(
            cData["votingData"]["againstVotes"] * 100n,
            cData["totalSupply"]
        );

        cData["votingData"]["inFavorVotesPCT"] = divPrecision(
            cData["votingData"]["inFavorVotes"] * 100n,
            cData["votingData"]["totalVoted"]
        );
        cData["votingData"]["againstVotesPCT"] = divPrecision(
            cData["votingData"]["againstVotes"] * 100n,
            cData["votingData"]["totalVoted"]
        );

        // Voting Info
        const [infoWinnerProposal, infoInFavorVotes, infoAgainstVotes] =
            contractStatusOmoc.data.votingmachine.getVoteInfo as [
                string,
                bigint,
                bigint,
            ];

        cData["votingInfo"]["winnerProposal"] = infoWinnerProposal;
        cData["votingInfo"]["inFavorVotes"] = infoInFavorVotes;
        cData["votingInfo"]["againstVotes"] = infoAgainstVotes;
        cData["votingData"]["totalVetoPCT"] =
            (contractStatusOmoc.data.vetomachine
                ?.getVetoPctForWinnerProposal as bigint) || 0n;
        cData["isVetoMachine"] = contractStatusOmoc.data.vetomachine
            ? true
            : false;
        setInfoVoting(cData);

        const cDataUser: InfoUser = { ...infoUser };
        let vUsing: { getBalance: bigint; getLockingInfo: [bigint, bigint] };
        if (isVestingLoaded() && userVesting.data) {
            vUsing = userVesting.data.vestingmachine.staking as {
                getBalance: bigint;
                getLockingInfo: [bigint, bigint];
            };
        } else {
            vUsing = userOmocBalance.data.stakingmachine as {
                getBalance: bigint;
                getLockingInfo: [bigint, bigint];
            };
        }

        const uBalance: bigint = vUsing.getBalance;

        const [lockedAmount, untilTimestamp] = vUsing.getLockingInfo;

        if (untilTimestamp > nowTimestamp) {
            cDataUser["Voting_Power"] = uBalance - lockedAmount;
        } else {
            cDataUser["Voting_Power"] = uBalance;
        }

        cDataUser["Voting_Power_PCT"] = divPrecision(
            cDataUser["Voting_Power"] * 100n,
            cData["totalSupply"]
        );

        setInfoUser(cDataUser);
    }, [
        contractStatusOmoc.data,
        userOmocBalance.data,
        userVesting.data,
        isVestingLoaded,
        infoVoting,
        infoUser,
    ]);

    useEffect(() => {
        if (contractStatusOmoc.data && userOmocBalance.data) {
            refreshData();
        }
    }, [contractStatusOmoc.data, userOmocBalance.data]);

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
