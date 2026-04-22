import React from "react";

import Borrow from "../Borrow";
import Lend from "../Lend";
import type { LendCardData } from "../Lend/data";

interface OverviewProps {
    onOpenLendEarn: (token: LendCardData) => void;
}

export default function Overview({
    onOpenLendEarn,
}: OverviewProps): React.ReactElement {
    return (
        <>
            <Lend onEarn={onOpenLendEarn} />
            <Borrow />
        </>
    );
}
