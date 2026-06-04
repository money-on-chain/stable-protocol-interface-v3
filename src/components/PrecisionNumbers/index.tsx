import { Tooltip } from "antd";
import React from "react";
import { formatUnits } from "viem";

import type { TokenConfig } from "../../types/hooks";
import {
    formatFullLocaleValue,
    formatSignificantCompactValue,
} from "./formatters";

const NUMBER_LOCALE = "en-US";

interface I18n {
    languages: readonly string[];
    t?: (key: string, options?: { defaultValue?: string }) => string;
}

interface PrecisionNumbersProps {
    amount: bigint;
    token: TokenConfig;
    decimals?: number;
    i18n: I18n;
    isInWei?: boolean;
    isUSD?: boolean;
    compact?: boolean;
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
    tooltipVariant,
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
    const effectiveTooltipVariant =
        tooltipVariant ?? (compact ? "formatted" : "raw");
    const noLimitLabel =
        i18n.t?.("numberFormat.noLimit", { defaultValue: "No limit" }) ??
        "No limit";

    const displayValue = compact
        ? formatSignificantCompactValue(floatValue, NUMBER_LOCALE, noLimitLabel)
        : new Intl.NumberFormat(NUMBER_LOCALE, {
              notation: "standard",
              maximumFractionDigits: precision,
              minimumFractionDigits: precision,
          }).format(floatValue);
    const tooltipValue =
        effectiveTooltipVariant === "formatted"
            ? formatFullLocaleValue(floatValue, NUMBER_LOCALE, noLimitLabel)
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
