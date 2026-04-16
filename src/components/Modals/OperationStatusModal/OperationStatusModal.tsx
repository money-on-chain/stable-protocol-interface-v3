import Modal from "antd/lib/modal/Modal";
import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import CopyAddress from "../../CopyAddress";

interface OperationStatusModalProps {
    className?: string;
    visible?: boolean;
    onCancel: () => void;
    title?: string;
    operationStatus?: string;
    txHash?: string;
}

const OperationStatusModal: React.FC<OperationStatusModalProps> = ({
    className,
    visible,
    onCancel,
    title,
    operationStatus,
    txHash,
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

            <div
                className="tx-amount-group"
                data-testid="operation-status-modal"
            >
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
                    {" "}
                    <div className="tx-feedback-container">
                        <div className="tx-feedback-icon tx-logo-status">
                            <div className={sentIcon}></div>
                        </div>
                        <p
                            className="tx-feedback-text"
                            data-testid={`operation-status-state-${operationStatus || "sign"}`}
                        >
                            {statusLabel}
                        </p>
                    </div>
                    <button
                        data-testid="operation-status-close"
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

export default OperationStatusModal;
