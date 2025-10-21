import { formatUnits, hexToBigInt, isHex, parseUnits } from "viem";

const PRECISION_DECIMALS = 18n;
const DECIMALS_18 = 10n ** PRECISION_DECIMALS;

/**
 * Converts a float or string value to bigint with 18 decimal precision.
 * @param value - Float or decimal string (e.g. 1.23 or "0.0001")
 * @returns bigint representing value * 10^18
 */
export const toBigIntPrecision = (
    value: number | string,
    decimals: number = 18
) => {
    if (typeof value === "number") {
        // Convert to fixed string to avoid scientific notation issues
        return parseUnits(value.toFixed(24), decimals); // 24 = extra precision buffer
    }

    if (typeof value === "string") {
        return parseUnits(value, decimals);
    }

    throw new Error("Invalid input type for toBigIntPrecision");
};

/**
 * Multiplies two values with a given precision
 */
export const mulPrecision = (a: bigint | number | string, b: bigint | number | string) => {
    // Handle NaN and ensure both parameters are BigInt
    const bigIntA = typeof a === 'bigint' ? a : (isNaN(Number(a)) ? 0n : BigInt(a || 0));
    const bigIntB = typeof b === 'bigint' ? b : (isNaN(Number(b)) ? 0n : BigInt(b || 0));
    return (bigIntA * bigIntB) / DECIMALS_18;
};

/**
 * Divides two values with a given precision
 */
export const divPrecision = (a: bigint | number | string, b: bigint | number | string) => {
    // Handle NaN and ensure both parameters are BigInt
    const bigIntA = typeof a === 'bigint' ? a : (isNaN(Number(a)) ? 0n : BigInt(a || 0));
    const bigIntB = typeof b === 'bigint' ? b : (isNaN(Number(b)) ? 0n : BigInt(b || 0));
    
    // Prevent division by zero
    if (bigIntB === 0n) return 0n;
    
    return (bigIntA * DECIMALS_18) / bigIntB;
};

export const isZeroLike = (v: unknown): boolean => [0, 0n, undefined].includes(v as number | bigint | undefined) || Number.isNaN(v as number);

/**
 * Normalizes various value types to a bigint:
 * - bigint → returned as-is
 * - bytes32 hex string (0x-prefixed, 32 bytes) → converted using hexToBigInt
 * - numeric string (e.g. "123456") → converted using BigInt()
 * - any other format → returns null
 *
 * @param value - The value to normalize (can be bigint, string, hex, etc.)
 * @returns bigint if conversion is successful, otherwise null
 */
export const normalizeToBigInt = (value: bigint | string | number | null | undefined) => {
    // Case 1: already a bigint
    if (typeof value === "bigint") return value;

    // Case 2: null or undefined
    if (value === null || value === undefined) return null;

    // Case 3: number
    if (typeof value === "number") {
        try {
            return BigInt(Math.floor(value));
        } catch (err) {
            return null;
        }
    }

    // Case 4: hex string (e.g. bytes32)
    if (typeof value === "string" && isHex(value)) {
        if (value.length === 66) {
            // 0x + 64 hex chars = bytes32
            try {
                return hexToBigInt(value);
            } catch (err) {
                return null;
            }
        }
    }

    // Case 5: decimal numeric string (e.g. "1234567890000000000")
    if (typeof value === "string" && /^\d+$/.test(value)) {
        try {
            return BigInt(value);
        } catch (err) {
            return null;
        }
    }

    // Could not normalize
    return null;
};

export const absBigInt = (x: bigint): bigint => {
    return x < 0n ? -x : x;
};

export const fromWei = (amount: bigint, decimals: number = 18) => {
    return formatUnits(amount, decimals).toString();
};

export const divToFixed = (n: bigint, d: bigint, decimals: number) => {
    const scale = 10n ** BigInt(decimals);
    return (n * scale) / d; // entero que representa el número en "decimals" decimales
};
