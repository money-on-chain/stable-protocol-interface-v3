import "./Styles.scss";

import React from "react";

interface RateDisplayProps {
    title: React.ReactNode;
    number: React.ReactNode;
}

export default function RateDisplay({
    title,
    number,
}: RateDisplayProps): React.ReactElement {
    return (
        <div className="rate-display">
            <div className="rate-display__label">{title}</div>
            <div className="rate-display__value">{number} %</div>
        </div>
    );
}
