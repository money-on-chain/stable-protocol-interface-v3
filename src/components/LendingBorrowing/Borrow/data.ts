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
    repayWithCollateralImpact?: "positive" | "neutral" | "negative";
    showTrend?: boolean;
}

export interface BorrowPreviousLiquidation {
    amount: string;
    amountTicker: string;
    liquidationPrice: string;
}

export interface BorrowCardData {
    actions: BorrowCardAction[];
    borrowApy: string;
    borrowOperationMetrics: BorrowOperationMetric[];
    borrowTokenCode: string;
    borrowTokenDecimals: number;
    borrowTokenIconClassName: string;
    borrowTokenName: string;
    borrowTokenTicker: string;
    caIndex: number;
    collateralTokenCode: string;
    collateralTokenDecimals: number;
    collateralTokenIconClassName: string;
    collateralTokenName: string;
    collateralTokenTicker: string;
    collateralWalletBalance: string;
    currentDebt: BorrowCardMetric;
    depositedCollateral: BorrowCardMetric;
    id: string;
    liquidationDropPercentage: number;
    maxAvailable: BorrowCardMetric;
    depositCollateralOperationMetrics: BorrowOperationMetric[];
    previousLiquidation?: BorrowPreviousLiquidation;
    repayOperationMetrics: BorrowOperationMetric[];
    repayWithCollateralOperationMetrics: BorrowOperationMetric[];
}

export function parseMetricNumber(value: string): number {
    const parsedValue = Number(value.replace(/,/g, ""));

    return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

export const BORROW_ACTION_LABEL_KEYS: Record<BorrowCardActionId, string> = {
    borrow: "borrowing.actions.borrow",
    repay: "borrowing.actions.repay",
    "repay-with-collateral": "borrowing.actions.repayWithCollateral",
    "deposit-collateral": "borrowing.actions.depositCollateral",
    "withdraw-collateral": "borrowing.actions.withdrawCollateral",
};
