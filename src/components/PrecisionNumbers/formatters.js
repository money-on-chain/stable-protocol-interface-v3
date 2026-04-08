const SCALE_SUFFIXES = [
    "K",
    "M",
    "B",
    "T",
    "Q",
];

export const truncateToDecimals = (value, decimals) => {
    const factor = 10 ** decimals;
    if (value >= 0) {
        return Math.floor(value * factor) / factor;
    }
    return Math.ceil(value * factor) / factor;
};

export const getRequiredUnscaledDecimals = (value) => {
    const absoluteValue = Math.abs(value);

    if (absoluteValue >= 10) {
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

export const formatFullLocaleValue = (value, locale) => {
    if (!Number.isFinite(value)) {
        return String(value);
    }

    const absoluteValue = Math.abs(value);
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

    const sign = value < 0 ? "-" : "";
    const absoluteValue = Math.abs(value);

    if (absoluteValue < 1e6) {
        const decimals = absoluteValue >= 1e4 ? 0 : getRequiredUnscaledDecimals(value);

        return `${sign}${formatLocalizedNumber(absoluteValue, locale, decimals)}`;
    }

    const integerDigits = Math.trunc(absoluteValue).toString().length;
    const suffixIndex = Math.min(
        Math.floor((integerDigits - 7) / 3),
        SCALE_SUFFIXES.length - 1
    );
    const scaleDivisor = 10 ** ((suffixIndex + 1) * 3);
    const scaledValue = absoluteValue / scaleDivisor;

    return `${sign}${formatLocalizedInteger(scaledValue, locale)}${SCALE_SUFFIXES[suffixIndex]}`;
};
