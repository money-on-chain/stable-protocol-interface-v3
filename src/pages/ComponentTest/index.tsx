import "./Styles.scss";

import { type ReactElement, useMemo, useState } from "react";

import OperationProgressList, {
    type OperationProgressStep,
    type OperationStepStatus,
} from "../../components/OperationProgressList";

const activeStatuses: OperationStepStatus[] = [
    "waiting",
    "processing",
    "failed",
];

const automaticStepIds = new Set<OperationProgressStep["id"]>([
    "queuing",
    "queued",
]);

const createInitialSteps = (): OperationProgressStep[] => [
    {
        id: "approve-token-a",
        title: "Approve token A",
        description: "Waiting for token A approval.",
        status: "waiting",
        statusMessages: {
            waiting: "Please sign the token A allowance in your wallet.",
            processing:
                "Allowance transaction sent. Waiting for block confirmation.",
            completed: "Token A allowance confirmed.",
            failed: "Token A allowance failed. You can retry this step.",
        },
    },
    {
        id: "approve-token-b",
        title: "Approve token B",
        description: "Second approval remains pending until reached.",
        status: "pending",
        statusMessages: {
            waiting: "Please sign the token B allowance in your wallet.",
            processing:
                "Allowance transaction sent. Waiting for block confirmation.",
            completed: "Token B allowance confirmed.",
            failed: "Token B allowance failed. This message is specific to token B.",
        },
    },
    {
        id: "deposit-collateral",
        title: "Deposit collateral",
        description: "Mock collateral deposit step.",
        status: "pending",
        statusMessages: {
            waiting: "Please sign the collateral deposit transaction.",
            processing: "Deposit transaction sent. Waiting for confirmation.",
            completed: "Collateral deposit confirmed.",
            failed: "Collateral deposit failed. Check collateral balance and retry.",
        },
    },
    {
        id: "queuing",
        title: "Queuing",
        description: "Automatic queue submission. Waiting for mining.",
        status: "pending",
        statusMessages: {
            processing:
                "System is queueing the operation. No wallet action needed.",
            completed: "Operation entered the queue.",
            failed: "Queue submission failed.",
        },
        iconClass: "icon-operation-tx-queuing",
    },
    {
        id: "queued",
        title: "Queued",
        description: "Automatic queue confirmation. Waiting for mining.",
        status: "pending",
        statusMessages: {
            processing:
                "System is waiting for the queued operation to be mined.",
            completed: "Queued operation confirmed.",
            failed: "Queued operation failed before confirmation.",
        },
        iconClass: "icon-operation-tx-queued",
    },
    {
        id: "borrow-token",
        title: "Borrow token",
        description: "Mock borrow transaction step.",
        status: "pending",
        statusMessages: {
            waiting: "Please sign the borrow transaction.",
            processing:
                "Borrow transaction sent. Waiting for block confirmation.",
            completed: "Borrow transaction confirmed.",
            failed: "Borrow transaction failed. This step can be handled independently.",
        },
    },
];

const getCurrentStepIndex = (steps: OperationProgressStep[]): number =>
    steps.findIndex((step) => activeStatuses.includes(step.status));

const getAdvanceButtonLabel = (
    currentStep: OperationProgressStep | null
): string => {
    if (!currentStep) return "Flow completed";
    if (currentStep.status === "waiting") return "Simulate user signature";
    if (currentStep.status === "processing") return "Confirm transaction";
    if (currentStep.status === "failed") return "Manually complete failed step";

    return "Advance current step";
};

export default function ComponentTest(): ReactElement {
    const [steps, setSteps] =
        useState<OperationProgressStep[]>(createInitialSteps);

    const currentStepIndex = useMemo(() => getCurrentStepIndex(steps), [steps]);
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
    const advanceButtonLabel = getAdvanceButtonLabel(currentStep);

    const advanceCurrentStep = (): void => {
        setSteps((currentSteps) => {
            const activeIndex = getCurrentStepIndex(currentSteps);
            if (activeIndex < 0) return currentSteps;
            const activeStep = currentSteps[activeIndex];

            if (activeStep.status === "waiting") {
                return currentSteps.map((step, index) =>
                    index === activeIndex
                        ? {
                              ...step,
                              status: "processing",
                              description:
                                  "User signed. Waiting for transaction confirmation.",
                              txHash: "0x3f82a6d6fd29ed0c9a36aa1c4433ef9c5a2f517b3d8f5e885acfe40278f98a15",
                              errorMessage: undefined,
                          }
                        : step
                );
            }

            const nextPendingIndex = currentSteps.findIndex(
                (step, index) =>
                    index > activeIndex && step.status === "pending"
            );

            return currentSteps.map((step, index) => {
                if (index === activeIndex) {
                    return {
                        ...step,
                        status: "completed",
                        description: "Transaction confirmed.",
                        errorMessage: undefined,
                    };
                }

                if (index === nextPendingIndex) {
                    return {
                        ...step,
                        status: automaticStepIds.has(step.id)
                            ? "processing"
                            : "waiting",
                        description: automaticStepIds.has(step.id)
                            ? "Automatic step running. Waiting for mining."
                            : step.description,
                    };
                }

                return step;
            });
        });
    };

    const failCurrentStep = (): void => {
        setSteps((currentSteps) => {
            const activeIndex = getCurrentStepIndex(currentSteps);
            if (activeIndex < 0) return currentSteps;

            return currentSteps.map((step, index) =>
                index === activeIndex
                    ? {
                          ...step,
                          status: "failed",
                          errorMessage:
                              step.statusMessages?.failed ??
                              "Mock error: this step failed during component testing.",
                      }
                    : step
            );
        });
    };

    const resetFlow = (): void => {
        setSteps(createInitialSteps());
    };

    return (
        <div className="component-test-page">
            <section className="component-test-page__header">
                <div>
                    <h1>OperationProgressList Test Page</h1>
                    <p>
                        Temporary local component test page. Safe to delete with
                        its route when no longer needed.
                    </p>
                </div>
            </section>

            <section className="component-test-page__workspace">
                <div className="component-test-page__panel">
                    <div className="component-test-page__status">
                        <span className="component-test-page__status-label">
                            Current step
                        </span>
                        <strong>
                            {currentStep
                                ? `${currentStep.title} (${currentStep.status})`
                                : "All steps completed"}
                        </strong>
                    </div>

                    <OperationProgressList steps={steps} />
                </div>

                <div className="component-test-page__controls">
                    <button
                        type="button"
                        className="component-test-page__button"
                        onClick={advanceCurrentStep}
                        disabled={!currentStep}
                    >
                        {advanceButtonLabel}
                    </button>
                    <button
                        type="button"
                        className="component-test-page__button component-test-page__button--danger"
                        onClick={failCurrentStep}
                        disabled={!currentStep}
                    >
                        Fail current step
                    </button>
                    <button
                        type="button"
                        className="component-test-page__button component-test-page__button--secondary"
                        onClick={resetFlow}
                    >
                        Reset
                    </button>
                </div>
            </section>
        </div>
    );
}
