import { parseUnits, isHex, hexToBigInt, formatUnits } from 'viem'


const PRECISION_DECIMALS = 18n
const DECIMALS_18 = 10n ** PRECISION_DECIMALS;


/**
 * Converts a float or string value to bigint with 18 decimal precision.
 * @param value - Float or decimal string (e.g. 1.23 or "0.0001")
 * @returns bigint representing value * 10^18
 */
export const toBigIntPrecision = (value: number | string, decimals: number = 18) => {
    if (typeof value === 'number') {
      // Convert to fixed string to avoid scientific notation issues
      return parseUnits(value.toFixed(24), decimals); // 24 = extra precision buffer
    }
  
    if (typeof value === 'string') {
      return parseUnits(value, decimals);
    }
  
    throw new Error('Invalid input type for toBigIntPrecision');
  }

/**
 * Multiplies two values with a given precision
 */
export const mulPrecision = (a: bigint, b: bigint) => {
    return (a * b) / DECIMALS_18;
}

/**
 * Divides two values with a given precision
 */
export const divPrecision = (a: bigint, b: bigint) => {
    return (a * DECIMALS_18) / b;
}

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
export const normalizeToBigInt = (value: bigint | string | number) => {
    // Case 1: already a bigint
    if (typeof value === 'bigint') return value;

    // Case 2: hex string (e.g. bytes32)
    if (typeof value === 'string' && isHex(value)) {
        if (value.length === 66) { // 0x + 64 hex chars = bytes32
            try {
                return hexToBigInt(value);
            } catch (err) {
                return null;
            }
        }
    }

    // Case 3: decimal numeric string (e.g. "1234567890000000000")
    if (typeof value === 'string' && /^\d+$/.test(value)) {
        try {
            return BigInt(value);
        } catch (err) {
            return null;
        }
    }

    // Could not normalize
    return null;
}

export const absBigInt = (x: bigint): bigint => {
    return x < 0n ? -x : x
  }
  

export const fromWei = (amount: bigint, decimals: number = 18) => {
    return formatUnits(amount, decimals).toString()
}