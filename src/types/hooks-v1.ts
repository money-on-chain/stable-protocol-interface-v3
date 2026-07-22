// Types for the legacy v1 MoC contracts (main-RBTC-contract).
// Deliberately separate from types/hooks.ts — v1 has no caIndex/MocQueue, so its
// contract bag is a flat set of single contracts, not the CA-indexed arrays used
// by the v3 flavors (moc/roc/flipmoney).

import type { PublicClient } from "viem";

import type { Address, ContractInfo, UseStorageResult } from "./hooks";

export type DContractsV1 = {
    Moc: ContractInfo;
    MoCState: ContractInfo;
    MoCInrate: ContractInfo;
    MoCVendors: ContractInfo;
    BProToken: ContractInfo;
    DocToken: ContractInfo;
    MoCToken: ContractInfo;
};

export type ContractProtocolStatusV1Data = {
    getBitcoinPrice: bigint;
    state: bigint;
    globalCoverage: bigint;
    absoluteMaxBPro: bigint;
    absoluteMaxDoc: bigint;
    freeDoc: bigint;
    blocksToSettlement: bigint;
    getBitcoinMovingAverage: bigint;
    bproTecPrice: bigint;
    bproUsdPrice: bigint;
    mocUsdPrice: bigint;
    getBucketNBTC: bigint;
    getBucketNDoc: bigint;
    getBucketNBPro: bigint;
    paused: boolean;
    // Target coverage (MoCState.cobj) and bucket C0 leverage — used to build
    // the Performance/Metrics status + reserve cards (see components/PerformanceV1).
    cobj: bigint;
    b0Leverage: bigint;
    bproDiscountPrice: bigint;
    vendorMarkup: bigint;
    mintBProFeesRbtc: bigint;
    redeemBProFeesRbtc: bigint;
    mintDocFeesRbtc: bigint;
    redeemDocFeesRbtc: bigint;
    // MOC-denominated commission rates — genuinely different from the RBTC
    // ones above, not just a currency relabeling (see MoCExchange.sol's
    // calculateCommissionsWithPrices).
    mintBProFeesMoc: bigint;
    redeemBProFeesMoc: bigint;
    mintDocFeesMoc: bigint;
    redeemDocFeesMoc: bigint;
};

export type ContractProtocolStatusV1Result = Omit<
    UseStorageResult<ContractProtocolStatusV1Data>,
    "data"
> & {
    data: ContractProtocolStatusV1Data | undefined;
};

// RBTC native balance is intentionally not here — use the existing
// `useBaseCoinBalance` hook (wraps wagmi's useBalance) instead.
export type UserBalanceV1Data = {
    BPro: { balance: bigint };
    DOC: { balance: bigint };
    MOC: { balance: bigint; allowance: bigint };
};

export type UserBalanceV1Result = Omit<
    UseStorageResult<UserBalanceV1Data>,
    "data"
> & {
    data: UserBalanceV1Data | undefined;
};

// Context bag consumed by the v1 backend transaction helpers.
export type InterfaceContextV1 = {
    publicClient: PublicClient | undefined;
    address?: Address;
    contracts: DContractsV1 | null;
    contractProtocolStatus: ContractProtocolStatusV1Result;
};
