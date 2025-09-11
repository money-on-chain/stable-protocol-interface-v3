import React, { Fragment, useContext, useEffect, useState } from "react";
import Proposals from "../Proposals";
import Vote from "../Vote";
import { formatTimestamp } from "../../../helpers/staking";
import { useProjectTranslation } from "../../../helpers/translations";
import { useWalletContext } from "../../../context/Wallet";
import { mulPrecision, divPrecision } from "../../../helpers/precision";
import VetoStatusModal from "../../Modals/VetoStatusModal/VetoStatusModal";

import "../Styles.scss";
import { useNavigate } from "react-router-dom";
import BalanceBar from "../BalanceBar";
import CompletedBar from "../CompletedBar";
import { TokenConfig, TokenSettings } from "../../../helpers/currencies";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import ModalAllowanceOperation from "../../Modals/Allowance";

const PRECISION_DECIMALS = 18n;
const DECIMALS_18 = 10n ** PRECISION_DECIMALS;

interface VotingData {
    winnerProposal: string;
    inFavorVotes: bigint;
    againstVotes: bigint;
    votingExpirationTime: bigint;
    expired: boolean;
    totalVoted: bigint;
    votingExpirationTimeFormat?: string;
    inFavorVotesPCT: bigint;
    againstVotesPCT: bigint;
    totalVetoPCT: bigint;
}
interface InfoVoting {
    VOTE_MIN_PCT_TO_VETO: bigint;
    state: number;
    votingData: VotingData;
}

interface InfoUser {
    InfoUserTC: InfoUserTC[];
}
interface InfoUserTC {
    index: number;
    address: string;
    settings: TokenConfig;
    proposal: string;
    allowance: bigint;
    balance: bigint;
    votingPower: bigint;
}

