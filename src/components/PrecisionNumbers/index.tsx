import { Tooltip } from "antd";
import React from "react";
import { formatUnits } from "viem";

import type { TokenConfig } from "../../types/hooks";
import {
    formatFullLocaleValue,
    formatSignificantCompactValue,
} from "./formatters";

interface I18n {
    languages: readonly string[];
}

interface PrecisionNumbersProps {
    amount: bigint;
    token: TokenConfig;
    decimals?: number;
    i18n: I18n;
    isInWei?: boolean;
    isUSD?: boolean;
    compact?: boolean;
    compactVariant?: "intl" | "significant";
    tooltipVariant?: "raw" | "formatted";
}

export const PrecisionNumbers: React.FC<PrecisionNumbersProps> = ({
    amount,
    token,
    decimals,
    i18n,
    isInWei = true,
    isUSD = false,
    compact = false,
    compactVariant = "intl",
    tooltipVariant = "raw",
}) => {
    if (typeof amount !== "bigint") {
        console.warn("❌ amount must be bigint:", amount);
        return <span>Error</span>;
    }
    // Avoid rendering extremely large numbers
    if (amount >= 2n ** 255n) {
        return <span>Infinity +</span>;
    }

    const tokenDecimals = token?.decimals ?? 18;
    const precision = decimals ?? token?.visibleDecimals ?? 2;

    let formattedString = "0";
    try {
        formattedString = isInWei
            ? formatUnits(amount, tokenDecimals)
            : amount.toString();
    } catch (err) {
        console.error("❌ Error in formatUnits:", err);
        return <span>Error</span>;
    }

    const floatValue = parseFloat(formattedString);
    const locale = i18n.languages[0] || "en-US";

    const displayValue =
        compact && compactVariant === "significant"
            ? formatSignificantCompactValue(floatValue, locale)
            : new Intl.NumberFormat(locale, {
                  notation: compact ? "compact" : "standard",
                  maximumFractionDigits: precision,
                  minimumFractionDigits: precision,
              }).format(floatValue);
    const tooltipValue =
        tooltipVariant === "formatted"
            ? formatFullLocaleValue(floatValue, locale)
            : formattedString;

    return isUSD ? (
        <span data-testid="value" data-raw-value={formattedString}>
            {displayValue}
        </span>
    ) : (
        <Tooltip title={tooltipValue}>
            <span data-testid="value" data-raw-value={formattedString}>
                {displayValue}
            </span>
        </Tooltip>
    );
};
