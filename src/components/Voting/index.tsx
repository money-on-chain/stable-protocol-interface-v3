import React, { useContext, useEffect, useState } from "react";
import Proposals from "./Proposals";
import Vote from "./Vote";
import { formatTimestamp } from "../../helpers/staking";
import { useProjectTranslation } from "../../helpers/translations";
import { useWalletContext } from "../../context/Wallet";
import { mulPrecision, divPrecision } from "../../helpers/precision";

import "./Styles.scss";

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
}

interface VotingInfo {
    winnerProposal: string;
    inFavorVotes: bigint;
    againstVotes: bigint;
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
    proposals: any[];
    state: number;
    readyToPreVoteStep: number;
    readyToVoteStep: number;
    votingData: VotingData;
    votingInfo: VotingInfo;
}

interface InfoUser {
    Voting_Power: bigint;
    Voting_Power_PCT: bigint;
}

interface StakingMachine {
    getBalance: string | number;
    getLockingInfo: {
        amount: string | number;
        untilTimestamp: string | number;
    };
}


const Voting: React.FC = () => {
    const { t } = useProjectTranslation();

    const { userBalance, contractProtocolStatus, isVestingLoaded } = useWalletContext()

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
        readyToPreVoteStep: 0,
        readyToVoteStep: 0,
        votingData: {
            winnerProposal: "",
            inFavorVotes: 0n,
            againstVotes: 0n,
            votingExpirationTime: 0n,
            expired: true,
            totalVotedPCT: 0n,
            totalVoted: 0n,
        },
        votingInfo: {
            winnerProposal: "",
            inFavorVotes: 0n,
            againstVotes: 0n,
        },
    };
    const [infoVoting, setInfoVoting] = useState<InfoVoting>(defaultInfoVoting);

    const defaultInfoUser: InfoUser = {
        Voting_Power: 0n,
        Voting_Power_PCT: 0n,
    };
    const [infoUser, setInfoUser] = useState<InfoUser>(defaultInfoUser);

    useEffect(() => {
        if (contractProtocolStatus.data && userBalance.data) {
            refreshData();
        }
    }, [contractProtocolStatus.data, userBalance.data]);

    const refreshData = (): void => {
        if (!contractProtocolStatus.data) return;
        if (!userBalance.data) return;
        
        const cData: InfoVoting = { ...infoVoting };
        cData["proposals"] =
            contractProtocolStatus.data.votingmachine.getProposalByIndex;
        cData["state"] = contractProtocolStatus.data.votingmachine.getState;
        cData["readyToPreVoteStep"] = contractProtocolStatus.data.votingmachine.readyToPreVoteStep;
        cData["readyToVoteStep"] = contractProtocolStatus.data.votingmachine.readyToVoteStep;
        cData["globalVotingRound"] = contractProtocolStatus.data.votingmachine.getVotingRound;
        cData["totalSupply"] = contractProtocolStatus.data.votingmachine.totalSupply;
        cData["PRE_VOTE_MIN_PCT_TO_WIN"] = contractProtocolStatus.data.votingmachine.PRE_VOTE_MIN_PCT_TO_WIN;
        cData["PRE_VOTE_MIN_TO_WIN"] = mulPrecision(cData["totalSupply"], cData["PRE_VOTE_MIN_PCT_TO_WIN"]) / 100n;
        cData["MIN_STAKE"] = contractProtocolStatus.data.votingmachine.MIN_STAKE;
        cData["MIN_PCT_FOR_QUORUM"] = contractProtocolStatus.data.votingmachine.MIN_PCT_FOR_QUORUM;
        cData["MIN_FOR_QUORUM"] = mulPrecision(cData["totalSupply"], cData["MIN_PCT_FOR_QUORUM"]) / 100n;
        cData["VOTE_MIN_PCT_TO_VETO"] = contractProtocolStatus.data.votingmachine.VOTE_MIN_PCT_TO_VETO;
        cData["VOTE_MIN_TO_VETO"] = mulPrecision(cData["totalSupply"], cData["VOTE_MIN_PCT_TO_VETO"]) / 100n;

        // Voting Data
        cData["votingData"]["winnerProposal"] =
            contractProtocolStatus.data.votingmachine.getVotingData[
                "winnerProposal"
            ];
        cData["votingData"]["inFavorVotes"] = contractProtocolStatus.data.votingmachine.getVotingData["inFavorVotes"];
        cData["votingData"]["againstVotes"] = contractProtocolStatus.data.votingmachine.getVotingData["againstVotes"];
        cData["votingData"]["votingExpirationTime"] = contractProtocolStatus.data.votingmachine.getVotingData["votingExpirationTime"];
        cData["votingData"]["votingExpirationTimeFormat"] = formatTimestamp(cData["votingData"]["votingExpirationTime"]);

        let expired: boolean = true;
        if (cData["votingData"]["votingExpirationTime"] > nowTimestamp)
            expired = false;
        cData["votingData"]["expired"] = expired;

        cData["votingData"]["totalVoted"] = cData["votingData"][
            "inFavorVotes"
        ] + cData["votingData"]["againstVotes"];
        cData["votingData"]["totalVotedPCT"] = cData["votingData"]["totalVoted"] * 100n / cData["totalSupply"];
        cData["votingData"]["inFavorVotesTotalSupplyPCT"] = divPrecision(cData["votingData"]["inFavorVotes"] * 100n, cData["totalSupply"]);
        cData["votingData"]["againstVotesTotalSupplyPCT"] = divPrecision(cData["votingData"]["againstVotes"] * 100n, cData["totalSupply"]);

        cData["votingData"]["inFavorVotesPCT"] = divPrecision(cData["votingData"]["inFavorVotes"] * 100n, cData["votingData"]["totalVoted"]);
        cData["votingData"]["againstVotesPCT"] = divPrecision(cData["votingData"]["againstVotes"] * 100n, cData["votingData"]["totalVoted"]);

        // Voting Info
        cData["votingInfo"]["winnerProposal"] =
            contractProtocolStatus.data.votingmachine.getVoteInfo["winnerProposal"];
        cData["votingInfo"]["inFavorVotes"] = contractProtocolStatus.data.votingmachine.getVoteInfo["inFavorVotes"];
        cData["votingInfo"]["againstVotes"] = contractProtocolStatus.data.votingmachine.getVoteInfo["againstVotes"];
        setInfoVoting(cData);

        
        const cDataUser: InfoUser = { ...infoUser };
        let vUsing: StakingMachine;
        if (isVestingLoaded()) {
            vUsing = userBalance.data.vestingmachine.staking;
        } else {
            vUsing = userBalance.data.stakingmachine;
        }

        const userBalance: bigint = vUsing.getBalance;

        const lockedAmount: bigint = vUsing.getLockingInfo.amount;

        const untilTimestamp: bigint = vUsing.getLockingInfo.untilTimestamp;

        if (untilTimestamp > nowTimestamp) {
            cDataUser["Voting_Power"] = userBalance - lockedAmount;
        } else {
            cDataUser["Voting_Power"] = userBalance;
        }

        cDataUser["Voting_Power_PCT"] = divPrecision(cDataUser["Voting_Power"] * 100n, cData["totalSupply"]);

        setInfoUser(cDataUser);
    };

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
}

export default Voting; 