const SCALE_SUFFIXES = [
    { threshold: 1e15, suffix: "Q" },
    { threshold: 1e12, suffix: "T" },
    { threshold: 1e9, suffix: "B" },
    { threshold: 1e6, suffix: "M" },
];
const MAX_COMPACT_VALUE = 1e15;
const MIN_EXTENDED_PRECISION_VALUE = 1e-4;
const MIN_DISPLAYABLE_EXTENDED_VALUE = 1e-8;

export const truncateToDecimals = (value, decimals) => {
    const factor = 10 ** decimals;
    if (value >= 0) {
        return Math.floor(value * factor) / factor;
    }
    return Math.ceil(value * factor) / factor;
};

export const getRequiredUnscaledDecimals = (value) => {
    const absoluteValue = Math.abs(value);

    if (absoluteValue >= 100) {
        return 2;
    }

    const truncatedToFour = truncateToDecimals(absoluteValue, 4);
    const scaledFraction = Math.trunc(truncatedToFour * 10000) % 10000;

    return scaledFraction % 100 === 0 ? 2 : 4;
};

export const formatLocalizedNumber = (value, locale, decimals) => {
    const truncatedValue = truncateToDecimals(value, decimals);

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: Math.abs(truncatedValue) >= 1000,
    }).format(truncatedValue);
};

export const formatLocalizedInteger = (value, locale) => {
    const truncatedValue = Math.trunc(value);

    return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
        useGrouping: Math.abs(truncatedValue) >= 1000,
    }).format(truncatedValue);
};

export const formatLocalizedNumberUpToDecimals = (value, locale, decimals) => {
    const truncatedValue = truncateToDecimals(value, decimals);

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
        useGrouping: Math.abs(truncatedValue) >= 1000,
    }).format(truncatedValue);
};

const formatTinyValue = (value, locale) => {
    const absoluteValue = Math.abs(value);

    if (absoluteValue < MIN_DISPLAYABLE_EXTENDED_VALUE) {
        return value < 0 ? "> -0.0001" : "<0.0001";
    }

    const sign = value < 0 ? "-" : "";
    return `${sign}${formatLocalizedNumberUpToDecimals(absoluteValue, locale, 8)}`;
};

export const formatFullLocaleValue = (value, locale) => {
    if (!Number.isFinite(value)) {
        return String(value);
    }

    if (value > MAX_COMPACT_VALUE) {
        return "> 1Q";
    }

    if (value < -MAX_COMPACT_VALUE) {
        return "< -1Q";
    }

    const absoluteValue = Math.abs(value);

    if (
        absoluteValue > 0 &&
        absoluteValue < MIN_EXTENDED_PRECISION_VALUE
    ) {
        return formatTinyValue(value, locale);
    }

    const truncatedToFour = truncateToDecimals(absoluteValue, 4);
    const scaledFraction = Math.trunc(truncatedToFour * 10000) % 10000;
    const thirdOrFourthDecimalsAreNonZero = scaledFraction % 100 !== 0;
    const decimals = thirdOrFourthDecimalsAreNonZero ? 4 : 2;
    const sign = value < 0 ? "-" : "";

    return `${sign}${formatLocalizedNumber(absoluteValue, locale, decimals)}`;
};

export const formatSignificantCompactValue = (value, locale) => {
    if (!Number.isFinite(value)) {
        return String(value);
    }

    const absoluteValue = Math.abs(value);

    if (value > MAX_COMPACT_VALUE) {
        return "> 1Q";
    }

    if (value < -MAX_COMPACT_VALUE) {
        return "< -1Q";
    }

    if (
        absoluteValue > 0 &&
        absoluteValue < MIN_EXTENDED_PRECISION_VALUE
    ) {
        return formatTinyValue(value, locale);
    }

    const sign = value < 0 ? "-" : "";

    if (absoluteValue < 1e6) {
        const decimals = getRequiredUnscaledDecimals(value);

        return `${sign}${formatLocalizedNumber(absoluteValue, locale, decimals)}`;
    }

    for (const { threshold, suffix } of SCALE_SUFFIXES) {
        if (absoluteValue >= threshold) {
            const scaledValue = absoluteValue / threshold;
            return `${sign}${formatLocalizedNumber(scaledValue, locale, 2)}${suffix}`;
        }
    }

    return `${sign}${formatLocalizedNumber(absoluteValue / 1e6, locale, 2)}M`;
};
