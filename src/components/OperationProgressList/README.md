# OperationProgressList

Reusable presentational component for rendering the progress of a multi-step operation.

The component is layout-agnostic and does not manage operation flow internally. The parent owns the state, updates each step status, and passes the updated `steps` array through props.

## Usage

```tsx
import OperationProgressList, {
    type OperationProgressStep,
} from "../../components/OperationProgressList";

const steps: OperationProgressStep[] = [
    {
        id: "approve-token-a",
        title: "Approve token A",
        description: "Allowance required before continuing.",
        status: "waiting",
        statusMessages: {
            waiting: "Please sign the allowance in your wallet.",
            processing: "Transaction sent. Waiting for confirmation.",
            completed: "Allowance confirmed.",
            failed: "Allowance failed. You can retry this step.",
        },
    },
    {
        id: "queuing",
        title: "Queuing",
        status: "processing",
        iconClass: "icon-operation-tx-queuing",
        statusMessages: {
            processing: "System is queueing the operation.",
            completed: "Operation entered the queue.",
        },
    },
];

<OperationProgressList steps={steps} />;
```

## Types

```ts
type OperationStepStatus =
    | "pending"
    | "waiting"
    | "processing"
    | "completed"
    | "failed";

interface OperationProgressStep {
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

interface OperationProgressListProps {
    steps: OperationProgressStep[];
    className?: string;
}
```

## Statuses

- `pending`: inactive step, not reached yet.
- `waiting`: user action is needed, usually a wallet signature.
- `processing`: operation is running or waiting for mining/confirmation.
- `completed`: step finished successfully.
- `failed`: step failed. The parent decides what happens next.

System-only steps can skip `waiting` and go directly from `pending` to `processing`.

## Messages

Use `statusMessages` to provide custom text for each status of each step.

For failed steps, `errorMessage` takes priority over `statusMessages.failed`. This keeps backwards compatibility and allows the parent to pass a runtime error message.

## Transaction Hashes And Links

When `txHash` is provided, the component renders a truncated transaction hash and a copy button.

If `linkUrl` is also provided, that URL is used as the link target. If `linkUrl` is omitted, the component builds a transaction URL from:

```ts
import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL + "/tx/" + txHash;
```

Use `linkUrl` for special explorer URLs, such as token/account pages.

## Custom Icons

Use `iconClass` to pass an existing SCSS icon class.

```ts
{
    id: "queued",
    title: "Queued",
    status: "processing",
    iconClass: "icon-operation-tx-queued",
}
```

If `iconClass` is omitted, the component uses the default icon for the current status.

## Notes

- Do not put blockchain, wallet, API, or sequencing logic inside this component.
- Previous completed steps remain visible as completed because the parent keeps them that way in `steps`.
- A failed step does not automatically fail the whole operation.
- The parent can retry, skip, complete, or reset any step by updating the `steps` prop.
