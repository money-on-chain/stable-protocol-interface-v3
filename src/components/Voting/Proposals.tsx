import React, { Fragment, useContext, useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import { Input } from "antd";
import Web3 from "web3";

import { useProjectTranslation } from "../../helpers/translations";
import Proposal from "./Proposal";
import VotingStatusModal from "../Modals/VotingStatusModal/VotingStatusModal";
import { AuthenticateContext } from "../../context/Auth";
import { formatTimestamp } from "../../helpers/staking";
import PreVote from "./PreVote";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";

interface ProposalData {
    id: number;
    changeContract: string;
    votingRound: BigNumber;
    votesPositive: BigNumber;
    votesPositivePCT: BigNumber;
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
    globalVotingRound: BigNumber;
    totalSupply: BigNumber;
    PRE_VOTE_MIN_PCT_TO_WIN: BigNumber;
    PRE_VOTE_MIN_TO_WIN: BigNumber;
    readyToPreVoteStep: number;
    MIN_STAKE: BigNumber;
}

interface InfoUser {
    Voting_Power: BigNumber;
    Voting_Power_PCT: BigNumber;
}

interface ProposalsProps {
    infoVoting: InfoVoting;
    infoUser: InfoUser;
}

interface AuthContext {
    interfaceVotingPreVote: (
        proposalAddress: string,
        onTransaction: (txHash: string) => void,
        onReceipt: () => void,
        onError: (error: any) => void
    ) => Promise<any>;
    interfaceVotingUnRegister: (
        proposalAddress: string,
        onTransaction: (txHash: string) => void,
        onReceipt: () => void,
        onError: (error: any) => void
    ) => Promise<any>;
    interfaceVotingPreVoteStep: (
        onTransaction: (txHash: string) => void,
        onReceipt: () => void,
        onError: (error: any) => void
    ) => Promise<any>;
    loadContractsStatusAndUserBalance: () => Promise<any>;
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
    const auth = useContext(AuthenticateContext) as AuthContext;
    const space: string = "\u00A0";

    useEffect(() => {
        onValidateSubmitProposal();
    }, [auth]);

    useEffect(() => {
        if (infoVoting["proposals"] != null) {
            refreshProposals();
        }
    }, [infoVoting["proposals"]]);

    const searchProposal = (proposalAddress: string): ProposalData => {
        let proposal: ProposalData = {
            id: 0,
            changeContract: "",
            votingRound: new BigNumber(0),
            votesPositive: new BigNumber(0),
            votesPositivePCT: new BigNumber(0),
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
        const nowTimestamp = new BigNumber(Date.now());
        let expirationTimestamp = 0;
        let votesPositivePCT = new BigNumber(0);
        let votesPositive = new BigNumber(0);
        let votingRound = new BigNumber(0);
        const showLastRoundProposal = true;

        let lenProp = 0;
        if (infoVoting["proposals"] != null)
            lenProp = Object.keys(infoVoting["proposals"]).length;
        for (let i = 0; i < lenProp; i++) {
            if (infoVoting["proposals"][i] != null) {
                expirationTimestamp = new BigNumber(
                    infoVoting["proposals"][i].expirationTimeStamp
                ).times(1000).toNumber();
                let expired = true;
                if (new BigNumber(expirationTimestamp).gt(nowTimestamp)) expired = false;

                let canUnregister = false;
                if (
                    new BigNumber(infoVoting["proposals"][i].votingRound).lt(
                        infoVoting["globalVotingRound"]
                    )
                )
                    canUnregister = true;

                votingRound = new BigNumber(
                    infoVoting["proposals"][i].votingRound
                );
                if (
                    votingRound.lt(infoVoting["globalVotingRound"]) &&
                    showLastRoundProposal
                )
                    continue;

                votesPositive = new BigNumber(
                    Web3.utils.fromWei(
                        infoVoting["proposals"][i].votes,
                        "ether"
                    )
                );

                votesPositivePCT = votesPositive
                    .times(100)
                    .div(infoVoting["totalSupply"]);

                let canRunStep = false;
                if (
                    votesPositivePCT.gte(
                        infoVoting["PRE_VOTE_MIN_PCT_TO_WIN"]
                    ) &&
                    infoVoting["readyToPreVoteStep"] === 1
                )
                    canRunStep = true;

                propData.push({
                    id: count,
                    changeContract: infoVoting["proposals"][i].proposalAddress,
                    votingRound: new BigNumber(
                        infoVoting["proposals"][i].votingRound
                    ),
                    votesPositive: votesPositive,
                    votesPositivePCT: votesPositivePCT,
                    expirationTimeStampFormat: formatTimestamp(
                        expirationTimestamp
                    ),
                    expired: expired,
                    canUnregister: canUnregister,
                    canRunStep: canRunStep,
                    canVote: !expired && infoVoting["readyToPreVoteStep"] === 0,
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
        if (infoUser["Voting_Power"].lt(infoVoting["MIN_STAKE"])) {
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

        await auth
            .interfaceVotingPreVote(
                addProposalAddress,
                onTransaction,
                onReceipt,
                onError
            )
            .then((/*res*/) => {
                // Refresh status
                auth.loadContractsStatusAndUserBalance().then((/*value*/) => {
                    console.log("Refresh user balance OK!");
                });
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

        await auth
            .interfaceVotingUnRegister(
                proposalAddress,
                onTransaction,
                onReceipt,
                onError
            )
            .then((/*res*/) => {
                // Refresh status
                auth.loadContractsStatusAndUserBalance().then((/*value*/) => {
                    console.log("Refresh user balance OK!");
                });
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

        await auth
            .interfaceVotingPreVoteStep(onTransaction, onReceipt, onError)
            .then((/*res*/) => {
                // Refresh status
                auth.loadContractsStatusAndUserBalance().then((/*value*/) => {
                    console.log("Refresh user balance OK!");
                });
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
                        infoVoting["readyToPreVoteStep"] === 1 && (
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
                {/* actionProposal === 'LIST' && infoVoting['readyToPreVoteStep'] === 0 && */}
                {actionProposal === "LIST" &&
                    infoVoting["readyToPreVoteStep"] === 0 && (
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