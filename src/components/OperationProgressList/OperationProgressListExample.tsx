import React, { useEffect, useRef, useState } from "react";

import { useProjectTranslation } from "../../helpers/translations";
import OperationProgressList from "./OperationProgressList";
import type { OperationProgressStep, OperationStepStatus } from "./types";

const createInitialSteps = (
    t: ReturnType<typeof useProjectTranslation>["t"]
): OperationProgressStep[] => [
    {
        id: "approve-token-a",
        title: t("operationProgressList.example.approveTokenA.title"),
        description: t(
            "operationProgressList.example.approveTokenA.description"
        ),
        status: "pending",
    },
    {
        id: "approve-token-b",
        title: t("operationProgressList.example.approveTokenB.title"),
        description: t(
            "operationProgressList.example.approveTokenB.description"
        ),
        status: "pending",
    },
    {
        id: "deposit-collateral",
        title: t("operationProgressList.example.depositCollateral.title"),
        description: t(
            "operationProgressList.example.depositCollateral.description"
        ),
        status: "pending",
    },
    {
        id: "borrow-token",
        title: t("operationProgressList.example.borrowToken.title"),
        description: t("operationProgressList.example.borrowToken.description"),
        status: "pending",
    },
    {
        id: "operation-completed",
        title: t("operationProgressList.example.operationCompleted.title"),
        status: "pending",
    },
];

export default function OperationProgressListExample(): JSX.Element {
    const { t } = useProjectTranslation();
    const [steps, setSteps] = useState<OperationProgressStep[]>(() =>
        createInitialSteps(t)
    );
    const timeoutIds = useRef<number[]>([]);

    useEffect(() => {
        return () => {
            timeoutIds.current.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
        };
    }, []);

    const clearScheduledUpdates = (): void => {
        timeoutIds.current.forEach((timeoutId) => {
            window.clearTimeout(timeoutId);
        });
        timeoutIds.current = [];
    };

    const resetSteps = (): void => {
        clearScheduledUpdates();
        setSteps(createInitialSteps(t));
    };

    const updateStep = (
        id: OperationProgressStep["id"],
        status: OperationStepStatus,
        data: Partial<OperationProgressStep> = {}
    ): void => {
        setSteps((currentSteps) =>
            currentSteps.map((step) =>
                step.id === id ? { ...step, ...data, status } : step
            )
        );
    };

    const scheduleUpdate = (delay: number, update: () => void): void => {
        const timeoutId = window.setTimeout(update, delay);
        timeoutIds.current.push(timeoutId);
    };

    const runSuccessfulFlow = (): void => {
        resetSteps();
        scheduleUpdate(400, () => updateStep("approve-token-a", "waiting"));
        scheduleUpdate(1300, () => updateStep("approve-token-a", "processing"));
        scheduleUpdate(2400, () =>
            updateStep("approve-token-a", "completed", {
                txHash: "0x3f82a6d6fd29ed0c9a36aa1c4433ef9c5a2f517b3d8f5e885acfe40278f98a15",
            })
        );
        scheduleUpdate(3000, () => updateStep("approve-token-b", "waiting"));
        scheduleUpdate(3900, () => updateStep("approve-token-b", "processing"));
        scheduleUpdate(5000, () => updateStep("approve-token-b", "completed"));
        scheduleUpdate(5600, () =>
            updateStep("deposit-collateral", "processing")
        );
        scheduleUpdate(6900, () =>
            updateStep("deposit-collateral", "completed")
        );
        scheduleUpdate(7400, () => updateStep("borrow-token", "processing"));
        scheduleUpdate(8600, () => updateStep("borrow-token", "completed"));
        scheduleUpdate(9000, () =>
            updateStep("operation-completed", "completed")
        );
    };

    const runFailedFlow = (): void => {
        resetSteps();
        scheduleUpdate(400, () => updateStep("approve-token-a", "waiting"));
        scheduleUpdate(1300, () => updateStep("approve-token-a", "processing"));
        scheduleUpdate(2400, () => updateStep("approve-token-a", "completed"));
        scheduleUpdate(3100, () => updateStep("approve-token-b", "processing"));
        scheduleUpdate(4300, () =>
            updateStep("approve-token-b", "failed", {
                errorMessage: t("operationProgressList.example.failureMessage"),
            })
        );
    };

    return (
        <section className="operation-progress-list-example">
            <OperationProgressList steps={steps} />

            <div className="operation-progress-list-example__actions">
                <button type="button" onClick={runSuccessfulFlow}>
                    {t("operationProgressList.example.runSuccess")}
                </button>
                <button type="button" onClick={runFailedFlow}>
                    {t("operationProgressList.example.runFailure")}
                </button>
                <button type="button" onClick={resetSteps}>
                    {t("operationProgressList.example.reset")}
                </button>
            </div>
        </section>
    );
}
