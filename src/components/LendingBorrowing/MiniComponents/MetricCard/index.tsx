import "./Styles.scss";

import React from "react";

interface MetricCardProps {
    label: string;
    value: string;
    valueLabel: string;
    localCurrencySymbol?: string;
    localCurrencyValue?: string;
    getLocalCurrencyValue?: () => string;
}

export default function MetricCard({
    label,
    value,
    valueLabel,
    localCurrencySymbol = "USD",
    localCurrencyValue,
    getLocalCurrencyValue,
}: MetricCardProps): React.ReactElement {
    const resolvedLocalCurrencyValue =
        localCurrencyValue ?? getLocalCurrencyValue?.();

    return (
        <div className="metric-card">
            <div className="metric-card__label">{label}</div>
            <div className="metric-card__amount">
                <div className="metric-card__value">{value}</div>
                <div className="metric-card__value-label">{valueLabel}</div>
            </div>
            {resolvedLocalCurrencyValue ? (
                <div className="metric-card__local-currency">
                    <div className="metric-card__local-amount">
                        {resolvedLocalCurrencyValue}
                    </div>
                    <div className="metric-card__local-symbol">
                        {localCurrencySymbol}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
