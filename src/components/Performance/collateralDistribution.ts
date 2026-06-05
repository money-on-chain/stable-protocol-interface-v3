import { ConvertPeggedTokenPrice } from "../../helpers/currencies";
import { divPrecision, normalizeToBigInt } from "../../helpers/precision";
import settings from "../../settings/settings.json";
import type { TokenConfig } from "../../types/hooks";
import type {
    ContractProtocolStatusResult,
    ProtocolStatusEntry,
} from "../../types/status";

export interface CollateralDistributionRow {
    id: string;
    iconClassName: string;
    fullName: string;
    symbol: string;
    price: bigint;
    priceDecimals: number;
    ema: bigint | null;
    emaDecimals: number;
    collateralUsedRatio: bigint | null;
    minted: bigint | null;
    mintedToken: TokenConfig;
    mintedDecimals: number;
    mintable: bigint | null;
    mintableToken: TokenConfig;
    mintableDecimals: number;
    redeemable: bigint | null;
    redeemableToken: TokenConfig;
    redeemableDecimals: number;
    isMintableUnlimited: boolean;
    isRedeemableUnlimited: boolean;
    coverage: bigint | null;
    coverageToken: TokenConfig;
    coverageDecimals: number;
}

const {
    visiblePriceDecimals: defaultVisiblePriceDecimals,
    visibleDecimals: defaultVisibleDecimals,
    visibleBalanceDecimals: defaultVisibleBalanceDecimals,
} = settings.defaults.tokens;

export const RATIO_PRECISION = 10n ** 18n;

export function ratioToPercentNumber(ratio: bigint | null): number {
    if (ratio === null || ratio <= 0n) return 0;

    return Number(ratio) / Number(RATIO_PRECISION / 100n);
}

export function buildCollateralDistributionRows(
    bucketData: ProtocolStatusEntry | undefined,
    caIndex: number,
    contractProtocolStatus: ContractProtocolStatusResult
): CollateralDistributionRow[] {
    if (!bucketData?.getPTCac) return [];

    const rows: CollateralDistributionRow[] = [];
    const totalBucketAC = normalizeToBigInt(bucketData.nACcb) ?? 0n;
    const totalLockedAC = normalizeToBigInt(bucketData.getLckACOnchain) ?? 0n;
    const tcSettings = settings.tokens.TC[caIndex];
    const caSettings = settings.tokens.CA[caIndex] as TokenConfig;
    const tcCAUsed =
        totalBucketAC !== 0n && totalBucketAC >= totalLockedAC
            ? divPrecision(totalBucketAC - totalLockedAC, totalBucketAC)
            : null;

    rows.push({
        id: `TC_${caIndex}`,
        iconClassName: `icon-token-tc_${caIndex}`,
        fullName: tcSettings.fullName ?? tcSettings.name,
        symbol: tcSettings.name,
        price: normalizeToBigInt(bucketData.getPTCac) ?? 0n,
        priceDecimals:
            tcSettings.visiblePriceDecimals ?? defaultVisiblePriceDecimals,
        ema: null,
        emaDecimals: defaultVisiblePriceDecimals,
        collateralUsedRatio: tcCAUsed,
        minted: bucketData.nTCcb ? normalizeToBigInt(bucketData.nTCcb) : null,
        mintedToken: tcSettings,
        mintedDecimals: caSettings?.visibleDecimals || defaultVisibleDecimals,
        mintable: null,
        mintableToken: tcSettings,
        mintableDecimals:
            tcSettings.visibleBalanceDecimals ??
            caSettings?.visibleDecimals ??
            defaultVisibleBalanceDecimals,
        redeemable: bucketData.getRealTCAvailableToRedeem
            ? normalizeToBigInt(bucketData.getRealTCAvailableToRedeem)
            : null,
        redeemableToken: tcSettings,
        redeemableDecimals:
            caSettings?.visibleDecimals ?? defaultVisibleBalanceDecimals,
        isMintableUnlimited: true,
        isRedeemableUnlimited: false,
        coverage: null,
        coverageToken: tcSettings,
        coverageDecimals: 2,
    });

    settings.tokens.TP.forEach((tokenSettings) => {
        const tokenKey = tokenSettings.key;
        if (tokenKey === undefined) return;
        if (
            !bucketData.PP_TP?.[tokenKey] ||
            !bucketData.getRealTPAvailableToMint
        ) {
            return;
        }

        let price = normalizeToBigInt(bucketData.PP_TP[tokenKey]?.[0]) || 0n;
        price = ConvertPeggedTokenPrice(
            contractProtocolStatus,
            caIndex,
            tokenKey,
            price,
            true
        );

        const tpEMARaw = bucketData.tpEma?.[tokenKey];
        const ema = tpEMARaw?.[0]
            ? ConvertPeggedTokenPrice(
                  contractProtocolStatus,
                  caIndex,
                  tokenKey,
                  tpEMARaw[0],
                  true
              )
            : null;
        const lockedCollateral =
            normalizeToBigInt(bucketData.getLckACByTP?.[tokenKey]) ?? 0n;
        const collateralUsedRatio =
            totalBucketAC !== 0n
                ? divPrecision(lockedCollateral, totalBucketAC)
                : null;
        let availableToMint =
            normalizeToBigInt(
                bucketData.getRealTPAvailableToMint?.[tokenKey]
            ) ?? 0n;
        if (availableToMint < 0n) availableToMint = 0n;

        rows.push({
            id: `TP_${tokenKey}`,
            iconClassName: `icon-token-tp_${tokenKey}`,
            fullName: tokenSettings.fullName ?? tokenSettings.name,
            symbol: tokenSettings.name,
            price,
            priceDecimals:
                tokenSettings.visiblePriceDecimals ??
                defaultVisiblePriceDecimals,
            ema,
            emaDecimals:
                tokenSettings.visiblePriceDecimals ??
                defaultVisiblePriceDecimals,
            collateralUsedRatio,
            minted: bucketData.pegContainer?.[tokenKey]?.[0]
                ? normalizeToBigInt(bucketData.pegContainer[tokenKey][0])
                : null,
            mintedToken: tokenSettings,
            mintedDecimals:
                tokenSettings.visibleBalanceDecimals ??
                defaultVisibleBalanceDecimals,
            mintable: availableToMint || null,
            mintableToken: tokenSettings,
            mintableDecimals:
                tokenSettings.visibleBalanceDecimals ??
                defaultVisibleBalanceDecimals,
            redeemable: null,
            redeemableToken: tokenSettings,
            redeemableDecimals:
                tokenSettings.visibleBalanceDecimals ??
                defaultVisibleBalanceDecimals,
            isMintableUnlimited: false,
            isRedeemableUnlimited: true,
            coverage: bucketData.tpCtarg?.[tokenKey]
                ? normalizeToBigInt(bucketData.tpCtarg[tokenKey])
                : null,
            coverageToken: tokenSettings,
            coverageDecimals: 2,
        });
    });

    return rows;
}
