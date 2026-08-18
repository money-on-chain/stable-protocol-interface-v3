// Pure helpers backing moc-v1's operations history — ported from the old
// dapp's src/helpers/helper.jsx (readJsonTable/TokenName*). moc-v1's legacy
// contracts have no MocQueue/caIndex, so they're served by the SAME backend
// endpoint the old dapp used (webapp/transactions/list/), not v3's
// caIndex-shaped v1/operations/list/ (confirmed: the latter 404s on the host
// moc-v1's .env points at — same host the old dapp used).
import settings from "../settings";
import type { TokenConfig } from "../types/hooks";

export interface RawOperationV1 {
    _id: string;
    createdAt?: string;
    event: string;
    tokenInvolved?: string;
    status?: string;
    confirmingPercent?: number;
    address?: string;
    transactionHash?: string;
    RBTCAmount?: string | number;
    amount?: string | number;
    confirmationTime?: string;
    blockNumber?: number;
    rbtcCommission?: string | number;
    mocCommissionValue?: string | number;
    reservePrice?: string | number;
    gasFeeRBTC?: string | number;
}

export interface RawOperationsListV1 {
    transactions: RawOperationV1[];
    total: number;
}

// Old dapp's TokenNameNewToOld — the legacy backend still expects its
// original token naming for the `token` filter query param.
export function tokenNameNewToOldV1(tokenName: string): string {
    switch (tokenName) {
        case "TP":
            return "STABLE";
        case "TC":
            return "RISKPRO";
        case "TG":
            return "MOC";
        case "all":
            return "all";
        default:
            throw new Error("Invalid token name");
    }
}

export type OperationKindV1 = "mint" | "redeem" | "transfer" | "failed";

export interface OperationSideV1 {
    amount: bigint;
    token: TokenConfig;
    tokenId: string; // e.g. "CA_0", "TC_0", "TP_0" — matches existing icon-token-* CSS classes
}

export interface ParsedOperationV1 {
    key: string;
    kind: OperationKindV1;
    createdAtUnix: number;
    confirmationUnix: number | null;
    address: string;
    txHash: string;
    blockNumber: number | string;
    fee: { amount: bigint; token: TokenConfig; tokenId: string } | null;
    reservePriceUSD: bigint;
    statusRaw: string;
    confirmingPercent: number;
    exchange: OperationSideV1;
    receive: OperationSideV1;
}

function toBigInt(value: string | number | undefined): bigint {
    if (value === undefined || value === null || value === "") return 0n;
    try {
        return BigInt(String(value).split(".")[0]);
    } catch {
        return 0n;
    }
}