const Veto: React.FC = () => {
    const { t, i18n, ns } = useProjectTranslation();
    const navigate = useNavigate();

    const {
        interfaceVetoVote,
        userOmocBalance,
        contractStatusOmoc,
        userBalance,
        contractsAddress,
        userVeto,
    } = useWalletContext();

    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);
    const [modalTitle, setModalTitle] = useState<string>("Veto Proposal");
    const [showProposalModal, setShowProposalModal] = useState<boolean>(false);
    const [showModalAllowance, setShowModalAllowance] =
        useState<boolean>(false);
    const [txHash, setTxHash] = useState<string>("");
    const [operationStatus, setOperationStatus] = useState<string>("sign");

    const nowTimestamp: bigint = BigInt(Date.now());
    const defaultInfoVoting: InfoVoting = {
        VOTE_MIN_PCT_TO_VETO: 0n,
        state: 0,
        votingData: {
            winnerProposal: "",
            inFavorVotes: 0n,
            againstVotes: 0n,
            votingExpirationTime: 0n,
            expired: true,
            totalVoted: 0n,
            inFavorVotesPCT: 0n,
            againstVotesPCT: 0n,
            totalVetoPCT: 0n,
        },
    };
    const [infoVoting, setInfoVoting] = useState<InfoVoting>(defaultInfoVoting);

    const defaultInfoUser: InfoUser = {
        InfoUserTC: [],
    };
    const [infoUser, setInfoUser] = useState<InfoUser>(defaultInfoUser);
    const defaultInfoUserTC: InfoUserTC = {
        index: 0,
        address: "",
        settings: TokenSettings("TC_0"),
        proposal: "",
        allowance: 0n,
        balance: 0n,
        votingPower: 0n,
    };
    const [infoUserTC, setInfoUserTC] = useState<InfoUserTC>(defaultInfoUserTC);

    useEffect(() => {
        if (
            contractStatusOmoc.data &&
            userOmocBalance.data &&
            userVeto.data &&
            userBalance.data
        ) {
            refreshData();
        }
    }, [
        contractStatusOmoc.data,
        userOmocBalance.data,
        userVeto.data,
        userBalance.data,
    ]);

    const refreshData = (): void => {
        if (!contractStatusOmoc.data) return;
        if (!userOmocBalance.data) return;
        if (!userVeto.data) return;
        if (!userBalance.data) return;

        const cData: InfoVoting = { ...infoVoting };
        cData["state"] = Number(contractStatusOmoc.data.votingmachine.getState);
        cData["VOTE_MIN_PCT_TO_VETO"] =
            contractStatusOmoc.data.votingmachine.VOTE_MIN_PCT_TO_VETO;

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

        cData["votingData"]["inFavorVotesPCT"] = divPrecision(
            cData["votingData"]["inFavorVotes"] * 100n,
            cData["votingData"]["totalVoted"]
        );
        cData["votingData"]["againstVotesPCT"] = divPrecision(
            cData["votingData"]["againstVotes"] * 100n,
            cData["votingData"]["totalVoted"]
        );

        cData["votingData"]["totalVetoPCT"] =
            contractStatusOmoc.data.vetomachine.getVetoPctForWinnerProposal;
        setInfoVoting(cData);

        const cDataUser: InfoUser = { ...infoUser };
        cDataUser["InfoUserTC"] = [];

        contractsAddress.CollateralToken.forEach((tc, index) => {
            const tokenInfo: InfoUserTC = {
                index,
                address: tc.address,
                settings: TokenSettings("TC_" + index),
                allowance:
                    userVeto.data.vetoMachine.allowance[tc.address] || 0n,
                balance: userBalance.data[index].TC.balance,
                proposal: infoVoting.votingData["winnerProposal"],
                votingPower:
                    userVeto.data.vetoMachine.getVotingPower[tc.address] || 0n,
            };
            cDataUser["InfoUserTC"].push(tokenInfo);
        });
        setInfoUser(cDataUser);
    };

    const onHideModalAllowance = (): void => {
        setShowModalAllowance(false);
    };

    const onShowModalAllowance = (): void => {
        setShowModalAllowance(true);
    };

    const showAllowance = (): boolean => {
        return infoUserTC.balance > infoUserTC.allowance;
    };

    const onAllowance = async (infoUserTC: InfoUserTC): Promise<void> => {
        setInfoUserTC(infoUserTC);
        // Show modal allowance
        if (showAllowance()) {
            onShowModalAllowance();
            return;
        }

        // If allowance is ok please send real operation transaction
        onVote(infoUserTC.proposal, infoUserTC.index);
    };

    const onRealSendTransaction = async (): Promise<void> => {
        onVote(infoUserTC.proposal, infoUserTC.index);
    };

    const onVote = async (proposal: string, index: number): Promise<void> => {
        setModalTitle("Veto proposal");
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

        await interfaceVetoVote(
            proposal,
            index,
            onTransaction,
            onReceipt,
            onError
        )
            .then((/*res*/) => {
                // Refresh status
                userOmocBalance.refetch();
                contractStatusOmoc.refetch();
                userVeto.refetch();
                userBalance.refetch();
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const VetoTokenCard: React.FC<{ token: any }> = ({ token }) => {
        const { t } = useProjectTranslation();
        const space = "\u00A0";

        return (
            <div className="vetoPage__tokenTitle">
                {token.settings.name} vetoing
                <div className="voting__status__container vetoContainer">
                    <div className="graphs">
                        <div className="vetoPage__tokenInfo">
                            <div>
                                {" "}
                                balance:{space}
                                {PrecisionNumbers({
                                    amount: token.balance,
                                    token: token.settings,
                                    decimals: parseInt(
                                        t("staking.display_decimals")
                                    ),
                                    i18n: i18n,
                                })}
                                {space}
                                tokens
                            </div>
                            <div>
                                <div>{`Voting power: ${mulPrecision(token.votingPower, 100n)} %`}</div>
                            </div>
                        </div>
                    </div>
                    <div className="cta">
                        <div className="cta-container vetoCTA">
                            <button
                                className="button vetoBtn"
                                disabled={token.balance === 0n}
                                onClick={() => onAllowance(token)}
                            >
                                <div className="icon icon__vote__veto"></div>
                                {t(`voting.veto.row.ctaVeto`)}
                                {space}
                                {token.settings.name}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
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
                                        ]
                                    }
                                    against={
                                        infoVoting["votingData"][
                                            "againstVotesPCT"
                                        ]
                                    }
                                    infavorVotes={
                                        infoVoting["votingData"]["inFavorVotes"]
                                    }
                                    againstVotes={
                                        infoVoting["votingData"]["againstVotes"]
                                    }
                                />
                                <div className="voting__status__graphs">
                                    <VetoBar infoVoting={infoVoting} />
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
                        {isOperationModalVisible && (
                            <VetoStatusModal
                                title={modalTitle}
                                visible={isOperationModalVisible}
                                onCancel={() =>
                                    setIsOperationModalVisible(false)
                                }
                                operationStatus={operationStatus}
                                txHash={txHash}
                                proposalChanger={
                                    infoVoting.votingData["winnerProposal"]
                                }
                                showProposal={showProposalModal}
                            />
                        )}
                        {showModalAllowance && (
                            <ModalAllowanceOperation
                                title={`${t("allowance.cardTitle")}  ${t(`exchange.tokens.${"TC_" + infoUserTC.index}.label`, { ns: ns })}`}
                                visible={showModalAllowance}
                                onHideModalAllowance={onHideModalAllowance}
                                currencyYouExchange={"TC_" + infoUserTC.index}
                                currencyYouReceive={"VM"}
                                amountYouExchangeLimit={infoUserTC.balance}
                                onRealSendTransaction={onRealSendTransaction}
                                disAllowance={false}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Veto;

const VetoBar: React.FC<{ infoVoting: any }> = ({ infoVoting }) => {
    const { t } = useProjectTranslation();
    return (
        <div className="voting__status__graphs">
            <CompletedBar
                key={4}
                description={t("voting.veto.outsideVetoing.statsTitle")}
                percentage={infoVoting["votingData"]["totalVetoPCT"] * 100n}
                needed={infoVoting["VOTE_MIN_PCT_TO_VETO"] * 100n}
                type={"brand"}
                label1={t("voting.veto.outsideVetoing.statsLabel")}
                amount1={infoVoting["votingData"]["totalVetoPCT"] * 100n}
                percentage1={infoVoting["votingData"]["totalVetoPCT"] * 100n}
            />
        </div>
    );
};

export const VetoGraph: React.FC<{ infoVoting: any }> = ({ infoVoting }) => {
    const navigate = useNavigate();
    const { t } = useProjectTranslation();
    return (
        <div className="voting__status__container">
            <div className="graphs">
                <VetoBar infoVoting={infoVoting} />
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
