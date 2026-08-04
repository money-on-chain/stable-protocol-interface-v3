import "./OperationProgressModal.scss";

import Modal from "antd/lib/modal/Modal";
import React from "react";

import { useProjectTranslation } from "../../helpers/translations";
import OperationProgressList from "../OperationProgressList/OperationProgressList";
import type { OperationProgressStep } from "../OperationProgressList/types";

interface OperationProgressModalProps {
    visible: boolean;
    title: string;
    steps: OperationProgressStep[];
    onCancel: () => void;
    onClose: () => void;
}

export default function OperationProgressModal({
    visible,
    title,
    steps,
    onCancel,
    onClose,
}: OperationProgressModalProps): React.ReactElement {
    const { t } = useProjectTranslation();

    const isDone =
        steps.length > 0 && (steps.every((s) => s.status === "completed") || steps.some((s) => s.status === "failed"));
    const contextualSteps = steps.map((step) => ({
        ...step,
        description:
            step.status === "waiting" ? step.description : t(`borrowing.operationProgress.descriptions.${step.status}`),
    }));
    const handleCancel = (): void => {
        if (!isDone) onCancel();
    };

    return (
        <Modal
            className="operation-progress-modal"
            footer={null}
            open={visible}
            onCancel={handleCancel}
            closable={false}
            keyboard={false}
            maskClosable={false}
        >
            <h1 className="operation-progress-modal__title">{title}</h1>
            <OperationProgressList className="operation-progress-modal__list" steps={contextualSteps} />
            <div className="operation-progress-modal__actions">
                <button className="button secondary" disabled={isDone} onClick={handleCancel} type="button">
                    {t("borrowing.operationProgress.actions.cancel")}
                </button>
                <button className="button" disabled={!isDone} onClick={onClose} type="button">
                    {t("borrowing.operationProgress.actions.close")}
                </button>
            </div>
        </Modal>
    );
}
