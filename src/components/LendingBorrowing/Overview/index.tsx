import React from "react";

import Borrow from "../Borrow";
import Lend from "../Lend";
import type { LendCardData } from "../Lend/data";

interface OverviewProps {
    onOpenLendEarn: (token: LendCardData) => void;
    onOpenLendWithdraw: (token: LendCardData) => void;
}

export default function Overview({
    onOpenLendEarn,
    onOpenLendWithdraw,
}: OverviewProps): React.ReactElement {
    return (
        <>
            <Lend onEarn={onOpenLendEarn} onWithdraw={onOpenLendWithdraw} />
            <Borrow />
        </>
    );
}
