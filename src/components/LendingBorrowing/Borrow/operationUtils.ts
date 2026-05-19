import {
    parseMetricNumber,
    type BorrowOperationMetric,
} from "./data";

export type BorrowMetricImpact = "positive" | "neutral" | "negative";
export type BorrowMetricTrend = "positive" | "negative" | "neutral";

export function parseAmount(rawAmount: string): {
    isValid: boolean;
    value: number;
} {
    const normalizedAmount = rawAmount.replace(/,/g, "");

    if (!normalizedAmount.trim()) {
        return {
            isValid: true,
            value: 0,
        };
    }

    const parsedAmount = Number(normalizedAmount);

    if (Number.isNaN(parsedAmount)) {
        return {
            isValid: false,
            value: 0,
        };
    }

    return {
        isValid: true,
        value: parsedAmount,
    };
}

export function formatAmount(value: number, decimals: number = 2): string {
    return value.toLocaleString("en-US", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
    });
}

export function formatMetricValue(rawValue: string, value: number): string {
    const decimalMatch = rawValue.match(/\.(\d+)/);
    const minimumFractionDigits = decimalMatch ? decimalMatch[1].length : 0;

    return value.toLocaleString("en-US", {
        maximumFractionDigits: minimumFractionDigits,
        minimumFractionDigits,
    });
}

export function getImpactScore(effect?: BorrowMetricImpact): number {
    if (effect === "positive") {
        return 1;
    }

    if (effect === "negative") {
        return -1;
    }

    return 0;
}

export function clampRiskDelta(value: number): number {
    return Math.max(-1, Math.min(1, value));
}

export function getMetricTrend(
    metric: BorrowOperationMetric,
    riskDelta: number
): BorrowMetricTrend | undefined {
    if (Math.abs(riskDelta) < 0.001) {
        return "neutral";
    }

    const currentValue = parseMetricNumber(metric.currentValue);
    const targetValue = parseMetricNumber(metric.nextValue);

    if (currentValue === targetValue) {
        return "neutral";
    }

    return riskDelta > 0 ? "positive" : "negative";
}

export function getMetricNextValue(
    metric: BorrowOperationMetric,
    riskDelta: number
): string {
    const currentValue = parseMetricNumber(metric.currentValue);
    const targetValue = parseMetricNumber(metric.nextValue);

    if (metric.currentValue.includes("- -")) {
        return riskDelta > 0 ? metric.nextValue : metric.currentValue;
    }

    if (currentValue === targetValue || Math.abs(riskDelta) < 0.001) {
        return metric.currentValue;
    }

    const interpolatedValue =
        riskDelta > 0
            ? currentValue + (targetValue - currentValue) * riskDelta
            : currentValue - (targetValue - currentValue) * Math.abs(riskDelta);

    return formatMetricValue(metric.currentValue, interpolatedValue);
}
