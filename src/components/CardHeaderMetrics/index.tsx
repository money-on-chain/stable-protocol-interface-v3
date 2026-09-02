import "./Styles.scss";

import React from "react";

export interface CardHeaderMetric {
    label: string;
    value: React.ReactNode;
}

interface CardHeaderMetricsProps {
    items: CardHeaderMetric[];
    size?: "primary" | "secondary";
}

export default function CardHeaderMetrics({
    items,
    size = "primary",
}: CardHeaderMetricsProps): React.ReactElement {
    return (
        <div
            className={`cardHeaderMetrics cardHeaderMetrics--${size}`}
            data-size={size}
        >
            {items.map((item) => (
                <div className="cardHeaderMetrics__item" key={item.label}>
                    <div className="cardHeaderMetrics__label">{item.label}</div>
                    <div className="cardHeaderMetrics__value">{item.value}</div>
                </div>
            ))}
        </div>
    );
}
