import Modal from "antd/lib/modal/Modal";
import React from "react";

import { useProjectTranslation } from "../../helpers/translations";
import OperationProgressList from "../OperationProgressList/OperationProgressList";
import type { OperationProgressStep } from "../OperationProgressList/types";

interface OperationProgressModalProps {
    visible: boolean;
    title: string;
    steps: OperationProgressStep[];
    onClose: () => void;
}

export default function OperationProgressModal({
    visible,
    title,
    steps,
    onClose,
}: OperationProgressModalProps): React.ReactElement {
    const { t } = useProjectTranslation();

    const isDone =
        steps.length > 0 &&
        (steps.every((s) => s.status === "completed") ||
            steps.some((s) => s.status === "failed"));

    return (
        <Modal
            className="operation-progress-modal"
            footer={null}
            open={visible}
            onCancel={onClose}
            closable={isDone}
            maskClosable={false}
        >
            <h1 className="operation-progress-modal__title">{title}</h1>
            <OperationProgressList
                className="operation-progress-modal__list"
                steps={steps}
            />
            {isDone && (
                <div className="operation-progress-modal__actions">
                    <button
                        className="button secondary"
                        onClick={onClose}
                        type="button"
                    >
                        {t("staking.modal.StatusModal_Modal_Close")}
                    </button>
                </div>
            )}
        </Modal>
    );
}
