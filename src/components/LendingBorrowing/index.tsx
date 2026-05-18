import "./Styles.scss";

import React from "react";
import { useSearchParams } from "react-router-dom";

import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import { parseMetricNumber } from "./Borrow/data";
import BorrowDepositCollateral from "./BorrowDepositCollateral";
import BorrowOperation from "./BorrowOperation";
import BorrowRepay from "./BorrowRepay";
import BorrowRepayWithCollateral from "./BorrowRepayWithCollateral";
import BorrowWithdrawCollateral from "./BorrowWithdrawCollateral";
import LendEarn from "./LendEarn";
import LendWithdraw from "./LendWithdraw";
import Overview from "./Overview";
import { useLendingBorrowingActions } from "./useLendingBorrowingActions";
import { useLendingBorrowingData } from "./useLendingBorrowingData";

const LendingBorrowing: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { borrowCards, lendCards } = useLendingBorrowingData();
    const actions = useLendingBorrowingActions();
    const { operationModal } = actions;
    const view = searchParams.get("view");
    const tokenId = searchParams.get("token");
    const selectedLendCard =
        lendCards.find((card) => card.id === tokenId) || null;
    const selectedBorrowCard =
        borrowCards.find((card) => card.id === tokenId) || null;
    const isLendEarnView = view === "lend-earn" && !!selectedLendCard;
    const isLendWithdrawView = view === "lend-withdraw" && !!selectedLendCard;
    const isBorrowOperationView =
        view === "borrow-operation" && !!selectedBorrowCard;
    const isBorrowDepositCollateralView =
        view === "borrow-deposit-collateral" &&
        !!selectedBorrowCard &&
        parseMetricNumber(selectedBorrowCard.currentDebt.value) > 0;
    const isBorrowRepayView =
        view === "borrow-repay" &&
        !!selectedBorrowCard &&
        parseMetricNumber(selectedBorrowCard.currentDebt.value) > 0;
    const isBorrowRepayWithCollateralView =
        view === "borrow-repay-with-collateral" &&
        !!selectedBorrowCard &&
        parseMetricNumber(selectedBorrowCard.currentDebt.value) > 0 &&
        parseMetricNumber(selectedBorrowCard.depositedCollateral.value) > 0;
    const isBorrowWithdrawCollateralView =
        view === "borrow-withdraw-collateral" &&
        !!selectedBorrowCard &&
        parseMetricNumber(selectedBorrowCard.depositedCollateral.value) > 0;

    const updateSearchParams = (updater: (params: URLSearchParams) => void) => {
        const nextParams = new URLSearchParams(searchParams);
        updater(nextParams);
        setSearchParams(nextParams);
    };

    return (
        <div className="section-container">
            <OperationStatusModal
                visible={operationModal.isVisible}
                onCancel={operationModal.onClose}
                title={operationModal.title}
                operationStatus={operationModal.status}
                txHash={operationModal.txHash}
            />
            {!isLendEarnView &&
            !isLendWithdrawView &&
            !isBorrowDepositCollateralView &&
            !isBorrowOperationView &&
            !isBorrowRepayView &&
            !isBorrowRepayWithCollateralView &&
            !isBorrowWithdrawCollateralView ? (
                <Overview
                    borrowCards={borrowCards}
                    lendCards={lendCards}
                    onOpenBorrow={(card) =>
                        updateSearchParams((params) => {
                            params.set("view", "borrow-operation");
                            params.set("token", card.id);
                        })
                    }
                    onOpenBorrowRepay={(card) =>
                        updateSearchParams((params) => {
                            params.set("view", "borrow-repay");
                            params.set("token", card.id);
                        })
                    }
                    onOpenBorrowDepositCollateral={(card) =>
                        updateSearchParams((params) => {
                            params.set("view", "borrow-deposit-collateral");
                            params.set("token", card.id);
                        })
                    }
                    onOpenBorrowRepayWithCollateral={(card) =>
                        updateSearchParams((params) => {
                            params.set("view", "borrow-repay-with-collateral");
                            params.set("token", card.id);
                        })
                    }
                    onOpenBorrowWithdrawCollateral={(card) =>
                        updateSearchParams((params) => {
                            params.set("view", "borrow-withdraw-collateral");
                            params.set("token", card.id);
                        })
                    }
                    onOpenLendEarn={(token) =>
                        updateSearchParams((params) => {
                            params.set("view", "lend-earn");
                            params.set("token", token.id);
                        })
                    }
                    onOpenLendWithdraw={(token) =>
                        updateSearchParams((params) => {
                            params.set("view", "lend-withdraw");
                            params.set("token", token.id);
                        })
                    }
                />
            ) : isLendEarnView ? (
                <LendEarn
                    onConfirm={actions.confirmLendEarn}
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                    token={selectedLendCard}
                />
            ) : isLendWithdrawView ? (
                <LendWithdraw
                    onConfirm={actions.confirmLendWithdraw}
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                    token={selectedLendCard}
                />
            ) : isBorrowDepositCollateralView ? (
                <BorrowDepositCollateral
                    card={selectedBorrowCard}
                    onConfirm={actions.confirmBorrowDepositCollateral}
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                />
            ) : isBorrowRepayView ? (
                <BorrowRepay
                    card={selectedBorrowCard}
                    onConfirm={actions.confirmBorrowRepay}
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                />
            ) : isBorrowRepayWithCollateralView ? (
                <BorrowRepayWithCollateral
                    card={selectedBorrowCard}
                    onConfirm={actions.confirmBorrowRepayWithCollateral}
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                />
            ) : isBorrowWithdrawCollateralView ? (
                <BorrowWithdrawCollateral
                    card={selectedBorrowCard}
                    onConfirm={actions.confirmBorrowWithdrawCollateral}
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                />
            ) : (
                <BorrowOperation
                    card={selectedBorrowCard!}
                    onConfirm={actions.confirmBorrowOperation}
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                />
            )}
        </div>
    );
};

export default LendingBorrowing;
