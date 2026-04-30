import "./Styles.scss";

import React from "react";
import { useSearchParams } from "react-router-dom";

import { parseMetricNumber } from "./Borrow/data";
import BorrowDepositCollateral from "./BorrowDepositCollateral";
import BorrowOperation from "./BorrowOperation";
import BorrowRepay from "./BorrowRepay";
import BorrowRepayWithCollateral from "./BorrowRepayWithCollateral";
import BorrowWithdrawCollateral from "./BorrowWithdrawCollateral";
import LendEarn from "./LendEarn";
import LendWithdraw from "./LendWithdraw";
import { BORROW_CARDS } from "./mocks/borrowCards";
import { LEND_CARDS } from "./mocks/lendCards";
import Overview from "./Overview";

const LendingBorrowing: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get("view");
    const tokenId = searchParams.get("token");
    const selectedLendCard =
        LEND_CARDS.find((card) => card.id === tokenId) || null;
    const selectedBorrowCard =
        BORROW_CARDS.find((card) => card.id === tokenId) || null;
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
            {!isLendEarnView &&
            !isLendWithdrawView &&
            !isBorrowDepositCollateralView &&
            !isBorrowOperationView &&
            !isBorrowRepayView &&
            !isBorrowRepayWithCollateralView &&
            !isBorrowWithdrawCollateralView ? (
                <Overview
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
