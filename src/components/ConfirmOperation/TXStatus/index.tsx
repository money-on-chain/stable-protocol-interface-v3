import React from "react";
import PropTypes from "prop-types";
import "./Styles.scss";

interface StatusData {
    status: string;
}

interface StatusLabels {
    SIGN?: string;
    QUEUING?: string;
    QUEUED?: string;
    CONFIRMING?: string;
    SUCCESS?: string;
    ERROR?: string;
    [key: string]: string | undefined;
}

interface TXStatusProps {
    statusData: StatusData;
    statusLabels: StatusLabels;
}

type StepType = "SIGN" | "QUEUING" | "QUEUED" | "SUCCESS";

export default function TXStatus({ statusData, statusLabels }: TXStatusProps): JSX.Element {
    const { status } = statusData;

    // List of steps in order
    const steps: StepType[] = ["SIGN", "QUEUING", "QUEUED", "SUCCESS"];

    // Get the index of the current step
    const stepIndex: number = steps.indexOf(status as StepType);

    // Mapping of statuses to icon classes
    const statusIcons: { [key: string]: string } = {
        SIGN: "icon-tx-signWallet",
        QUEUING: "icon-operation-tx-queuing",
        QUEUED: "icon-operation-tx-queued",
        CONFIRMING: "tx-status-icon-CONFIRMING",
        SUCCESS: "tx-status-icon-CONFIRMED",
        ERROR: "tx-status-icon-FAILED",
    };

    return (
        <div className="tx-container">
            {/* Handle SUCCESS case */}
            {status === "SUCCESS" ? (
                <div className="tx-success">
                    <div
                        className={`tx-success__icon tx-feedback-icon ${statusIcons[status] || "icon-waiting"} tx-status-icon-CONFIRMED`}
                    ></div>
                    <span className="tx-success__message">
                        {statusLabels.SUCCESS || "Transaction successful!"}
                    </span>
                </div>
            ) : status === "ERROR" ? (
                /* Handle ERROR case */
                <div className="tx-error">
                    <div
                        className={`tx-error__icon tx-feedback-icon ${statusIcons[status] || "icon-waiting"}`}
                    ></div>
                    <span className="tx-error__message">
                        {statusLabels.ERROR || "Transaction failed"}
                    </span>
                </div>
            ) : (
                /* Default case: Show step-by-step progress */
                <div className="txSteps-container">
                    {steps.map((step: StepType, index: number) => {
                        let stepClass: string = "stepRow txSteps--todo";
                        let iconClass: string = "icon-tx-checkUnchecked"; // Default icon
                        let label: string = statusLabels[step] || step;

                        if (index < stepIndex) {
                            stepClass = "stepRow txSteps--done";
                            iconClass = "icon-tx-checkChecked"; // Mark as completed
                        } else if (index === stepIndex) {
                            stepClass = "stepRow txSteps--doing";
                            iconClass = "icon-tx-inProgress"; // Show in progress
                        }

                        return (
                            <div key={step} className={stepClass}>
                                <div
                                    className={`txSteps__icon ${iconClass}`}
                                ></div>
                                {label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

TXStatus.propTypes = {
    statusData: PropTypes.object,
    statusLabels: PropTypes.object,
};
