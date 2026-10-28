// USD prices the moc-v1 UI displays (price header, portfolio, USD hints).
// The legacy contracts always execute at the on-chain oracle price, so
// anything that predicts an on-chain result (exchange "you receive" amounts,
// MOC fee amounts, coverage, leverage, TVL...) keeps reading
// contractProtocolStatusV1 directly. Display prices prefer the fresher
// off-chain API (REACT_APP_PRICE_OFFCHAIN_API) and fall back to on-chain per
// field, which also keeps prices visible while the oracle peek() is invalid.
import type { ParsedPrices } from "../types/hooks";
import type { ContractProtocolStatusV1Data } from "../types/hooks-v1";
import { WAD } from "./precision";

export type DisplayPricesV1 = {
    btcUsd: bigint;
    bproUsd: bigint;
    mocUsd: bigint;
};

/**
 * BPro USD price for a given BTC price — same integer math as MoCState's
 * bproTecPrice() for bucket C0: (nBTC - nDoc / btcPrice) / nBPro, times
 * btcPrice. Recomputing it (instead of scaling the on-chain bproTecPrice by
 * the new BTC price) keeps BPro's leverage. Returns null outside the normal
 * regime (no BPro, or DOC not fully covered), where the contract prices BPro
 * differently — callers fall back to on-chain then.
 */
const bproUsdPriceAt = (
    status: ContractProtocolStatusV1Data,
    btcUsd: bigint
): bigint | null => {
    const nBTC = status.getBucketNBTC ?? 0n;
    const nDoc = status.getBucketNDoc ?? 0n;
    const nBPro = status.getBucketNBPro ?? 0n;
    if (btcUsd <= 0n || nBPro <= 0n) return null;

    const lockedBtc = (nDoc * WAD) / btcUsd;
    if (nBTC <= lockedBtc) return null;

    const bproTecPrice = ((nBTC - lockedBtc) * WAD) / nBPro;
    return (bproTecPrice * btcUsd) / WAD;
};

export function getDisplayPricesV1(
    status: ContractProtocolStatusV1Data | undefined,
    offChainPrices: ParsedPrices[] | undefined
): DisplayPricesV1 {
    // multicall leaves reverted scalar calls as null (e.g. getBitcoinPrice
    // while the oracle has no valid price)
    const onchain: DisplayPricesV1 = {
        btcUsd: status?.getBitcoinPrice ?? 0n,
        bproUsd: status?.bproUsdPrice ?? 0n,
        mocUsd: status?.mocUsdPrice ?? 0n,
    };

    // moc-v1/prices-offchain.json maps CA to BTC/USD and TF to MOC/USD;
    // the API reports a missing pair as 0
    const offchain = offChainPrices?.[0];
    const btcUsd = offchain?.CA?.[0] ?? 0n;
    const mocUsd = offchain?.TF?.[0] ?? 0n;

    if (btcUsd <= 0n) {
        return { ...onchain, mocUsd: mocUsd > 0n ? mocUsd : onchain.mocUsd };
    }

    return {
        btcUsd,
        bproUsd: (status && bproUsdPriceAt(status, btcUsd)) ?? onchain.bproUsd,
        mocUsd: mocUsd > 0n ? mocUsd : onchain.mocUsd,
    };
}
