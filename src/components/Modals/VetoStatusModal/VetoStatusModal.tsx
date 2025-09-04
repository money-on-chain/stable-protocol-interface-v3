import Modal from "antd/lib/modal/Modal";
import React, { Fragment } from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import CopyAddress from "../../CopyAddress";

interface VetoStatusModalProps {
    className?: string;
    visible?: boolean;
    onCancel: () => void;
    title?: string;
    operationStatus?: string;
    txHash?: string;
    proposalChanger?: string;
    showProposal?: boolean;
}

const VetoStatusModal: React.FC<VetoStatusModalProps> = ({
    className,
    visible,
    onCancel,
    title,
    operationStatus,
    txHash,
    proposalChanger,
    showProposal,
}) => {
    const { t } = useProjectTranslation();

    let sentIcon = "";
    let statusLabel = "";
    switch (operationStatus) {
        case "sign":
            sentIcon = "icon-tx-signWallet";
            statusLabel = t("staking.modal.StatusModal_Modal_TxStatus_sign");
            break;
        case "pending":
            sentIcon = "icon-tx-waiting";
            statusLabel = t("staking.modal.StatusModal_Modal_TxStatus_pending");
            break;
        case "success":
            sentIcon = "icon-tx-success";
            statusLabel = t("staking.modal.StatusModal_Modal_TxStatus_success");
            break;
        case "error":
            sentIcon = "icon-tx-error";
            statusLabel = t("staking.modal.StatusModal_Modal_TxStatus_failed");
            break;
        default:
            sentIcon = "icon-tx-waiting";
            statusLabel = t("staking.modal.StatusModal_Modal_TxStatus_sign");
    }

    return (
        <Modal
            className={"OperationStatusModal " + className || ""}
            footer={null}
            open={visible}
            onCancel={onCancel}
        >
            <h1 className={"StakingOptionsModal_Title"}>
                {title || t("staking.modal.StatusModal_Modal_Title")}
            </h1>

            <div className="ProposalVoteModal">
                {showProposal && (
                    <div className="proposalChanger__container">
                        <div className="proposalChanger__details">
                            <div className="proposalChanger__label">
                                {t("voting.confirmationModal.changerAddress")}
                            </div>
                            <div className="proposalChanger__data">
                                {proposalChanger}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="tx-amount-group">
                <div className="tx-id-container">
                    <div className="tx-id-data">
                        {(operationStatus === "pending" ||
                            operationStatus === "success") && (
                            <div className="transaction-id tx-id-container">
                                <div className="tx-id-label">
                                    {t("txFeedback.txIdLabel")}
                                </div>
                                <div className="tx-id-address">
                                    <CopyAddress
                                        address={txHash}
                                        type={"tx"}
                                    ></CopyAddress>
                                    {/*<span className="address">*/}
                                    {/*    {truncateTxId(txID)}*/}
                                    {/*</span>*/}
                                    {/*<i className="icon-copy"></i>*/}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="cta-container">
                    <div className="tx-feedback-container">
                        <div className="tx-feedback-icon tx-logo-status">
                            <div className={sentIcon}></div>
                        </div>
                        <p className="tx-feedback-text">{statusLabel}</p>
                    </div>
                    <button
                        type="button"
                        className="button secondary"
                        onClick={onCancel}
                    >
                        {t("staking.modal.StatusModal_Modal_Close")}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default VetoStatusModal;
