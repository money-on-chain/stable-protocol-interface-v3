import React from "react";

import Borrow from "../Borrow";
import type { BorrowCardData } from "../Borrow/data";
import Lend from "../Lend";
import type { LendCardData } from "../Lend/data";

interface OverviewProps {
    onOpenBorrow: (card: BorrowCardData) => void;
    onOpenBorrowDepositCollateral: (card: BorrowCardData) => void;
    onOpenBorrowRepay: (card: BorrowCardData) => void;
    onOpenBorrowRepayWithCollateral: (card: BorrowCardData) => void;
    onOpenBorrowWithdrawCollateral: (card: BorrowCardData) => void;
    onOpenLendEarn: (token: LendCardData) => void;
    onOpenLendWithdraw: (token: LendCardData) => void;
}

export default function Overview({
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
            <Lend onEarn={onOpenLendEarn} onWithdraw={onOpenLendWithdraw} />
            <Borrow
                onOpenBorrow={onOpenBorrow}
                onOpenDepositCollateral={onOpenBorrowDepositCollateral}
                onOpenRepay={onOpenBorrowRepay}
                onOpenRepayWithCollateral={onOpenBorrowRepayWithCollateral}
                onOpenWithdrawCollateral={onOpenBorrowWithdrawCollateral}
            />
        </>
    );
}
