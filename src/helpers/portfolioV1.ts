// Portfolio USD valuation for the legacy v1 MoC contracts.
// v1 has exactly 4 fixed tokens (no CA-indexed/portfolio_table-driven loop like
// the v3 helper in helpers/portfolio.ts) — RBTC, BPro, DOC (pegged), MOC.
import { mulPrecision, WAD } from "../helpers/precision";
import type { ContractProtocolStatusV1Result, UserBalanceV1Result } from "../types/hooks-v1";
import type { UseBaseCoinBalanceResult } from "../types/status";

export type PortfolioRowV1 = {
    key: string;
    tokenTicker: string;
    tokenName: string;
    price: bigint;
    priceAvailable: boolean;
    balance: bigint;
    balanceLoaded: boolean;
    balanceUSD: bigint;
    visiblePriceDecimals: number;
    visibleBalanceDecimals: number;
    visibleBalanceUSDDecimals: number;
};

export function getPortfolioRowsV1(
    contractProtocolStatus: ContractProtocolStatusV1Result,
    userBalance: UserBalanceV1Result,
    userBaseCoinBalance: UseBaseCoinBalanceResult
): PortfolioRowV1[] {
    const status = contractProtocolStatus.data;
    const balances = userBalance.data;
    const rbtcBalance = userBaseCoinBalance.balance;

    const rbtcPrice = status?.getBitcoinPrice ?? 0n;
    const bproPrice = status?.bproUsdPrice ?? 0n;
    const mocPrice = status?.mocUsdPrice ?? 0n;

    return [
        {
            key: "COINBASE",
            tokenTicker: "RBTC",
            tokenName: "Smart Bitcoin",
            price: rbtcPrice,
            priceAvailable: rbtcPrice > 0n,
            balance: rbtcBalance ?? 0n,
            balanceLoaded: rbtcBalance != null,
            balanceUSD: mulPrecision(rbtcBalance ?? 0n, rbtcPrice),
            visiblePriceDecimals: 2,
            visibleBalanceDecimals: 8,
            visibleBalanceUSDDecimals: 2,
        },
        {
            key: "TC",
            tokenTicker: "BPRO",
            tokenName: "BPro",
            price: bproPrice,
            priceAvailable: bproPrice > 0n,
            balance: balances?.BPro?.balance ?? 0n,
            balanceLoaded: balances?.BPro?.balance != null,
            balanceUSD: mulPrecision(balances?.BPro?.balance ?? 0n, bproPrice),
            visiblePriceDecimals: 2,
            visibleBalanceDecimals: 8,
            visibleBalanceUSDDecimals: 2,
        },
        {
            key: "TP",
            tokenTicker: "DOC",
            tokenName: "Dollar on Chain",
            price: WAD,
            priceAvailable: true,
            balance: balances?.DOC?.balance ?? 0n,
            balanceLoaded: balances?.DOC?.balance != null,
            balanceUSD: balances?.DOC?.balance ?? 0n,
            visiblePriceDecimals: 2,
            visibleBalanceDecimals: 2,
            visibleBalanceUSDDecimals: 2,
        },
        {
            key: "TG",
            tokenTicker: "MOC",
            tokenName: "MOC",
            price: mocPrice,
            priceAvailable: mocPrice > 0n,
            balance: balances?.MOC?.balance ?? 0n,
            balanceLoaded: balances?.MOC?.balance != null,
            balanceUSD: mulPrecision(balances?.MOC?.balance ?? 0n, mocPrice),
            visiblePriceDecimals: 4,
            visibleBalanceDecimals: 2,
            visibleBalanceUSDDecimals: 2,
        },
    ];
}

export function getPortfolioTotalUsdV1(
    contractProtocolStatus: ContractProtocolStatusV1Result,
    userBalance: UserBalanceV1Result,
    userBaseCoinBalance: UseBaseCoinBalanceResult
): bigint {
    if (!contractProtocolStatus.data || !userBalance.data) return 0n;

    return getPortfolioRowsV1(
        contractProtocolStatus,
        userBalance,
        userBaseCoinBalance
    ).reduce((total, row) => total + row.balanceUSD, 0n);
}
