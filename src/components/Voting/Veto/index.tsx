import React, { Fragment, useContext, useEffect, useState } from "react";
import Proposals from "../Proposals";
import Vote from "../Vote";
import { formatTimestamp } from "../../../helpers/staking";
import { useProjectTranslation } from "../../../helpers/translations";
import { useWalletContext } from "../../../context/Wallet";
import { mulPrecision, divPrecision } from "../../../helpers/precision";

import "../Styles.scss";
import { useNavigate } from "react-router-dom";
import BalanceBar from "../BalanceBar";
import CompletedBar from "../CompletedBar";
import { TokenSettings } from "@/helpers/currencies";

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
    readyToPreVoteStep: boolean;
    readyToVoteStep: boolean;
    votingData: VotingData;
    votingInfo: VotingInfo;
}

interface InfoUser {
    Voting_Power: bigint;
    Voting_Power_PCT: bigint;
    Total_Veto_Power: bigint;
    Total_Veto_Power_PCT: bigint;
    InfoUserTC: InfoUserTC[];
}

interface InfoUserTC {
    address: string;
    name: string;
    balance: bigint;
    vetoingPower: bigint;
    lockedAmount: bigint;
}

const Veto: React.FC = () => {
    const { t } = useProjectTranslation();
    const navigate = useNavigate();

    const {
        userOmocBalance,
        contractStatusOmoc,
        isVestingLoaded,
        userVesting,
        userBalance,
        contractsAddress,
        userVeto,
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
        Total_Veto_Power: 0n,
        Total_Veto_Power_PCT: 0n,
        InfoUserTC: [],
    };
    const [infoUser, setInfoUser] = useState<InfoUser>(defaultInfoUser);

    useEffect(() => {
        if (contractStatusOmoc.data && userOmocBalance.data) {
            refreshData();
        }
    }, [contractStatusOmoc.data, userOmocBalance.data]);

    const refreshData = (): void => {
        if (!contractStatusOmoc.data) return;
        if (!userOmocBalance.data) return;

        const cData: InfoVoting = { ...infoVoting };
        cData["proposals"] =
            contractStatusOmoc.data.votingmachine.getProposalByIndex;
        cData["state"] = Number(contractStatusOmoc.data.votingmachine.getState);
        cData["readyToPreVoteStep"] =
            contractStatusOmoc.data.votingmachine.readyToPreVoteStep;
        cData["readyToVoteStep"] =
            contractStatusOmoc.data.votingmachine.readyToVoteStep;
        cData["globalVotingRound"] =
            contractStatusOmoc.data.votingmachine.getVotingRound;
        cData["totalSupply"] =
            contractStatusOmoc.data.votingmachine.totalSupply;
        cData["PRE_VOTE_MIN_PCT_TO_WIN"] =
            contractStatusOmoc.data.votingmachine.PRE_VOTE_MIN_PCT_TO_WIN;
        cData["PRE_VOTE_MIN_TO_WIN"] =
            mulPrecision(
                cData["totalSupply"],
                cData["PRE_VOTE_MIN_PCT_TO_WIN"]
            ) / 100n;
        cData["MIN_STAKE"] = contractStatusOmoc.data.votingmachine.MIN_STAKE;
        cData["MIN_PCT_FOR_QUORUM"] =
            contractStatusOmoc.data.votingmachine.MIN_PCT_FOR_QUORUM;
        cData["MIN_FOR_QUORUM"] =
            mulPrecision(cData["totalSupply"], cData["MIN_PCT_FOR_QUORUM"]) /
            100n;
        cData["VOTE_MIN_PCT_TO_VETO"] =
            contractStatusOmoc.data.votingmachine.VOTE_MIN_PCT_TO_VETO;
        cData["VOTE_MIN_TO_VETO"] =
            mulPrecision(cData["totalSupply"], cData["VOTE_MIN_PCT_TO_VETO"]) /
            100n;

        // Voting Data
        const [
            winnerProposal,
            inFavorVotes,
            againstVotes,
            votingExpirationTime,
        ] = contractStatusOmoc.data.votingmachine.getVotingData;
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
            contractStatusOmoc.data.votingmachine.getVoteInfo;

        cData["votingInfo"]["winnerProposal"] = infoWinnerProposal;
        cData["votingInfo"]["inFavorVotes"] = infoInFavorVotes;
        cData["votingInfo"]["againstVotes"] = infoAgainstVotes;
        setInfoVoting(cData);

        const cDataUser: InfoUser = { ...infoUser };
        let vUsing: any;
        if (isVestingLoaded()) {
            vUsing = userVesting.data.vestingmachine.staking;
        } else {
            vUsing = userOmocBalance.data.stakingmachine;
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
        cDataUser["InfoUserTC"] = [];
        contractsAddress.CollateralToken.forEach((tc, index) => {
            const tokenInfo: InfoUserTC = {
                address: tc.address,
                name: TokenSettings("TC_" + index).name,
                balance: userBalance.data[index].TC.balance,
                lockedAmount: 0n,
                vetoingPower: 0n,
            };
            cDataUser["InfoUserTC"].push(tokenInfo);
        });
        setInfoUser(cDataUser);
    };

    return (
        <div className="section-container">
            {/* <div className="content-page"> */}
            <div className={"layout-card"}>
                <div className={"layout-card-title"}>
                    <h1>{"Veto with Collateral"}</h1>
                </div>
                <div className="section voting">
                    <div className="votingDetails__wrapper">
                        <div className={"layout-card-title"}>
                            <h1>{t("voting.cardTitle.votingStage")}</h1>
                        </div>

                        <div className="details">
                            <div className="title">
                                {infoVoting.votingData["winnerProposal"]}
                            </div>

                            <div className="externalLink">
                                <a
                                    className="forumLink"
                                    href={`https://forum.moneyonchain.com/search?q=${infoVoting.votingData["winnerProposal"]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t("voting.info.searchForum")}
                                    <div className="icon-external-link"></div>
                                </a>
                            </div>

                            <div className="externalLink">
                                <a
                                    className="forumLink"
                                    href={`https://rootstock.blockscout.com/address/${infoVoting.votingData["winnerProposal"]}?tab=contract`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t("voting.info.changeContract")}
                                    <span className="icon-external-link"></span>
                                </a>
                            </div>
                        </div>
                        <div className="voting__status__container">
                            <div className="graphs">
                                <p className="voting__status">
                                    {t("voting.info.stateAs")}
                                    <span>
                                        {
                                            infoVoting["votingData"][
                                                "votingExpirationTimeFormat"
                                            ]
                                        }
                                    </span>
                                </p>
                                <BalanceBar
                                    key="1"
                                    infavor={
                                        infoVoting["votingData"][
                                            "inFavorVotesPCT"
                                        ] ?? 0n
                                    }
                                    against={
                                        infoVoting["votingData"][
                                            "againstVotesPCT"
                                        ] ?? 0n
                                    }
                                    infavorVotes={
                                        infoVoting["votingData"]["inFavorVotes"]
                                    }
                                    againstVotes={
                                        infoVoting["votingData"]["againstVotes"]
                                    }
                                />
                                <div className="voting__status__graphs">
                                    <CompletedBar
                                        key={1}
                                        description={
                                            "Collateral-Backed Votes Supporting Veto"
                                        }
                                        percentage={10n}
                                        needed={10n * 10n ** 18n}
                                        type={"brand"}
                                        label1={"veto casted"}
                                        amount1={10n * 10n ** 18n}
                                        percentage1={10n * 10n ** 18n}
                                    />
                                </div>
                            </div>
                            <div className="cta">
                                <div className="cta-container">
                                    <button
                                        className="button secondary vetoPage__backBtn"
                                        onClick={() => navigate("/voting")}
                                    >
                                        Back to Governance Voting
                                    </button>
                                </div>
                            </div>
                        </div>
                        {infoUser["InfoUserTC"].map((tc: any) => (
                            <VetoTokenCard key={tc.address} token={tc} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Veto;

const VetoTokenCard: React.FC<{ token: any }> = ({ token }) => {
    const { t } = useProjectTranslation();
    const space = "\u00A0";

    return (
        <div className="vetoPage__tokenTitle">
            {token.name} vetoing
            <div className="voting__status__container vetoContainer">
                <div className="graphs">
                    <div className="vetoPage__tokenInfo">
                        <div>
                            Voting power {space} 5.0 tokens 5000000000000000000
                            wei
                        </div>
                        <div>
                            Total {token.name} {space} in circulation{space}
                            <span>
                                480.0 tokens (480000000000000000000 wei)
                            </span>
                        </div>
                        <div>
                            {t(`voting.veto.row.totalSupply`)}
                            {space}
                            <span>1.041666 %</span>
                        </div>
                    </div>
                </div>
                <div className="cta">
                    <div className="cta-container vetoCTA">
                        <button className="button vetoBtn">
                            <div className="icon icon__vote__veto"></div>
                            {t(`voting.veto.row.ctaVeto`)}
                            {space}
                            {token.name}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const VetoGraph: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useProjectTranslation();
    return (
        <div className="voting__status__container">
            <div className="graphs">
                <div className="voting__status__graphs">
                    <CompletedBar
                        key={4}
                        description={t("voting.veto.outsideVetoing.statsTitle")}
                        percentage={10n}
                        needed={10n * 10n ** 18n}
                        type={"brand"}
                        label1={t("voting.veto.outsideVetoing.statsLabel")}
                        amount1={10n * 10n ** 18n}
                        percentage1={10n * 10n ** 18n}
                    />
                </div>
            </div>
            <div className="cta">
                <div className="votingButtons">
                    <button
                        className="button"
                        onClick={() => navigate("/veto")}
                        disabled={false}
                    >
                        <div className="icon icon__vote__veto"></div>
                        {t("voting.veto.outsideVetoing.cta")}
                    </button>
                </div>
            </div>
        </div>
    );
};
