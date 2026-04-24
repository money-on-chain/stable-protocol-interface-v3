export interface BorrowCardMetric {
    value: string;
    ticker: string;
    valueUsd: string;
}

export type BorrowCardActionId =
    | "borrow"
    | "repay"
    | "repay-with-collateral"
    | "deposit-collateral"
    | "withdraw-collateral";

export interface BorrowCardAction {
    id: BorrowCardActionId;
    isPrimary?: boolean;
}

export interface BorrowOperationMetric {
    borrowImpact?: "improves" | "neutral" | "worsens";
    collateralImpact?: "improves" | "neutral" | "worsens";
    currentUnit?: string;
    currentValue: string;
    nextUnit?: string;
    nextValue: string;
    showTrend?: boolean;
    title: string;
}

export interface BorrowCardData {
    actions: BorrowCardAction[];
    borrowApy: string;
    borrowOperationMetrics: BorrowOperationMetric[];
    borrowTokenIconClassName: string;
    borrowTokenName: string;
    borrowTokenTicker: string;
    collateralTokenIconClassName: string;
    collateralTokenName: string;
    collateralTokenTicker: string;
    collateralWalletBalance: string;
    currentDebt: BorrowCardMetric;
    depositedCollateral: BorrowCardMetric;
    id: string;
    liquidationDropPercentage: number;
    maxAvailable: BorrowCardMetric;
}

export function parseMetricNumber(value: string): number {
    const parsedValue = Number(value.replace(/,/g, ""));

    return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

export const BORROW_ACTION_LABELS: Record<BorrowCardActionId, string> = {
    borrow: "Borrow",
    repay: "Repay",
    "repay-with-collateral": "Repay with Collateral",
    "deposit-collateral": "Deposit Collateral",
    "withdraw-collateral": "Withdraw Collateral",
};

export const BORROW_CARDS: BorrowCardData[] = [
    {
        id: "arsflip-borrow",
        borrowTokenIconClassName: "icon-token-tp_0 token-icon",
        borrowTokenName: "Argentine Peso",
        borrowTokenTicker: "ARSFLIP",
        collateralTokenIconClassName: "icon-token-ca_1 token-icon",
        collateralTokenName: "Dollar on Chain",
        collateralTokenTicker: "DOC",
        borrowApy: "0.40",
        collateralWalletBalance: "750.00",
        maxAvailable: {
            value: "12,450.00",
            ticker: "ARSFLIP",
            valueUsd: "10,000",
        },
        currentDebt: {
            value: "150,000.00",
            ticker: "ARSFLIP",
            valueUsd: "100.00",
        },
        depositedCollateral: {
            value: "300.00",
            ticker: "DOC",
            valueUsd: "300.00",
        },
        liquidationDropPercentage: 50,
        borrowOperationMetrics: [
            {
                borrowImpact: "worsens",
                collateralImpact: "improves",
                currentUnit: "ARSFLIP/DOC",
                currentValue: "1,250.00",
                nextUnit: "ARSFLIP/DOC",
                nextValue: "500.00",
                showTrend: true,
                title: "Liquidation Price",
            },
            {
                borrowImpact: "worsens",
                collateralImpact: "improves",
                currentUnit: "%",
                currentValue: "16.67",
                nextUnit: "%",
                nextValue: "66.67",
                showTrend: true,
                title: "Distance to Liquidation",
            },
            {
                borrowImpact: "neutral",
                collateralImpact: "neutral",
                currentUnit: "DOC",
                currentValue: "150.00",
                nextUnit: "DOC",
                nextValue: "150.00",
                title: "Min Required Collateral",
            },
            {
                borrowImpact: "worsens",
                collateralImpact: "improves",
                currentUnit: "ARSFLIP",
                currentValue: "150,000.00",
                nextUnit: "ARSFLIP",
                nextValue: "300,000.00",
                title: "Borrow Available W/Collateral",
            },
            {
                borrowImpact: "worsens",
                collateralImpact: "improves",
                currentUnit: "%",
                currentValue: "30.00",
                nextUnit: "%",
                nextValue: "22.22",
                title: "Borrow Usage",
            },
        ],
        actions: [
            { id: "borrow", isPrimary: true },
            { id: "repay" },
            { id: "repay-with-collateral" },
            { id: "deposit-collateral" },
            { id: "withdraw-collateral" },
        ],
    },
    {
        id: "copflip-borrow",
        borrowTokenIconClassName: "icon-token-tp_1 token-icon",
        borrowTokenName: "Colombian Peso",
        borrowTokenTicker: "COPFLIP",
        collateralTokenIconClassName: "icon-token-ca_1 token-icon",
        collateralTokenName: "Dollar On Chain",
        collateralTokenTicker: "DOC",
        borrowApy: "0.55",
        collateralWalletBalance: "425.00",
        maxAvailable: {
            value: "8,200.00",
            ticker: "COPFLIP",
            valueUsd: "1,950",
        },
        currentDebt: {
            value: "0.00",
            ticker: "COPFLIP",
            valueUsd: "0",
        },
        depositedCollateral: {
            value: "0.00",
            ticker: "DOC",
            valueUsd: "0",
        },
        liquidationDropPercentage: 42.5,
        borrowOperationMetrics: [
            {
                borrowImpact: "worsens",
                collateralImpact: "improves",
                currentUnit: "COPFLIP/DOC",
                currentValue: "- -",
                nextUnit: "COPFLIP/DOC",
                nextValue: "980.00",
                showTrend: true,
                title: "Liquidation Price",
            },
            {
                borrowImpact: "worsens",
                collateralImpact: "improves",
                currentUnit: "%",
                currentValue: "- -",
                nextUnit: "%",
                nextValue: "58.00",
                showTrend: true,
                title: "Distance to Liquidation",
            },
            {
                borrowImpact: "neutral",
                collateralImpact: "neutral",
                currentUnit: "DOC",
                currentValue: "0.00",
                nextUnit: "DOC",
                nextValue: "120.00",
                title: "Min Required Collateral",
            },
            {
                borrowImpact: "worsens",
                collateralImpact: "improves",
                currentUnit: "COPFLIP",
                currentValue: "0.00",
                nextUnit: "COPFLIP",
                nextValue: "8,200.00",
                title: "Borrow Available W/Collateral",
            },
            {
                borrowImpact: "worsens",
                collateralImpact: "improves",
                currentUnit: "%",
                currentValue: "0.00",
                nextUnit: "%",
                nextValue: "24.00",
                title: "Borrow Usage",
            },
        ],
        actions: [
            { id: "borrow", isPrimary: true },
            { id: "repay" },
            { id: "repay-with-collateral" },
            { id: "deposit-collateral" },
            { id: "withdraw-collateral" },
        ],
    },
];
