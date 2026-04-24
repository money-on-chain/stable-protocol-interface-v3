import "./Styles.scss";

import React from "react";
import { useSearchParams } from "react-router-dom";

import { parseMetricNumber } from "./Borrow/data";
import BorrowOperation from "./BorrowOperation";
import BorrowRepay from "./BorrowRepay";
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
    const isBorrowRepayView =
        view === "borrow-repay" &&
        !!selectedBorrowCard &&
        parseMetricNumber(selectedBorrowCard.currentDebt.value) > 0;

    const updateSearchParams = (
        updater: (params: URLSearchParams) => void
    ) => {
        const nextParams = new URLSearchParams(searchParams);
        updater(nextParams);
        setSearchParams(nextParams);
    };

    return (
        <div className="section-container">
            {!isLendEarnView &&
            !isLendWithdrawView &&
            !isBorrowOperationView &&
            !isBorrowRepayView ? (
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
            ) : (
                <BorrowOperation
                    card={selectedBorrowCard}
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
