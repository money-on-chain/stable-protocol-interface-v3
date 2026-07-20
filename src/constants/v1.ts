// Constants for the legacy v1 MoC contracts (main-RBTC-contract).
// v1 has a single collateral bucket — every bucket-scoped read/write uses this constant.
// Solidity: `bytes32 constant public BUCKET_C0 = "C0";` (MoCConstants.sol)

import { type Address, stringToHex } from "viem";

export const BUCKET_C0 = stringToHex("C0", { size: 32 });

const env = (k: string): string | undefined => {
    const importMetaEnv =
        typeof import.meta !== "undefined"
            ? (import.meta as { env?: Record<string, string> }).env?.[k]
            : undefined;
    const processEnv =
        typeof process !== "undefined"
            ? (process as { env?: Record<string, string> }).env?.[k]
            : undefined;
    return importMetaEnv || processEnv;
};

export const MOC_V1_ADDRESS = env("REACT_APP_CONTRACT_MOC_V1") as
    | Address
    | undefined;

export const VENDOR_ADDRESS_V1 = env("REACT_APP_ENVIRONMENT_VENDOR_ADDRESS") as
    | Address
    | undefined;

// MoCInrate.sol tx-type constants for the `commissionRatesByTxType` mapping.
export const MINT_BPRO_FEES_RBTC = 1;
export const REDEEM_BPRO_FEES_RBTC = 2;
export const MINT_DOC_FEES_RBTC = 3;
export const REDEEM_DOC_FEES_RBTC = 4;
// MOC-denominated counterparts — a genuinely different rate from the RBTC ones
// above (see MoCExchange.calculateCommissionsWithPrices, which picks one set or
// the other depending on the caller's MOC balance/allowance).
export const MINT_BPRO_FEES_MOC = 7;
export const REDEEM_BPRO_FEES_MOC = 8;
export const MINT_DOC_FEES_MOC = 9;
export const REDEEM_DOC_FEES_MOC = 10;
