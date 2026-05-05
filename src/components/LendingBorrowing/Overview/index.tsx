import React from "react";

import Borrow from "../Borrow";
import type { BorrowCardData } from "../Borrow/data";
import Lend from "../Lend";
import type { LendCardData } from "../Lend/data";

interface OverviewProps {
    borrowCards: BorrowCardData[];
    lendCards: LendCardData[];
    onOpenBorrow: (card: BorrowCardData) => void;
    onOpenBorrowDepositCollateral: (card: BorrowCardData) => void;
    onOpenBorrowRepay: (card: BorrowCardData) => void;
    onOpenBorrowRepayWithCollateral: (card: BorrowCardData) => void;
    onOpenBorrowWithdrawCollateral: (card: BorrowCardData) => void;
    onOpenLendEarn: (token: LendCardData) => void;
    onOpenLendWithdraw: (token: LendCardData) => void;
}

export default function Overview({
    borrowCards,
    lendCards,
    onOpenBorrow,
    onOpenBorrowDepositCollateral,
    onOpenBorrowRepay,
    onOpenBorrowRepayWithCollateral,
    onOpenBorrowWithdrawCollateral,
    onOpenLendEarn,
    onOpenLendWithdraw,
}: OverviewProps): React.ReactElement {
    return (
        <>
            <Lend
                cards={lendCards}
                onEarn={onOpenLendEarn}
                onWithdraw={onOpenLendWithdraw}
            />
            <Borrow
                cards={borrowCards}
                onOpenBorrow={onOpenBorrow}
                onOpenDepositCollateral={onOpenBorrowDepositCollateral}
                onOpenRepay={onOpenBorrowRepay}
                onOpenRepayWithCollateral={onOpenBorrowRepayWithCollateral}
                onOpenWithdrawCollateral={onOpenBorrowWithdrawCollateral}
            />
        </>
    );
}
