import type {
    BorrowCardData,
    BorrowCardMetric,
    BorrowPreviousLiquidation,
} from "../Borrow/data";
import { getLendingBorrowingTokenMetadata } from "../tokenMetadata";

type RawBorrowCardMetric = Omit<BorrowCardMetric, "ticker">;
type RawBorrowPreviousLiquidation = Omit<
    BorrowPreviousLiquidation,
    "amountTicker"
>;
type RawBorrowCardData = Omit<
    BorrowCardData,
    | "borrowTokenDecimals"
    | "borrowTokenIconClassName"
    | "borrowTokenName"
    | "borrowTokenTicker"
    | "borrowTokenWalletBalance"
    | "maxWithdrawableCollateral"
    | "collateralTokenDecimals"
    | "collateralTokenIconClassName"
    | "collateralTokenName"
    | "collateralTokenTicker"
    | "currentDebt"
    | "depositedCollateral"
    | "liquidationCoverage"
    | "maxAvailable"
    | "previousLiquidation"
> & {
    currentDebt: RawBorrowCardMetric;
    depositedCollateral: RawBorrowCardMetric;
    maxAvailable: RawBorrowCardMetric;
    previousLiquidation?: RawBorrowPreviousLiquidation;
};

const RAW_BORROW_CARDS: RawBorrowCardData[] = [
    {
        borrowTokenCode: "TP_0",
        id: "arsflip-borrow",
        caIndex: 1,
        collateralTokenCode: "CA_1",
        borrowApy: "0.40",
        collateralWalletBalance: "750.00",
        systemMaxBorrow: "150,000.00",
        maxAvailable: {
            value: "12,450.00",
            valueUsd: "10,000",
        },
        currentDebt: {
            value: "150,000.00",
            valueUsd: "100.00",
        },
        depositedCollateral: {
            value: "300.00",
            valueUsd: "300.00",
        },
        liquidationDropPercentage: 50,
        borrowOperationMetrics: [
            {
                borrowImpact: "negative",
                collateralImpact: "positive",
                currentUnit: "ARSFLIP/DOC",
                currentValue: "1,250.00",
                nextUnit: "ARSFLIP/DOC",
                nextValue: "500.00",
                showTrend: true,
            },
            {
                borrowImpact: "negative",
                collateralImpact: "positive",
                currentUnit: "%",
                currentValue: "16.67",
                nextUnit: "%",
                nextValue: "66.67",
                showTrend: true,
            },
            {
                borrowImpact: "neutral",
                collateralImpact: "neutral",
                currentUnit: "DOC",
                currentValue: "150.00",
                nextUnit: "DOC",
                nextValue: "150.00",
            },
            {
                borrowImpact: "negative",
                collateralImpact: "positive",
                currentUnit: "ARSFLIP",
                currentValue: "150,000.00",
                nextUnit: "ARSFLIP",
                nextValue: "300,000.00",
            },
            {
                borrowImpact: "negative",
                collateralImpact: "positive",
                currentUnit: "%",
                currentValue: "30.00",
                nextUnit: "%",
                nextValue: "22.22",
            },
        ],
        depositCollateralOperationMetrics: [
            {
                currentUnit: "ARSFLIP/DOC",
                currentValue: "1,250.00",
                nextUnit: "ARSFLIP/DOC",
                nextValue: "500.00",
                collateralImpact: "positive",
                showTrend: true,
            },
            {
                currentUnit: "%",
                currentValue: "16.67",
                nextUnit: "%",
                nextValue: "66.67",
                collateralImpact: "positive",
                showTrend: true,
            },
            {
                currentUnit: "DOC",
                currentValue: "150.00",
                nextUnit: "DOC",
                nextValue: "150.00",
                collateralImpact: "neutral",
            },
            {
                currentUnit: "ARSFLIP",
                currentValue: "150,000.00",
                nextUnit: "ARSFLIP",
                nextValue: "300,000.00",
                collateralImpact: "positive",
            },
            {
                currentUnit: "%",
                currentValue: "30.00",
                nextUnit: "%",
                nextValue: "22.22",
                collateralImpact: "positive",
            },
        ],
        repayOperationMetrics: [
            {
                currentUnit: "ARSFLIP/DOC",
                currentValue: "1,250.00",
                nextUnit: "ARSFLIP/DOC",
                nextValue: "500.00",
                repayImpact: "positive",
                showTrend: true,
            },
            {
                currentUnit: "%",
                currentValue: "16.67",
                nextUnit: "%",
                nextValue: "66.67",
                repayImpact: "positive",
                showTrend: true,
            },
            {
                currentUnit: "DOC",
                currentValue: "150.00",
                nextUnit: "DOC",
                nextValue: "150.00",
                repayImpact: "neutral",
            },
            {
                currentUnit: "ARSFLIP",
                currentValue: "150,000.00",
                nextUnit: "ARSFLIP",
                nextValue: "300,000.00",
                repayImpact: "positive",
            },
            {
                currentUnit: "%",
                currentValue: "30.00",
                nextUnit: "%",
                nextValue: "0.00",
                repayImpact: "positive",
            },
        ],
        repayWithCollateralOperationMetrics: [
            {
                currentUnit: "ARSFLIP/DOC",
                currentValue: "1,250.00",
                nextUnit: "ARSFLIP/DOC",
                nextValue: "1,250.00",
                repayWithCollateralImpact: "neutral",
                showTrend: true,
            },
            {
                currentUnit: "%",
                currentValue: "16.67",
                nextUnit: "%",
                nextValue: "16.67",
                repayWithCollateralImpact: "neutral",
                showTrend: true,
            },
            {
                currentUnit: "DOC",
                currentValue: "150.00",
                nextUnit: "DOC",
                nextValue: "0.00",
                repayWithCollateralImpact: "negative",
            },
            {
                currentUnit: "ARSFLIP",
                currentValue: "150,000.00",
                nextUnit: "ARSFLIP",
                nextValue: "0.00",
                repayWithCollateralImpact: "negative",
            },
            {
                currentUnit: "%",
                currentValue: "30.00",
                nextUnit: "%",
                nextValue: "0.00",
                repayWithCollateralImpact: "neutral",
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
        borrowTokenCode: "TP_1",
        id: "copflip-borrow",
        caIndex: 1,
        collateralTokenCode: "CA_1",
        borrowApy: "0.55",
        collateralWalletBalance: "425.00",
        systemMaxBorrow: "8,200.00",
        maxAvailable: {
            value: "8,200.00",
            valueUsd: "1,950",
        },
        currentDebt: {
            value: "0.00",
            valueUsd: "0",
        },
        depositedCollateral: {
            value: "0.00",
            valueUsd: "0",
        },
        liquidationDropPercentage: 42.5,
        previousLiquidation: {
            amount: "110.10",
            liquidationPrice: "1,200.00",
        },
        borrowOperationMetrics: [
            {
                borrowImpact: "negative",
                collateralImpact: "positive",
                currentUnit: "COPFLIP/DOC",
                currentValue: "- -",
                nextUnit: "COPFLIP/DOC",
                nextValue: "980.00",
                showTrend: true,
            },
            {
                borrowImpact: "negative",
                collateralImpact: "positive",
                currentUnit: "%",
                currentValue: "- -",
                nextUnit: "%",
                nextValue: "58.00",
                showTrend: true,
            },
            {
                borrowImpact: "neutral",
                collateralImpact: "neutral",
                currentUnit: "DOC",
                currentValue: "0.00",
                nextUnit: "DOC",
                nextValue: "120.00",
            },
            {
                borrowImpact: "negative",
                collateralImpact: "positive",
                currentUnit: "COPFLIP",
                currentValue: "0.00",
                nextUnit: "COPFLIP",
                nextValue: "8,200.00",
            },
            {
                borrowImpact: "negative",
                collateralImpact: "positive",
                currentUnit: "%",
                currentValue: "0.00",
                nextUnit: "%",
                nextValue: "24.00",
            },
        ],
        depositCollateralOperationMetrics: [
            {
                currentUnit: "COPFLIP/DOC",
                currentValue: "- -",
                nextUnit: "COPFLIP/DOC",
                nextValue: "980.00",
                collateralImpact: "positive",
                showTrend: true,
            },
            {
                currentUnit: "%",
                currentValue: "- -",
                nextUnit: "%",
                nextValue: "58.00",
                collateralImpact: "positive",
                showTrend: true,
            },
            {
                currentUnit: "DOC",
                currentValue: "0.00",
                nextUnit: "DOC",
                nextValue: "120.00",
                collateralImpact: "neutral",
            },
            {
                currentUnit: "COPFLIP",
                currentValue: "0.00",
                nextUnit: "COPFLIP",
                nextValue: "8,200.00",
                collateralImpact: "positive",
            },
            {
                currentUnit: "%",
                currentValue: "0.00",
                nextUnit: "%",
                nextValue: "24.00",
                collateralImpact: "positive",
            },
        ],
        repayOperationMetrics: [
            {
                currentUnit: "COPFLIP/DOC",
                currentValue: "- -",
                nextUnit: "COPFLIP/DOC",
                nextValue: "- -",
                repayImpact: "neutral",
                showTrend: true,
            },
            {
                currentUnit: "%",
                currentValue: "- -",
                nextUnit: "%",
                nextValue: "- -",
                repayImpact: "neutral",
                showTrend: true,
            },
            {
                currentUnit: "DOC",
                currentValue: "0.00",
                nextUnit: "DOC",
                nextValue: "0.00",
                repayImpact: "neutral",
            },
            {
                currentUnit: "COPFLIP",
                currentValue: "0.00",
                nextUnit: "COPFLIP",
                nextValue: "0.00",
                repayImpact: "neutral",
            },
            {
                currentUnit: "%",
                currentValue: "0.00",
                nextUnit: "%",
                nextValue: "0.00",
                repayImpact: "neutral",
            },
        ],
        repayWithCollateralOperationMetrics: [
            {
                currentUnit: "COPFLIP/DOC",
                currentValue: "- -",
                nextUnit: "COPFLIP/DOC",
                nextValue: "- -",
                repayWithCollateralImpact: "neutral",
                showTrend: true,
            },
            {
                currentUnit: "%",
                currentValue: "- -",
                nextUnit: "%",
                nextValue: "- -",
                repayWithCollateralImpact: "neutral",
                showTrend: true,
            },
            {
                currentUnit: "DOC",
                currentValue: "0.00",
                nextUnit: "DOC",
                nextValue: "0.00",
                repayWithCollateralImpact: "neutral",
            },
            {
                currentUnit: "COPFLIP",
                currentValue: "0.00",
                nextUnit: "COPFLIP",
                nextValue: "0.00",
                repayWithCollateralImpact: "neutral",
            },
            {
                currentUnit: "%",
                currentValue: "0.00",
                nextUnit: "%",
                nextValue: "0.00",
                repayWithCollateralImpact: "neutral",
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

export const BORROW_CARDS: BorrowCardData[] = RAW_BORROW_CARDS.map((card) => {
    const borrowToken = getLendingBorrowingTokenMetadata(card.borrowTokenCode);
    const collateralToken = getLendingBorrowingTokenMetadata(
        card.collateralTokenCode
    );

    return {
        ...card,
        borrowTokenDecimals: borrowToken.visibleDecimals,
        borrowTokenIconClassName: borrowToken.iconClassName,
        borrowTokenName: borrowToken.name,
        borrowTokenTicker: borrowToken.ticker,
        borrowTokenWalletBalance: "50,000.00",
        maxWithdrawableCollateral: "150.00",
        collateralTokenDecimals: collateralToken.visibleDecimals,
        collateralTokenIconClassName: collateralToken.iconClassName,
        collateralTokenName: collateralToken.name,
        collateralTokenTicker: collateralToken.ticker,
        liquidationCoverage: 1.1,
        currentDebt: {
            ...card.currentDebt,
            ticker: borrowToken.ticker,
        },
        depositedCollateral: {
            ...card.depositedCollateral,
            ticker: collateralToken.ticker,
        },
        maxAvailable: {
            ...card.maxAvailable,
            ticker: borrowToken.ticker,
        },
        previousLiquidation: card.previousLiquidation
            ? {
                  ...card.previousLiquidation,
                  amountTicker: collateralToken.ticker,
              }
            : undefined,
    };
});
