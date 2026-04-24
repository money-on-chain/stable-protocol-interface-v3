import "./Styles.scss";

import React from "react";

interface CompactMetricDisplayProps {
    label: React.ReactNode;
    value: React.ReactNode;
    valueLabel?: React.ReactNode;
}

export default function CompactMetricDisplay({
    label,
    value,
    valueLabel,
}: CompactMetricDisplayProps): React.ReactElement {
    return (
        <div className="compact-metric-display">
            <div className="compact-metric-display__label">{label}</div>
            <div className="compact-metric-display__amount">
                <div className="compact-metric-display__value">{value}</div>
                {valueLabel ? (
                    <div className="compact-metric-display__value-label">
                        {valueLabel}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
