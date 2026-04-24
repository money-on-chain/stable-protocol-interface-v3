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
    borrowImpact?: "positive" | "neutral" | "negative";
    collateralImpact?: "positive" | "neutral" | "negative";
    currentUnit?: string;
    currentValue: string;
    nextUnit?: string;
    nextValue: string;
    repayImpact?: "positive" | "neutral" | "negative";
    showTrend?: boolean;
    title: string;
}

export interface BorrowPreviousLiquidation {
    amount: string;
    amountTicker: string;
    ctaLabel: string;
    liquidationPrice: string;
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
    previousLiquidation?: BorrowPreviousLiquidation;
    repayOperationMetrics: BorrowOperationMetric[];
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
