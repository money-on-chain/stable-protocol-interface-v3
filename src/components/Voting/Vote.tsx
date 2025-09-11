import React, { Fragment, useEffect, useState } from "react";

import { useProjectTranslation } from "../../helpers/translations";
import CompletedBar from "./CompletedBar";
import BalanceBar from "./BalanceBar";
import VotingStatusModal from "../Modals/VotingStatusModal/VotingStatusModal";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import { useWalletContext } from "../../context/Wallet";
import { VetoGraph } from "./Veto";

const PRECISION_DECIMALS = 18n;
const DECIMALS_18 = 10n ** PRECISION_DECIMALS;

interface CreateBarGraphProps {
    id: number;
    description: string;
    percentage: bigint;
    needed: bigint;
    type: string;
    label1?: string;
    amount1?: bigint;
    percentage1?: bigint;
    label2?: string;
    amount2?: bigint;
    percentage2?: bigint;
    label3?: string;
    amount3?: bigint;
    percentage3?: bigint;
}

interface VoteProps {
    infoVoting: {
        votingData: {
            expired: boolean;
            totalVoted: bigint;
            totalVotedPCT: bigint;
            againstVotesTotalSupplyPCT: bigint;
            inFavorVotesTotalSupplyPCT: bigint;
            inFavorVotes: bigint;
            againstVotes: bigint;
            inFavorVotesPCT: bigint;
            againstVotesPCT: bigint;
            votingExpirationTimeFormat: string;
            winnerProposal: string;
        };
        MIN_FOR_QUORUM: bigint;
        MIN_PCT_FOR_QUORUM: bigint;
        VOTE_MIN_TO_VETO: bigint;
        VOTE_MIN_PCT_TO_VETO: bigint;
        totalSupply: bigint;
        readyToVoteStep: boolean;
        state: number;
    };
    infoUser: {
        Voting_Power: bigint;
        Voting_Power_PCT: bigint;
    };
}

function CreateBarGraph(props: CreateBarGraphProps): JSX.Element {
    return (
        <CompletedBar
            key={props.id}
            description={props.description}
            percentage={props.percentage}
            needed={props.needed}
            type={props.type}
            label1={props.label1}
            amount1={props.amount1}
            percentage1={props.percentage1}
            label2={props.label2}
            amount2={props.amount2}
            percentage2={props.percentage2}
            label3={props.label3}
            amount3={props.amount3}
            percentage3={props.percentage3}
        />
    );
}

