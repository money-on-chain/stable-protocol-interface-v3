import React, { useContext, useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import Web3 from "web3";
import { AuthenticateContext } from "../../context/Auth";
import Proposals from "./Proposals";
import Vote from "./Vote";
import { formatTimestamp } from "../../helpers/staking";
import { useProjectTranslation } from "../../helpers/translations";

import "./Styles.scss";

interface VotingData {
    winnerProposal: string;
    inFavorVotes: BigNumber;
    againstVotes: BigNumber;
    votingExpirationTime: BigNumber;
    expired: boolean;
    totalVotedPCT: BigNumber;
    totalVoted: BigNumber;
    votingExpirationTimeFormat?: string;
    inFavorVotesTotalSupplyPCT?: BigNumber;
    againstVotesTotalSupplyPCT?: BigNumber;
    inFavorVotesPCT?: BigNumber;
    againstVotesPCT?: BigNumber;
}

interface VotingInfo {
    winnerProposal: string;
    inFavorVotes: BigNumber;
    againstVotes: BigNumber;
}

interface InfoVoting {
    globalVotingRound: BigNumber;
    totalSupply: BigNumber;
    PRE_VOTE_MIN_TO_WIN: BigNumber;
    PRE_VOTE_MIN_PCT_TO_WIN: BigNumber;
    MIN_PCT_FOR_QUORUM: BigNumber;
    MIN_FOR_QUORUM: BigNumber;
    MIN_STAKE: BigNumber;
    VOTING_POWER: BigNumber;
    VOTE_MIN_PCT_TO_VETO: BigNumber;
    VOTE_MIN_TO_VETO: BigNumber;
    proposals: any[];
    state: number;
    readyToPreVoteStep: number;
    readyToVoteStep: number;
    votingData: VotingData;
    votingInfo: VotingInfo;
}

interface InfoUser {
    Voting_Power: BigNumber;
    Voting_Power_PCT: BigNumber;
}

interface StakingMachine {
    getBalance: string | number;
    getLockingInfo: {
        amount: string | number;
        untilTimestamp: string | number;
    };
}

interface VotingMachine {
    getProposalByIndex: any[];
    getState: string | number;
    readyToPreVoteStep: string | number;
    readyToVoteStep: string | number;
    getVotingRound: string | number;
    totalSupply: string | number;
    PRE_VOTE_MIN_PCT_TO_WIN: string | number;
    MIN_STAKE: string | number;
    MIN_PCT_FOR_QUORUM: string | number;
    VOTE_MIN_PCT_TO_VETO: string | number;
    getVotingData: {
        winnerProposal: string;
        inFavorVotes: string | number;
        againstVotes: string | number;
        votingExpirationTime: string | number;
    };
    getVoteInfo: {
        winnerProposal: string;
        inFavorVotes: string | number;
        againstVotes: string | number;
    };
}

interface ContractStatusData {
    votingmachine: VotingMachine;
}

interface UserBalanceData {
    vestingmachine: {
        staking: StakingMachine;
    };
    stakingmachine: StakingMachine;
}

interface AuthContext {
    contractStatusData: ContractStatusData | null;
    userBalanceData: UserBalanceData | null;
    isVestingLoaded: () => boolean;
}

const Voting: React.FC = () => {
    const { t } = useProjectTranslation();

    const auth = useContext(AuthenticateContext) as AuthContext;

    const nowTimestamp: BigNumber = new BigNumber(Date.now());
    const defaultInfoVoting: InfoVoting = {
        globalVotingRound: new BigNumber(0),
        totalSupply: new BigNumber(0),
        PRE_VOTE_MIN_TO_WIN: new BigNumber(0),
        PRE_VOTE_MIN_PCT_TO_WIN: new BigNumber(0),
        MIN_PCT_FOR_QUORUM: new BigNumber(0),
        MIN_FOR_QUORUM: new BigNumber(0),
        MIN_STAKE: new BigNumber(0),
        VOTING_POWER: new BigNumber(0),
        VOTE_MIN_PCT_TO_VETO: new BigNumber(0),
        VOTE_MIN_TO_VETO: new BigNumber(0),
        proposals: [],
        state: 0,
        readyToPreVoteStep: 0,
        readyToVoteStep: 0,
        votingData: {
            winnerProposal: "",
            inFavorVotes: new BigNumber(0),
            againstVotes: new BigNumber(0),
            votingExpirationTime: new BigNumber(0),
            expired: true,
            totalVotedPCT: new BigNumber(0),
            totalVoted: new BigNumber(0),
        },
        votingInfo: {
            winnerProposal: "",
            inFavorVotes: new BigNumber(0),
            againstVotes: new BigNumber(0),
        },
    };
    const [infoVoting, setInfoVoting] = useState<InfoVoting>(defaultInfoVoting);

    const defaultInfoUser: InfoUser = {
        Voting_Power: new BigNumber(0),
        Voting_Power_PCT: new BigNumber(0),
    };
    const [infoUser, setInfoUser] = useState<InfoUser>(defaultInfoUser);

    useEffect(() => {
        if (auth.contractStatusData && auth.userBalanceData) {
            refreshData();
        }
    }, [auth]);

    const refreshData = (): void => {
        if (!auth.contractStatusData) return;
        
        const cData: InfoVoting = { ...infoVoting };
        cData["proposals"] =
            auth.contractStatusData.votingmachine.getProposalByIndex;
        cData["state"] = new BigNumber(
            auth.contractStatusData.votingmachine.getState
        ).toNumber();
        cData["readyToPreVoteStep"] = new BigNumber(
            auth.contractStatusData.votingmachine.readyToPreVoteStep
        ).toNumber();
        cData["readyToVoteStep"] = new BigNumber(
            auth.contractStatusData.votingmachine.readyToVoteStep
        ).toNumber();
        cData["globalVotingRound"] = new BigNumber(
            auth.contractStatusData.votingmachine.getVotingRound
        );
        cData["totalSupply"] = new BigNumber(
            Web3.utils.fromWei(
                auth.contractStatusData.votingmachine.totalSupply,
                "ether"
            )
        );
        cData["PRE_VOTE_MIN_PCT_TO_WIN"] = new BigNumber(
            auth.contractStatusData.votingmachine.PRE_VOTE_MIN_PCT_TO_WIN
        );
        cData["PRE_VOTE_MIN_TO_WIN"] = new BigNumber(cData["totalSupply"])
            .times(new BigNumber(cData["PRE_VOTE_MIN_PCT_TO_WIN"]))
            .div(100);
        cData["MIN_STAKE"] = new BigNumber(
            Web3.utils.fromWei(
                auth.contractStatusData.votingmachine.MIN_STAKE,
                "ether"
            )
        );
        cData["MIN_PCT_FOR_QUORUM"] = new BigNumber(
            auth.contractStatusData.votingmachine.MIN_PCT_FOR_QUORUM
        );
        cData["MIN_FOR_QUORUM"] = new BigNumber(cData["totalSupply"])
            .times(new BigNumber(cData["MIN_PCT_FOR_QUORUM"]))
            .div(100);
        cData["VOTE_MIN_PCT_TO_VETO"] = new BigNumber(
            auth.contractStatusData.votingmachine.VOTE_MIN_PCT_TO_VETO
        );
        cData["VOTE_MIN_TO_VETO"] = new BigNumber(cData["totalSupply"])
            .times(new BigNumber(cData["VOTE_MIN_PCT_TO_VETO"]))
            .div(100);

        // Voting Data
        cData["votingData"]["winnerProposal"] =
            auth.contractStatusData.votingmachine.getVotingData[
                "winnerProposal"
            ];
        cData["votingData"]["inFavorVotes"] = new BigNumber(
            Web3.utils.fromWei(
                auth.contractStatusData.votingmachine.getVotingData[
                    "inFavorVotes"
                ],
                "ether"
            )
        );
        cData["votingData"]["againstVotes"] = new BigNumber(
            Web3.utils.fromWei(
                auth.contractStatusData.votingmachine.getVotingData[
                    "againstVotes"
                ],
                "ether"
            )
        );
        cData["votingData"]["votingExpirationTime"] = new BigNumber(
            auth.contractStatusData.votingmachine.getVotingData[
                "votingExpirationTime"
            ]
        ).times(1000);
        cData["votingData"]["votingExpirationTimeFormat"] = formatTimestamp(
            cData["votingData"]["votingExpirationTime"].toNumber()
        );

        let expired: boolean = true;
        if (cData["votingData"]["votingExpirationTime"].gt(nowTimestamp))
            expired = false;
        cData["votingData"]["expired"] = expired;

        cData["votingData"]["totalVoted"] = cData["votingData"][
            "inFavorVotes"
        ].plus(cData["votingData"]["againstVotes"]);
        cData["votingData"]["totalVotedPCT"] = cData["votingData"]["totalVoted"]
            .times(100)
            .div(cData["totalSupply"]);
        cData["votingData"]["inFavorVotesTotalSupplyPCT"] = cData["votingData"][
            "inFavorVotes"
        ]
            .times(100)
            .div(cData["totalSupply"]);
        cData["votingData"]["againstVotesTotalSupplyPCT"] = cData["votingData"][
            "againstVotes"
        ]
            .times(100)
            .div(cData["totalSupply"]);

        cData["votingData"]["inFavorVotesPCT"] = cData["votingData"][
            "inFavorVotes"
        ]
            .times(100)
            .div(cData["votingData"]["totalVoted"]);
        cData["votingData"]["againstVotesPCT"] = cData["votingData"][
            "againstVotes"
        ]
            .times(100)
            .div(cData["votingData"]["totalVoted"]);

        // Voting Info
        cData["votingInfo"]["winnerProposal"] =
            auth.contractStatusData.votingmachine.getVoteInfo["winnerProposal"];
        cData["votingInfo"]["inFavorVotes"] = new BigNumber(
            Web3.utils.fromWei(
                auth.contractStatusData.votingmachine.getVoteInfo[
                    "inFavorVotes"
                ],
                "ether"
            )
        );
        cData["votingInfo"]["againstVotes"] = new BigNumber(
            Web3.utils.fromWei(
                auth.contractStatusData.votingmachine.getVoteInfo[
                    "againstVotes"
                ],
                "ether"
            )
        );
        setInfoVoting(cData);

        if (!auth.userBalanceData) return;
        
        const cDataUser: InfoUser = { ...infoUser };
        let vUsing: StakingMachine;
        if (auth.isVestingLoaded()) {
            vUsing = auth.userBalanceData.vestingmachine.staking;
        } else {
            vUsing = auth.userBalanceData.stakingmachine;
        }

        const userBalance: BigNumber = new BigNumber(
            Web3.utils.fromWei(vUsing.getBalance, "ether")
        );

        const lockedAmount: BigNumber = new BigNumber(
            Web3.utils.fromWei(vUsing.getLockingInfo.amount, "ether")
        );

        const untilTimestamp: BigNumber = new BigNumber(
            vUsing.getLockingInfo.untilTimestamp
        ).times(1000);

        if (untilTimestamp.gt(nowTimestamp)) {
            cDataUser["Voting_Power"] = userBalance.minus(lockedAmount);
        } else {
            cDataUser["Voting_Power"] = userBalance;
        }

        cDataUser["Voting_Power_PCT"] = cDataUser["Voting_Power"]
            .times(100)
            .div(cData["totalSupply"]);

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