import "./OperationProgressList.scss";

import { notification } from "antd";

import { useProjectTranslation } from "../../helpers/translations";
import type {
    OperationProgressListProps,
    OperationProgressStep,
    OperationStepStatus,
} from "./types";

const statusIconClass: Record<OperationStepStatus, string> = {
    pending: "icon-tx-checkUnchecked",
    waiting: "icon-tx-signWallet",
    processing: "icon-tx-inProgress",
    completed: "icon-tx-checkChecked",
    failed: "icon-tx-error",
};

const truncateHash = (hash: string): string => {
    if (hash.length <= 14) return hash;

    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
};

const getTransactionUrl = (step: OperationProgressStep): string | undefined => {
    if (step.linkUrl) return step.linkUrl;
    if (!step.txHash) return undefined;

    const explorerUrl: unknown = import.meta.env
        .REACT_APP_ENVIRONMENT_EXPLORER_URL;
    if (typeof explorerUrl !== "string" || explorerUrl === "") {
        return undefined;
    }

    return `${explorerUrl.replace(/\/$/, "")}/tx/${step.txHash}`;
};

export default function OperationProgressList({
    steps,
    className = "",
}: OperationProgressListProps): JSX.Element {
    const { t } = useProjectTranslation();

    const rootClassName = ["operation-progress-list", className]
        .filter(Boolean)
        .join(" ");

    const getStatusLabel = (status: OperationStepStatus): string =>
        t(`operationProgressList.status.${status}`);

    const copyHashToClipboard = (hash: string): void => {
        void navigator.clipboard.writeText(hash);
        notification.open({
            message: t("feedback.clipboardCopy"),
            description: `${hash} ${t("feedback.clipboardTo")}`,
            placement: "bottomRight",
            onClose: () => {
                notification.destroy();
            },
        });
    };

    const renderStepMeta = (
        step: OperationProgressStep
    ): JSX.Element | null => {
        const stateMessage =
            step.status === "failed"
                ? (step.errorMessage ?? step.statusMessages?.failed)
                : step.statusMessages?.[step.status];

        if (!step.txHash && !step.linkUrl && !stateMessage) return null;
        const transactionUrl = getTransactionUrl(step);

        return (
            <div className="operation-progress-list__meta">
                {step.txHash && (
                    <span className="operation-progress-list__transaction">
                        {transactionUrl ? (
                            <a
                                className="operation-progress-list__link"
                                href={transactionUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t("operationProgressList.transaction")}{" "}
                                {truncateHash(step.txHash)}
                            </a>
                        ) : (
                            <span className="operation-progress-list__hash">
                                {t("operationProgressList.transaction")}{" "}
                                {truncateHash(step.txHash)}
                            </span>
                        )}
                        <button
                            type="button"
                            className="operation-progress-list__copy-button"
                            onClick={() => {
                                copyHashToClipboard(step.txHash ?? "");
                            }}
                            aria-label={t("operationProgressList.copyHash")}
                            title={t("operationProgressList.copyHash")}
                        >
                            <i className="icon-copy" aria-hidden="true"></i>
                        </button>
                    </span>
                )}

                {!step.txHash && step.linkUrl ? (
                    <a
                        className="operation-progress-list__link"
                        href={step.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {t("operationProgressList.openLink")}
                    </a>
                ) : null}

                {stateMessage && (
                    <p
                        className={
                            step.status === "failed"
                                ? "operation-progress-list__error"
                                : "operation-progress-list__message"
                        }
                    >
                        {stateMessage}
                    </p>
                )}
            </div>
        );
    };

    return (
        <ol className={rootClassName}>
            {steps.map((step) => {
                const statusLabel = getStatusLabel(step.status);
                const iconClass =
                    step.iconClass ?? statusIconClass[step.status];
                const iconCustomClass = step.iconClass
                    ? "operation-progress-list__icon--custom"
                    : "";

                return (
                    <li
                        key={step.id}
                        className={`operation-progress-list__step operation-progress-list__step--${step.status}`}
                    >
                        <span
                            className="operation-progress-list__marker"
                            aria-label={statusLabel}
                            title={statusLabel}
                        >
                            <span
                                className={`operation-progress-list__icon ${iconCustomClass} ${iconClass}`}
                                aria-hidden="true"
                            ></span>
                        </span>

                        <div
                            className={[
                                "operation-progress-list__content",
                                step.description && "operation-progress-list__content--with-description",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                        >
                            <div className="operation-progress-list__header">
                                <span className="operation-progress-list__title">
                                    {step.title}
                                </span>
                                <span className="operation-progress-list__status">
                                    {statusLabel}
                                </span>
                            </div>

                            {step.description && (
                                <p className="operation-progress-list__description">
                                    {step.description}
                                </p>
                            )}

                            {renderStepMeta(step)}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
