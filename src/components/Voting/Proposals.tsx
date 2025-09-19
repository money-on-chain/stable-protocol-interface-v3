import { Input } from "antd";
import React, { Fragment, useEffect, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { divPrecision } from "../../helpers/precision";
import { formatTimestamp } from "../../helpers/staking";
import { useProjectTranslation } from "../../helpers/translations";
import VotingStatusModal from "../Modals/VotingStatusModal/VotingStatusModal";
import { PrecisionNumbers } from "../PrecisionNumbers";
import PreVote from "./PreVote";
import Proposal from "./Proposal";


interface ProposalData {
    id: number;
    changeContract: string;
    votingRound: bigint;
    votesPositive: bigint;
    votesPositivePCT: bigint;
    expirationTimeStampFormat: string;
    expired: boolean;
    canUnregister: boolean;
    canRunStep: boolean;
    canVote: boolean;
}

interface EmptyProposal {
    changeContract: string;
}

interface InfoVoting {
    proposals: any[];
    globalVotingRound: bigint;
    totalSupply: bigint;
    PRE_VOTE_MIN_PCT_TO_WIN: bigint;
    PRE_VOTE_MIN_TO_WIN: bigint;
    readyToPreVoteStep: boolean;
    MIN_STAKE: bigint;
}

interface InfoUser {
    Voting_Power: bigint;
    Voting_Power_PCT: bigint;
}

interface ProposalsProps {
    infoVoting: InfoVoting;
    infoUser: InfoUser;
}


const Proposals: React.FC<ProposalsProps> = (props) => {
    const { infoVoting, infoUser } = props;

    const emptyProposal: EmptyProposal = {
        changeContract: "",
    };
    const [actionProposal, setActionProposal] = useState<string>("LIST");
    const [viewProposal, setViewProposal] = useState<ProposalData | EmptyProposal>(emptyProposal);
    const [addProposalAddress, setAddProposalAddress] = useState<string>("");
    const [addProposalAddressError, setAddProposalAddressError] =
        useState<boolean>(false);
    const [addProposalAddressErrorText, setAddProposalAddressErrorText] =
        useState<string>("");
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);
    const [txHash, setTxHash] = useState<string>("");
    const [operationStatus, setOperationStatus] = useState<string>("sign");
    const [modalTitle, setModalTitle] = useState<string>("Proposal");
    const [proposalsData, setProposalsData] = useState<ProposalData[]>([]);

    const { t, i18n, ns } = useProjectTranslation();
    const { interfaceVotingPreVote, interfaceVotingUnRegister, interfaceVotingPreVoteStep, contractStatusOmoc, userOmocBalance, proposalCount } = useWalletContext()
    const space: string = "\u00A0";

    useEffect(() => {
        onValidateSubmitProposal();
    }, [contractStatusOmoc.data]);

    useEffect(() => {
        if (infoVoting["proposals"] != null) {
            refreshProposals();
        }
    }, [infoVoting["proposals"]]);

    const searchProposal = (proposalAddress: string): ProposalData => {
        let proposal: ProposalData = {
            id: 0,
            changeContract: "",
            votingRound: 0n,
            votesPositive: 0n,
            votesPositivePCT: 0n,
            expirationTimeStampFormat: "",
            expired: true,
            canUnregister: false,
            canRunStep: false,
            canVote: false,
        };
        for (let i = 0; i < proposalsData.length; i++) {
            if (
                proposalsData[i].changeContract.toLowerCase() ===
                proposalAddress.toLowerCase()
            ) {
                proposal = proposalsData[i];
            }
        }
        return proposal;
    };

    const refreshViewProposalData = (): void => {
        if (viewProposal.changeContract != null) {
            const proposal = searchProposal(viewProposal.changeContract);
            setViewProposal(proposal);
        }
    };

    const refreshProposals = (): void => {
        const propData: ProposalData[] = [];
        let count = 0;
        const nowTimestamp = BigInt(Date.now());
        let expirationTimestamp = 0n;
        let votesPositivePCT = 0n;
        let votesPositive = 0n;
        let votingRound = 0n;
        const showLastRoundProposal = true;

        let lenProp = 0;
        if (infoVoting["proposals"] != null)
            lenProp = Object.keys(infoVoting["proposals"]).length;
        for (let i = 0; i < lenProp; i++) {
            if (infoVoting["proposals"][i] != null) {

                const [proposalAddress, propVotingRound, propVotes, propExpirationTimeStamp] = infoVoting["proposals"][i];
                expirationTimestamp = propExpirationTimeStamp * 1000n;
                let expired = true;
                if (expirationTimestamp > nowTimestamp) expired = false;

                let canUnregister = false;
                if (
                    propVotingRound < infoVoting["globalVotingRound"]
                )
                    canUnregister = true;

                votingRound = propVotingRound;
                if (
                    votingRound < infoVoting["globalVotingRound"] &&
                    showLastRoundProposal
                )
                    continue;

                votesPositive = propVotes;                
                votesPositivePCT = divPrecision(votesPositive * 100n, infoVoting["totalSupply"]);

                let canRunStep = false;
                if (
                    votesPositivePCT >= infoVoting["PRE_VOTE_MIN_PCT_TO_WIN"] &&
                    infoVoting["readyToPreVoteStep"]
                )
                    canRunStep = true;

                propData.push({
                    id: count,
                    changeContract: proposalAddress,
                    votingRound: propVotingRound,
                    votesPositive: votesPositive,
                    votesPositivePCT: votesPositivePCT,
                    expirationTimeStampFormat: formatTimestamp(
                        Number(expirationTimestamp)
                    ),
                    expired: expired,
                    canUnregister: canUnregister,
                    canRunStep: canRunStep,
                    canVote: !expired && !infoVoting["readyToPreVoteStep"],
                });
                count += 1;
            }
        }
        setProposalsData(propData);

        // Also refresh proposal view data
        refreshViewProposalData();
    };

    const onChangeInputAddProposal = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setAddProposalAddress(e.target.value.toLowerCase());
        onValidateAddProposalClear();
    };

    const onValidateAddProposalClear = (): void => {
        setAddProposalAddressErrorText("");
        setAddProposalAddressError(false);
    };

    const onValidateAddressProposal = (): boolean => {
        // 1. Input address valid
        if (addProposalAddress === "") {
            setAddProposalAddressErrorText("Proposal address can not be empty");
            setAddProposalAddressError(true);
            return false;
        } else if (
            addProposalAddress.length < 42 ||
            addProposalAddress.length > 42
        ) {
            setAddProposalAddressErrorText("Not valid input proposal address");
            setAddProposalAddressError(true);
            return false;
        }

        return true;
    };

    const onValidateSubmitProposal = (): boolean => {
        if (infoUser["Voting_Power"] < infoVoting["MIN_STAKE"]) {
            setAddProposalAddressErrorText(
                // `You need at least ${infoVoting['MIN_STAKE'].toString()} amount of tokens to submit the proposal`
                "Not enough balance. See below."
            );
            setAddProposalAddressError(true);
            return false;
        } else return true;
    };

    const addProposal = (): void => {
        const valid = onValidateAddressProposal() && onValidateSubmitProposal();
        if (valid) {
            onSendAddProposal()
                .then((/*res*/) => {})
                .catch((e) => {
                    console.error(e);
                });
        }
    };

    const onAddProposal = (e: React.MouseEvent): void => {
        e.stopPropagation();
        addProposal();
    };

    const onShowAddProposal = (e: React.MouseEvent): void => {
        e.stopPropagation();
        setActionProposal("ADD");
    };

    const onCloseAddProposal = (): void => {
        setActionProposal("LIST");
    };

    const onSendAddProposal = async (): Promise<void> => {
        setModalTitle("Adding proposal");

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction add proposal...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (): void => {
            console.log("Transaction add proposal mined!...");
            setOperationStatus("success");
            /*
            // Events name list
            const filter = [
                'OperationError',
                'UnhandledError',
                'OperationQueued',
                'OperationExecuted'
            ];

            const contractName = 'MocQueue';

            const txRcp = await auth.web3.eth.getTransactionReceipt(
                receipt.transactionHash
            );
            const filteredEvents = decodeEvents(txRcp, contractName, filter);
             */
            onCloseAddProposal();
        };
        const onError = (error: any): void => {
            console.log("Transaction add proposal error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVotingPreVote(
                addProposalAddress,
                onTransaction,
                onReceipt,
                onError
            )
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

    const onViewProposal = (changerAddr: string): void => {
        const proposal = searchProposal(changerAddr);
        setViewProposal(proposal);
        setActionProposal("VIEW_PROPOSAL");
    };

    const onBackToProposalList = (): void => {
        setViewProposal(emptyProposal);
        setActionProposal("LIST");
    };

    const onSendUnRegister = async (proposalAddress: string): Promise<void> => {
        setModalTitle("Unregister proposal");

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction unregister proposal...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (): void => {
            console.log("Transaction unregister proposal mined!...");
            setOperationStatus("success");
            /*
            // Events name list
            const filter = [
                'OperationError',
                'UnhandledError',
                'OperationQueued',
                'OperationExecuted'
            ];

            const contractName = 'MocQueue';

            const txRcp = await auth.web3.eth.getTransactionReceipt(
                receipt.transactionHash
            );
            const filteredEvents = decodeEvents(txRcp, contractName, filter);
             */
        };
        const onError = (error: any): void => {
            console.log("Transaction unregister proposal error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVotingUnRegister(
                proposalAddress,
                onTransaction,
                onReceipt,
                onError
            )
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

    const onUnRegisterProposal = (proposalAddress: string): void => {
        onSendUnRegister(proposalAddress)
            .then((/*res*/) => {})
            .catch((e) => {
                console.error(e);
            });
    };

    const onRunPreVoteStep = async (): Promise<void> => {
        setModalTitle("Pre-vote Step");

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction pre vote step ...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (): void => {
            console.log("Transaction pre vote step mined!...");
            setOperationStatus("success");
            /*
            // Events name list
            const filter = [
                'OperationError',
                'UnhandledError',
                'OperationQueued',
                'OperationExecuted'
            ];

            const contractName = 'MocQueue';

            const txRcp = await auth.web3.eth.getTransactionReceipt(
                receipt.transactionHash
            );
            const filteredEvents = decodeEvents(txRcp, contractName, filter);
             */
        };
        const onError = (error: any): void => {
            console.log("Transaction pre vote step error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVotingPreVoteStep(onTransaction, onReceipt, onError)
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

    return (
        <Fragment>
            {/* STATUS */}
            {actionProposal === "LIST" && (
                <div className="votingStatus">
                    <div className="votingStatus__title">
                        {t("voting.status.title")}
                    </div>
                    {actionProposal === "LIST" &&
                        proposalsData.length === 0 && (
                            <div className="votingStatus__round">
                                {t("voting.status.openForSubmissions")}
                            </div>
                        )}
                    {actionProposal === "LIST" && proposalsData.length > 0 && (
                        <div className="votingStatus__round">
                            {t("voting.status.active")}
                        </div>
                    )}
                    {actionProposal === "LIST" &&
                        proposalsData.length > 0 &&
                        infoVoting["readyToPreVoteStep"] && (
                            <div className="votingStatus__finished">
                                {t("voting.status.firstStageOver")}
                            </div>
                        )}
                </div>
            )}

            <div className="proposalsList__wrapper">
                <div className={"title"}>
                    <h1>{t("voting.cardTitle.proposalsList")}</h1>
                </div>                
                {/* PROPOSALS LIST */}
                {actionProposal === "LIST" &&
                    proposalsData.length > 0 &&
                    proposalsData.map((proposal) => (
                        <React.Fragment key={proposal.id}>
                            <Proposal
                                proposal={proposal}
                                infoVoting={infoVoting}
                                onViewProposal={onViewProposal}
                                onRunPreVoteStep={onRunPreVoteStep}
                            />
                        </React.Fragment>
                    ))}
                {actionProposal === "VIEW_PROPOSAL" &&
                    viewProposal.changeContract !== "" && (
                        <>
                            {/* <div className={'title'}>
                                <h1>{t('voting.cardTitle.proposalDetails')}</h1>
                            </div> */}
                            <div className="sectionPreVoting">
                                <PreVote
                                    proposal={viewProposal}
                                    infoVoting={infoVoting}
                                    infoUser={infoUser}
                                    onBack={onBackToProposalList}
                                    onUnRegisterProposal={onUnRegisterProposal}
                                    onRunPreVoteStep={onRunPreVoteStep}
                                />
                            </div>
                        </>
                    )}
                {/* actionProposal === 'LIST' && !infoVoting['readyToPreVoteStep'] && */}                
                {actionProposal === "LIST" &&
                    !infoVoting["readyToPreVoteStep"] && (
                        <> 
                            {actionProposal === "LIST" &&
                                proposalsData.length === 0 && (
                                    <div className="proposals__empty">
                                        {t("voting.feedback.noProposals")}
                                    </div>
                                )}
                            <div
                                className="button__addProposal"
                                onClick={onShowAddProposal}
                            >
                                <div className="icon__addProposal"></div>
                                {t("voting.cta.addNewProposal")}
                            </div>
                        </>
                    )}
                    {actionProposal === "ADD" && (
                    <div className="proposalsContainer">
                        <div className="addProposal">
                            <h2>{t("voting.cardTitle.addNewProposal")}</h2>
                            <div className="inputFields">
                                <div className="tokenSelector">
                                    <div className="amountInput">
                                        <div className="amountInput__infoBar">
                                            <div className="amountInput__label">
                                                {t(
                                                    "voting.labels.proposalChangerContract"
                                                )}
                                            </div>
                                        </div>
                                        <div className="proposal__add__text amountInput__amount">
                                            <Input
                                                type="text"
                                                placeholder="Changer address"
                                                className="proposal__add__input amountInput__value"
                                                onChange={
                                                    onChangeInputAddProposal
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="amountInput__feedback amountInput__feedback--error">
                                        {addProposalAddressError &&
                                            addProposalAddressErrorText !==
                                                "" && (
                                                <div
                                                    className={
                                                        "input-error amountInput__feedback amountInput__feedback--error"
                                                    }
                                                >
                                                    {
                                                        addProposalAddressErrorText
                                                    }
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                            <div className="cta-container">
                                <div className="cta-info-group">
                                    <div className="cta-info-detail">
                                        {t("voting.feedback.stakeRequiered1")}
                                        {space}
                                        {PrecisionNumbers({
                                            amount: infoVoting["MIN_STAKE"],
                                            token: TokenSettings("TG"),
                                            decimals: 2,
                                            i18n: i18n,
                                            //isInWei: false,
                                        })}
                                        {space}{" "}
                                        {t("voting.feedback.stakeRequiered2")}
                                    </div>
                                    <div className="cta-info-summary ">
                                        <div className="label">
                                            {t("voting.userPower.votingPower")}
                                        </div>

                                        <div className="data">
                                            {PrecisionNumbers({
                                                amount: infoUser[
                                                    "Voting_Power"
                                                ],
                                                token: TokenSettings("TG"),
                                                decimals: 2,
                                                i18n: i18n
                                            })}
                                            {space}
                                            {t("staking.tokens.TG.abbr", {
                                                ns: ns,
                                            })}
                                            {space}(
                                            {PrecisionNumbers({
                                                amount: infoUser[
                                                    "Voting_Power_PCT"
                                                ],
                                                token: TokenSettings("TG"),
                                                decimals: 4,                                                
                                                i18n: i18n                                                
                                            })}
                                            % )
                                        </div>
                                    </div>
                                </div>
                                <div className="cta-options-group">
                                    <button
                                        type="button"
                                        className="button secondary"
                                        onClick={onCloseAddProposal}
                                    >
                                        {t("voting.cta.cancel")}
                                    </button>
                                    <button
                                        type="button"
                                        className="button"
                                        onClick={onAddProposal}
                                        disabled={addProposalAddressError}
                                    >
                                        {t("voting.cta.addProposal")}
                                    </button>
                                </div>
                            </div>
                            <div className="wallet__vesting__options__buttons"></div>

                            <div className="additional-text"></div>
                        </div>
                    </div>
                )}
                {/*{infoVoting['readyToPreVoteStep'] === 1 && (*/}
                {/*    <div className="pre-vote-step">*/}
                {/*        <div className="pre-vote-info">Please run Step to advance to vote stage</div>*/}
                {/*        <button className="button secondary" onClick={onRunPreVoteStep}>*/}
                {/*            Run Step{' '}*/}
                {/*        </button>*/}
                {/*    </div>*/}
                {/*)}*/}
                {isOperationModalVisible && (
                    <VotingStatusModal
                        title={modalTitle}
                        visible={isOperationModalVisible}
                        onCancel={() => setIsOperationModalVisible(false)}
                        operationStatus={operationStatus}
                        txHash={txHash}
                        proposalChanger={""}
                        votingInFavor={true}
                        showProposal={false}
                    />
                )}
            </div>
        </Fragment>
    );
};

export default Proposals; 