function Vote(props: VoteProps): JSX.Element {
    const { infoVoting, infoUser } = props;
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);
    const [txHash, setTxHash] = useState<string>("");
    const [operationStatus, setOperationStatus] = useState<string>("sign");
    const [modalTitle, setModalTitle] = useState<string>("Voting Proposal");
    const [votingInFavorOrAgainstError, setVotingInFavorOrAgainstError] =
        useState<boolean>(false);
    const [voteInFavor, setVoteInFavor] = useState<boolean>(true);
    const [showProposalModal, setShowProposalModal] = useState<boolean>(false);

    const [votingFinish, setVotingFinish] = useState<boolean>(false);
    const [votingFinishReason, setVotingFinishReason] = useState<number>(0);

    const { t, i18n, ns } = useProjectTranslation();
    const {
        interfaceVotingVote,
        interfaceVotingVoteStep,
        interfaceVotingAcceptedStep,
        userOmocBalance,
        contractStatusOmoc,
    } = useWalletContext();
    const space = "\u00A0";

    useEffect(() => {
        onValidateVotingInFavorOrAgainst();
    }, [infoUser["Voting_Power"]]);

    useEffect(() => {
        refreshVotingFinish();
    }, [
        infoVoting["votingData"]["expired"],
        infoVoting["votingData"]["totalVoted"],
        infoVoting["votingData"]["againstVotesPCT"],
    ]);

    const refreshVotingFinish = (): void => {
        /* Voting Finish Reason */
        /* 0 - No reason */
        /* 1 - Success */
        /* 2 - No Quorum */
        /* 3 - Proposal rejected by votes against */
        /* 4 - Proposal vetoed by Collateral Token holders */

        if (
                infoVoting["votingData"]["totalVetoPCT"] * 100n >=
                    infoVoting["VOTE_MIN_PCT_TO_VETO"] * DECIMALS_18
            ) {
                setVotingFinishReason(4);
                setVotingFinish(true);
                setVotingInFavorOrAgainstError(true);
        } else if (infoVoting["votingData"]["expired"]) {
            setVotingFinish(true);
            setVotingInFavorOrAgainstError(true);
            if (
                infoVoting["votingData"]["totalVoted"] <
                infoVoting["MIN_FOR_QUORUM"] * DECIMALS_18
            ) {
                setVotingFinishReason(2);
            } else if (
                infoVoting["votingData"]["againstVotesPCT"] >=
                infoVoting["VOTE_MIN_TO_VETO"] * DECIMALS_18
            ) {
                setVotingFinishReason(3);
            } else {
                setVotingFinishReason(1);
            }
        }
    };

    const votingGraphs: CreateBarGraphProps[] = [
        {
            id: 1,
            description: t("voting.statusGraph.castOverCirculation"),
            percentage: infoVoting["votingData"]["totalVotedPCT"],
            needed: infoVoting["MIN_PCT_FOR_QUORUM"] * DECIMALS_18,
            type: "brand",
            label1: "Votes casted",
            amount1: infoVoting["votingData"]["totalVoted"],
            percentage1: infoVoting["votingData"]["totalVotedPCT"],
            label2: "Votes needed for Quroum",
            amount2: infoVoting["MIN_FOR_QUORUM"] * DECIMALS_18,
            percentage2: infoVoting["MIN_PCT_FOR_QUORUM"] * DECIMALS_18,
            label3: "Total circulating tokens",
            amount3: infoVoting["totalSupply"],
            percentage3: 100n * DECIMALS_18,
        },
        {
            id: 2,
            description: t("voting.statusGraph.negativeOverCirculation"),
            percentage: infoVoting["votingData"]["againstVotesTotalSupplyPCT"],
            needed: infoVoting["VOTE_MIN_PCT_TO_VETO"] * DECIMALS_18,
            type: "negative",
            label1: "Votes Against",
            amount1: infoVoting["votingData"]["againstVotes"],
            percentage1: infoVoting["votingData"]["againstVotesTotalSupplyPCT"],
            label2: "Votes needed to reject proposal",
            amount2: infoVoting["VOTE_MIN_TO_VETO"] * DECIMALS_18,
            percentage2: infoVoting["VOTE_MIN_PCT_TO_VETO"] * DECIMALS_18,
        },
        {
            id: 3,
            description: t("voting.statusGraph.positiveOverCirculation"),
            percentage: infoVoting["votingData"]["inFavorVotesTotalSupplyPCT"],
            needed: 0n,
            type: "positive",
            label1: "Votes in favor",
            amount1: infoVoting["votingData"]["inFavorVotes"],
            percentage1: infoVoting["votingData"]["inFavorVotesTotalSupplyPCT"],
        },
    ];

    const onVote = async (inFavor: boolean): Promise<void> => {
        console.log("onVote", inFavor);
        setModalTitle("Vote proposal");
        setVoteInFavor(inFavor);
        setShowProposalModal(true);

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction in Favor proposal...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (/*receipt*/): void => {
            console.log("Transaction in Favor proposal mined!...");
            setOperationStatus("success");
        };
        const onError = (error: any): void => {
            console.log("Transaction in Favor proposal error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVotingVote(inFavor, onTransaction, onReceipt, onError)
            .then((/*res*/) => {
                // Refresh status
                userOmocBalance.refetch();
                contractStatusOmoc.refetch();
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const onRunVoteStep = async (): Promise<void> => {
        setModalTitle("Vote Step");
        setShowProposalModal(false);

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction vote step ...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (/*receipt*/): void => {
            console.log("Transaction vote step mined!...");
            setOperationStatus("success");
        };
        const onError = (error: any): void => {
            console.log("Transaction vote step error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVotingVoteStep(onTransaction, onReceipt, onError)
            .then((/*res*/) => {
                // Refresh status
                userOmocBalance.refetch();
                contractStatusOmoc.refetch();
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const onRunAcceptedStep = async (): Promise<void> => {
        setModalTitle("Accepted Step");
        setShowProposalModal(false);

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction accepted step ...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (/*receipt*/): void => {
            console.log("Transaction accepted step mined!...");
            setOperationStatus("success");
        };
        const onError = (error: any): void => {
            console.log("Transaction accepted step error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVotingAcceptedStep(onTransaction, onReceipt, onError)
            .then((/*res*/) => {
                // Refresh status
                userOmocBalance.refetch();
                contractStatusOmoc.refetch();
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const onValidateVotingInFavorOrAgainst = (): boolean => {
        if (infoUser["Voting_Power"] <= 0n) {
            // You need at least voting power > 0
            setVotingInFavorOrAgainstError(true);
            return false;
        } else return true;
    };

    return (
        <Fragment>
            {/* STATUS */}
            <div className="votingStatus">
                <div className="votingStatus__round">
                    <div className="votingStatus__title">
                        {t("voting.status.title")}
                    </div>
                </div>

                {votingFinish && (
                    <div className="voting-finish">
                        {t("voting.status.finished")}
                    </div>
                )}

                {!votingFinish && (
                    <div className="voting-in-progress">
                        {t("voting.status.ongoing")}
                    </div>
                )}

                {votingFinishReason === 1 && (
                    <div className="voting-status">
                        {t("voting.status.approved")}
                    </div>
                )}

                {votingFinishReason === 2 && (
                    <div className="voting-status">
                        {t("voting.status.noQuorum")}
                    </div>
                )}

                {votingFinishReason === 3 && (
                    <div className="voting-status">
                        {t("voting.status.rejected")}
                    </div>
                )}

                {votingFinishReason === 4 && (
                    <div className="voting-status">
                        {t("voting.status.vetoed")}
                    </div>
                )}
            </div>
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
                                infoVoting["votingData"]["inFavorVotesPCT"]
                            }
                            against={
                                infoVoting["votingData"]["againstVotesPCT"]
                            }
                            infavorVotes={
                                infoVoting["votingData"]["inFavorVotes"]
                            }
                            againstVotes={
                                infoVoting["votingData"]["againstVotes"]
                            }
                        />
                        <div className="voting__status__graphs">
                            {votingGraphs.map(CreateBarGraph)}
                        </div>
                    </div>
                    <div className="cta">
                        <div className="cta-container">
                            {!infoVoting["readyToVoteStep"] && (
                                <>
                                    <div className="cta-info-group">
                                        <div className="cta-info-summary">
                                            {t("voting.userPower.votingPower")}
                                            {space}
                                            {PrecisionNumbers({
                                                amount: infoUser[
                                                    "Voting_Power"
                                                ],
                                                token: TokenSettings("TG"),
                                                decimals: 2,
                                                i18n: i18n,
                                            })}
                                            {t("staking.tokens.TG.abbr", {
                                                ns: ns,
                                            })}
                                            {space} {space}(
                                            {PrecisionNumbers({
                                                amount: infoUser[
                                                    "Voting_Power_PCT"
                                                ],
                                                token: TokenSettings("TG"),
                                                decimals: 4,
                                                i18n: i18n,
                                            })}
                                            %)
                                        </div>
                                    </div>
                                    <div className="cta-options-group votingButtons">
                                        <button
                                            className="button against"
                                            onClick={() => onVote(false)}
                                            disabled={
                                                votingInFavorOrAgainstError
                                            }
                                        >
                                            <div className="icon icon__vote__against"></div>
                                            {t("voting.votingOptions.against")}
                                        </button>
                                        <button
                                            className="button infavor"
                                            onClick={() => onVote(true)}
                                            disabled={
                                                votingInFavorOrAgainstError
                                            }
                                        >
                                            <div className="icon icon__vote__infavor"></div>
                                            {t("voting.votingOptions.inFavor")}
                                        </button>
                                    </div>
                                </>
                            )}
                            {infoVoting["readyToVoteStep"] &&
                                infoVoting["state"] !== 2 && (
                                    <>
                                        <div className="cta-info-group center">
                                            <div className="cta-info-detail">
                                                {t("voting.cta.infoAdvance")}
                                            </div>
                                            <div className="cta-info-summary "></div>
                                            <div className="cta-options-group">
                                                <button
                                                    className="button secondary"
                                                    onClick={onRunVoteStep}
                                                >
                                                    {t(
                                                        "voting.cta.btnPushNextStep"
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            {infoVoting["state"] === 2 && (
                                <div className="final-step-section">
                                    <div className="vote-info">
                                        {t("voting.cta.infoApplyChanges")}
                                    </div>
                                    <button
                                        className="button secondary"
                                        onClick={onRunAcceptedStep}
                                    >
                                        {t(
                                            "voting.cta.btnApplyChangesToContracts"
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {infoVoting["isVetoMachine"] && !infoVoting["readyToVoteStep"] && (
                    <VetoGraph infoVoting={infoVoting} />
                )}
                {isOperationModalVisible && (
                    <VotingStatusModal
                        title={modalTitle}
                        visible={isOperationModalVisible}
                        onCancel={() => setIsOperationModalVisible(false)}
                        operationStatus={operationStatus}
                        txHash={txHash}
                        proposalChanger={
                            infoVoting.votingData["winnerProposal"]
                        }
                        votingInFavor={voteInFavor}
                        showProposal={showProposalModal}
                    />
                )}
            </div>
        </Fragment>
    );
}

export default Vote;
