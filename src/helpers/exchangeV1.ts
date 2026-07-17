// Token-pair exchange helpers for the legacy v1 MoC contracts — mirrors the
// "you exchange" / "you receive" token-pair structure of components/Exchange,
// but over v1's fixed, symmetric pair set (no caIndex, no multi-TP swaps):
//   CA_0 (RBTC) <-> TC_0 (BPro)   — mint / redeem BPro
//   CA_0 (RBTC) <-> TP_0 (DOC)    — mint / redeem DOC
// Every pair here is a straight mint (CA -> TC/TP) or redeem (TC/TP -> CA);
// helpers/exchange.ts's typeOperation()/isMintOperation() already classify
// these correctly from the token-name prefixes alone, so they're reused as-is.
import type {
    ContractProtocolStatusV1Data,
    UserBalanceV1Data,
} from "../types/hooks-v1";
import { WAD, wadDiv, wadMul } from "./precision";

export type MintTokenV1 = "BPRO" | "DOC";

const TOKEN_MAP_V1: Record<string, string[]> = {
    CA_0: ["TC_0", "TP_0"],
    TC_0: ["CA_0"],
    TP_0: ["CA_0"],
};

export const tokenExchangeV1 = (): string[] => Object.keys(TOKEN_MAP_V1);

export const tokenReceiveV1 = (from: string): string[] =>
    TOKEN_MAP_V1[from] ?? [];

export function tokenBalanceV1(
    token: string,
    balances: UserBalanceV1Data | undefined,
    rbtcBalance: bigint
): bigint {
    switch (token) {
        case "CA_0":
            return rbtcBalance;
        case "TC_0":
            return balances?.BPro?.balance ?? 0n;
        case "TP_0":
            return balances?.DOC?.balance ?? 0n;
        default:
            return 0n;
    }
}

export function estimateMintOutput(
    token: MintTokenV1,
    btcAmount: bigint,
    status: ContractProtocolStatusV1Data
): bigint {
    if (token === "BPRO") {
        // bproTecPrice = RBTC per BPro (WAD) — bproAmount = btcAmount / bproTecPrice
        return status.bproTecPrice === 0n
            ? 0n
            : wadDiv(btcAmount, status.bproTecPrice);
    }
    // getBitcoinPrice = USD per RBTC (WAD) — DOC is pegged 1:1 to USD
    return wadMul(btcAmount, status.getBitcoinPrice);
}

export function estimateRedeemOutput(
    token: MintTokenV1,
    tokenAmount: bigint,
    status: ContractProtocolStatusV1Data
): bigint {
    if (token === "BPRO") {
        return wadMul(tokenAmount, status.bproTecPrice);
    }
    return status.getBitcoinPrice === 0n
        ? 0n
        : wadDiv(tokenAmount, status.getBitcoinPrice);
}

// USD price (WAD) for a token — DOC is a stablecoin pegged 1:1 to USD, so
// its price is just WAD rather than a status field.
export function tokenUsdPriceV1(
    token: string,
    status: ContractProtocolStatusV1Data
): bigint {
    switch (token) {
        case "CA_0":
            return status.getBitcoinPrice;
        case "TC_0":
            return status.bproUsdPrice;
        case "TP_0":
            return WAD;
        default:
            return 0n;
    }
}

// Unified estimate over a (from, to) token pair — dispatches to
// estimateMintOutput/estimateRedeemOutput based on which side is RBTC (CA_0).
export function estimateExchangeOutputV1(
    from: string,
    to: string,
    amount: bigint,
    status: ContractProtocolStatusV1Data
): bigint {
    const token: MintTokenV1 = from === "TP_0" || to === "TP_0" ? "DOC" : "BPRO";
    return from === "CA_0"
        ? estimateMintOutput(token, amount, status)
        : estimateRedeemOutput(token, amount, status);
}