function dateToUnix(value: string | undefined): number {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

// Dispatches a raw v1 transaction into a two-sided exchange/receive shape,
// mirroring v3's LastOperations tokenExchange but for moc-v1's much simpler
// event set. moc-v1 has no TX (BTCX/leverage) bucket in settings at all (see
// settings/projects/moc-v1/settings.json), so leverage-related legacy events
// (RiskProxMint/Redeem, SettlementDeleveraging, RedeemRequestAlter,
// BucketLiquidation) can't be rendered here — same as v3's own tokenExchange,
// unrecognized rows are dropped rather than rendered broken.
export function parseOperationV1(
    raw: RawOperationV1
): ParsedOperationV1 | undefined {
    const ca = settings.tokens.CA[0];
    const tc = settings.tokens.TC[0];
    const tp = settings.tokens.TP[0];

    const amount = toBigInt(raw.amount);
    const rbtcAmount = toBigInt(raw.RBTCAmount);

    let kind: OperationKindV1;
    let exchange: OperationSideV1;
    let receive: OperationSideV1;

    switch (raw.event) {
        case "RiskProMint":
            kind = "mint";
            exchange = { amount: rbtcAmount, token: ca, tokenId: "CA_0" };
            receive = { amount, token: tc, tokenId: "TC_0" };
            break;
        case "RiskProRedeem":
            kind = "redeem";
            exchange = { amount, token: tc, tokenId: "TC_0" };
            receive = { amount: rbtcAmount, token: ca, tokenId: "CA_0" };
            break;
        case "StableTokenMint":
            kind = "mint";
            exchange = { amount: rbtcAmount, token: ca, tokenId: "CA_0" };
            receive = { amount, token: tp, tokenId: "TP_0" };
            break;
        case "StableTokenRedeem":
        case "FreeStableTokenRedeem":
            kind = "redeem";
            exchange = { amount, token: tp, tokenId: "TP_0" };
            receive = { amount: rbtcAmount, token: ca, tokenId: "CA_0" };
            break;
        case "Transfer": {
            kind = "transfer";
            // raw.tokenInvolved comes straight off the legacy backend, which
            // still uses its own old naming (RISKPRO/STABLE), not the new
            // TC/TP identifiers — see the old dapp's TokenNameOldToNew.
            const isBpro = raw.tokenInvolved === "RISKPRO";
            const transferToken = isBpro ? tc : tp;
            const transferTokenId = isBpro ? "TC_0" : "TP_0";
            exchange = { amount, token: transferToken, tokenId: transferTokenId };
            receive = { amount, token: transferToken, tokenId: transferTokenId };
            break;
        }
        // The legacy backend logs reverted/failed txs with event:"ERROR" and
        // every other field null (no tokenInvolved/amount to build a real
        // exchange/receive side from). It still counts toward the API's
        // `total`/pagination though, so this must render a row — dropping it
        // (like the true default case below) would desync the visible row
        // count from the pagination total.
        case "ERROR":
            kind = "failed";
            exchange = { amount: 0n, token: ca, tokenId: "CA_0" };
            receive = { amount: 0n, token: ca, tokenId: "CA_0" };
            break;
        default:
            return undefined;
    }

    const mocCommission = toBigInt(raw.mocCommissionValue);
    const rbtcCommission = toBigInt(raw.rbtcCommission);
    const fee =
        mocCommission > 0n
            ? { amount: mocCommission, token: settings.tokens.TG[0], tokenId: "TG" }
            : rbtcCommission > 0n
              ? { amount: rbtcCommission, token: ca, tokenId: "CA_0" }
              : null;

    return {
        key: raw._id,
        kind,
        createdAtUnix: dateToUnix(raw.createdAt),
        confirmationUnix: raw.confirmationTime
            ? dateToUnix(raw.confirmationTime)
            : null,
        address: raw.address && raw.address !== "" ? raw.address : "",
        txHash: raw.transactionHash || "",
        blockNumber: raw.blockNumber ?? "--",
        fee,
        reservePriceUSD: toBigInt(raw.reservePrice),
        // event:"ERROR" rows always come back with status:null from the
        // legacy backend — force the "failed" label rather than falling
        // through to the "" -> statusQueued default below.
        statusRaw: kind === "failed" ? "error" : raw.status || "",
        confirmingPercent: raw.confirmingPercent ?? 0,
        exchange,
        receive,
    };
}

// Best-effort status mapping: the legacy backend doesn't expose the same
// block-confirmation-count model v3's LastOperations uses (see its
// getStatus) — it returns a coarse status string plus a confirmingPercent
// instead. There's no live sample data available to enumerate every raw
// status value, so this treats "confirmed" (or 100% progress) as done,
// partial progress as confirming, obvious failure markers as failed, and
// falls back to queued.
export function statusLabelKeyV1(statusRaw: string, percent: number): string {
    const s = statusRaw.toLowerCase();
    if (s.includes("fail") || s.includes("error") || s.includes("revert")) {
        return "operations.actions.statusFailed";
    }
    if (s === "confirmed" || percent >= 100) {
        return "operations.actions.statusConfirmed";
    }
    if (percent > 0 || s.includes("confirm")) {
        return "operations.actions.statusConfirming";
    }
    return "operations.actions.statusQueued";
}

export function statusIconV1(labelKey: string): string {
    switch (labelKey) {
        case "operations.actions.statusQueued":
            return "QUEUED";
        case "operations.actions.statusConfirming":
            return "CONFIRMING";
        case "operations.actions.statusConfirmed":
            return "CONFIRMED";
        case "operations.actions.statusFailed":
            return "FAILED";
        default:
            return "QUEUING";
    }
}

export function truncateAddressV1(value: string, length = 6): string {
    if (!value) return "";
    if (value.length <= length * 2 + 2) return value;

    return `${value.substring(0, length + 2)}…${value.substring(value.length - length)}`;
}

// Matches v3's LastOperations getAsset — same icon-token-* CSS classes are
// already used across moc-v1 (ExchangeV1, PortfolioV1, etc.) for these
// exact CA_0/TC_0/TP_0 identifiers.
export function getAssetV1(tokenId: string): { iconClass: string } {
    const match = tokenId.match(/^(CA|TC|TP)_(\d+)$/);
    if (match) {
        const [, prefix, index] = match;
        return { iconClass: `icon-token-${prefix.toLowerCase()}_${index}` };
    }

    return { iconClass: "icon-token-MOC" };
}

// PrecisionNumbers always truncates (never rounds) so balances never look
// bigger than they really are — fine for live balances, but it makes a
// historical operation amount that's a hair under a round number (e.g.
// 1.9997 DOC) look odd/imprecise in this read-only list. Round the raw
// bigint to the token's own visibleDecimals first so the (still-truncating)
// display renders the already-rounded value cleanly, e.g. "2.00 DOC".
export function roundToVisibleDecimalsV1(
    amount: bigint,
    tokenDecimals: number,
    visibleDecimals: number
): bigint {
    if (visibleDecimals >= tokenDecimals) return amount;

    const scale = 10n ** BigInt(tokenDecimals - visibleDecimals);
    const half = scale / 2n;

    return amount >= 0n
        ? ((amount + half) / scale) * scale
        : ((amount - half) / scale) * scale;
}
