import React from "react";

import type { BorrowCardData } from "./Borrow/data";
import type { LendCardData } from "./Lend/data";

interface LendingBorrowingActions {
    confirmBorrowDepositCollateral: (
        card: BorrowCardData,
        collateralAmount: string
    ) => void;
    confirmBorrowOperation: (
        card: BorrowCardData,
        borrowAmount: string,
        collateralAmount: string
    ) => void;
    confirmBorrowRepay: (card: BorrowCardData, repayAmount: string) => void;
    confirmBorrowRepayWithCollateral: (
        card: BorrowCardData,
        collateralAmount: string
    ) => void;
    confirmBorrowWithdrawCollateral: (
        card: BorrowCardData,
        collateralAmount: string
    ) => void;
    confirmLendEarn: (token: LendCardData, amount: string) => void;
    confirmLendWithdraw: (token: LendCardData, amount: string) => void;
}

export function useLendingBorrowingActions(): LendingBorrowingActions {
    const confirmLendEarn = React.useCallback(
        (token: LendCardData, amount: string) => {
            void token;
            void amount;
            // TODO(api): Replace this placeholder with the lend/earn transaction flow.
            // Add allowance checks, contract write, transaction status handling, and
            // a data refetch after confirmation.
        },
        []
    );

    const confirmLendWithdraw = React.useCallback(
        (token: LendCardData, amount: string) => {
            void token;
            void amount;
            // TODO(api): Replace this placeholder with the lending withdraw flow.
            // Keep submit side effects here so LendWithdraw remains a presentational
            // operation screen.
        },
        []
    );

    const confirmBorrowOperation = React.useCallback(
        (
            card: BorrowCardData,
            borrowAmount: string,
            collateralAmount: string
        ) => {
            void card;
            void borrowAmount;
            void collateralAmount;
            // TODO(api): Replace this placeholder with the borrow/deposit transaction
            // flow. This should submit the live borrow amount, optional collateral,
            // transaction status, and post-confirmation refetch in one place.
        },
        []
    );

    const confirmBorrowRepay = React.useCallback(
        (card: BorrowCardData, repayAmount: string) => {
            void card;
            void repayAmount;
            // TODO(api): Replace this placeholder with the repay transaction flow.
            // Keep the UI validation in the screen and the contract/API side effects here.
        },
        []
    );

    const confirmBorrowRepayWithCollateral = React.useCallback(
        (card: BorrowCardData, collateralAmount: string) => {
            void card;
            void collateralAmount;
            // TODO(api): Replace this placeholder with the repay-with-collateral flow.
            // This should use live protocol rules for collateral conversion and status.
        },
        []
    );

    const confirmBorrowDepositCollateral = React.useCallback(
        (card: BorrowCardData, collateralAmount: string) => {
            void card;
            void collateralAmount;
            // TODO(api): Replace this placeholder with the deposit-collateral flow.
            // Trigger the write and refresh the lending/borrowing data after success.
        },
        []
    );

    const confirmBorrowWithdrawCollateral = React.useCallback(
        (card: BorrowCardData, collateralAmount: string) => {
            void card;
            void collateralAmount;
            // TODO(api): Replace this placeholder with the withdraw-collateral flow.
            // Ensure the live health/risk checks are enforced before submitting.
        },
        []
    );

    return {
        confirmBorrowDepositCollateral,
        confirmBorrowOperation,
        confirmBorrowRepay,
        confirmBorrowRepayWithCollateral,
        confirmBorrowWithdrawCollateral,
        confirmLendEarn,
        confirmLendWithdraw,
    };
}
