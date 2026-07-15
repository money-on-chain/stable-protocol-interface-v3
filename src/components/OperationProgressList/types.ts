export type OperationStepStatus =
    | "pending"
    | "waiting"
    | "processing"
    | "completed"
    | "failed";

export interface OperationProgressStep {
    id: string;
    title: string;
    description?: string;
    status: OperationStepStatus;
    statusMessages?: Partial<Record<OperationStepStatus, string>>;
    iconClass?: string;
    txHash?: string;
    linkUrl?: string;
    errorMessage?: string;
}

export interface OperationProgressListProps {
    steps: OperationProgressStep[];
    className?: string;
}
