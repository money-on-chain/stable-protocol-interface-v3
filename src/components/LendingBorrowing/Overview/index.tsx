import React from "react";

import Borrow from "../Borrow";
import type { BorrowCardData } from "../Borrow/data";
import Lend from "../Lend";
import type { LendCardData } from "../Lend/data";

interface OverviewProps {
    onOpenBorrow: (card: BorrowCardData) => void;
    onOpenLendEarn: (token: LendCardData) => void;
    onOpenLendWithdraw: (token: LendCardData) => void;
}

export default function Overview({
    onOpenBorrow,
    onOpenLendEarn,
    onOpenLendWithdraw,
}: OverviewProps): React.ReactElement {
    return (
        <>
            <Lend onEarn={onOpenLendEarn} onWithdraw={onOpenLendWithdraw} />
            <Borrow onOpenBorrow={onOpenBorrow} />
        </>
    );
}
