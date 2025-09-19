import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";

interface AboutQueueProps {
    hideModal: () => void;
}

export default function AboutQueue(props: AboutQueueProps): React.ReactElement {
    const { t } = useProjectTranslation();

    function setStatusIcon(status: string): string {
        switch (status) {
            case t("operations.actions.statusQueuing"):
                return "QUEUING";
            case t("operations.actions.statusQueued"):
                return "QUEUED";
            case t("operations.actions.statusConfirming"):
                return "CONFIRMING";
            case t("operations.actions.statusConfirmed"):
                return "CONFIRMED";
            case t("operations.actions.statusFailed"):
                return "FAILED";
            default:
                return "QUEUING";
        }
    }
    
    return (
        <div className="queue-modal-container">
            <div className="status-list">
                <div className="row">
                    <div className="text">
                        {t("operations.aboutQueue.statusQueuing")}
                    </div>
                    <div
                        className="table-status-icon-cell"
                        style={{ display: "flex", alignItems: "center" }}
                    >
                        <div
                            className={`tx-status-icon-${setStatusIcon(t("operations.actions.statusQueuing"))}`}
                        />
                        <span className={`table-status-icon`}>
                            {t("operations.actions.statusQueuing")}
                        </span>
                    </div>
                </div>
                <div className="row">
                    <div className="text">
                        {t("operations.aboutQueue.statusQueued")}
                    </div>
                    <div
                        className="table-status-icon-cell"
                        style={{ display: "flex", alignItems: "center" }}
                    >
                        <div
                            className={`tx-status-icon-${setStatusIcon(t("operations.actions.statusQueued"))}`}
                        />
                        <span className={`table-status-icon`}>
                            {t("operations.actions.statusQueued")}
                        </span>
                    </div>
                </div>
                <div className="row">
                    <div className="text">
                        {t("operations.aboutQueue.statusConfirming")}
                    </div>
                    <div
                        className="table-status-icon-cell"
                        style={{ display: "flex", alignItems: "center" }}
                    >
                        <div
                            className={`tx-status-icon-${setStatusIcon(t("operations.actions.statusConfirming"))}`}
                        />
                        <span className={`table-status-icon`}>
                            {t("operations.actions.statusConfirming")}
                        </span>
                    </div>
                </div>
                <div className="row">
                    <div className="text">
                        {t("operations.aboutQueue.statusConfirmed")}
                    </div>
                    <div
                        className="table-status-icon-cell"
                        style={{ display: "flex", alignItems: "center" }}
                    >
                        <div
                            className={`tx-status-icon-${setStatusIcon(t("operations.actions.statusConfirmed"))}`}
                        />
                        <span className={`table-status-icon`}>
                            {t("operations.actions.statusConfirmed")}
                        </span>
                    </div>
                </div>
                <div className="row">
                    <div className="text">
                        {t("operations.aboutQueue.statusFailed")}
                    </div>
                    <div
                        className="table-status-icon-cell"
                        style={{ display: "flex", alignItems: "center" }}
                    >
                        <div
                            className={`tx-status-icon-${setStatusIcon(t("operations.actions.statusFailed"))}`}
                        />
                        <span
                            className={`table-status-icon table-status-icon-red`}
                        >
                            {t("operations.actions.statusFailed")}
                        </span>
                    </div>
                </div>
            </div>
            <div className="button-container">
                <button
                    type="button"
                    className="button"
                    onClick={props.hideModal}
                >
                    {t("wallet.cta.close")}
                </button>
            </div>
        </div>
    );
}
