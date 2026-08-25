import "./Styles.scss";

import React from "react";

export interface CardHeaderMetric {
    label: string;
    value: React.ReactNode;
}

interface CardHeaderMetricsProps {
    items: CardHeaderMetric[];
}

export default function CardHeaderMetrics({
    items,
}: CardHeaderMetricsProps): React.ReactElement {
    return (
        <div className="cardHeaderMetrics">
            {items.map((item) => (
                <div className="cardHeaderMetrics__item" key={item.label}>
                    <div className="cardHeaderMetrics__label">{item.label}</div>
                    <div className="cardHeaderMetrics__value">{item.value}</div>
                </div>
            ))}
        </div>
    );
}
