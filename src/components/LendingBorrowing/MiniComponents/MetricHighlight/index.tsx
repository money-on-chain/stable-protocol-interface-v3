import "./Styles.scss";

import React from "react";

interface MetricHighlightProps {
    title: string;
    value: string;
}

export default function MetricHighlight({
    title,
    value,
}: MetricHighlightProps): React.ReactElement {
    return (
        <div className="metric-highlight">
            <div className="metric-highlight__title">{title}</div>
            <div className="metric-highlight__value">{value}</div>
        </div>
    );
}
