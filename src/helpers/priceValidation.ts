/**
 * Price validity check (on-chain `peek()` valid flag) is enabled by default.
 * Set REACT_APP_PRICE_VALIDATION=false for deployments where the protocol
 * runs with off-chain prices and oracles only publish a price when an
 * operation is sent, so an on-chain "invalid" price is expected.
 */
export const isPriceValidationEnabled = (): boolean =>
    String(import.meta.env.REACT_APP_PRICE_VALIDATION ?? "")
        .trim()
        .toLowerCase() !== "false";

type PeekTuple = { 0?: unknown; 1?: unknown } | null | undefined;

type ProtocolPricesData = {
    [ca: number]:
        | {
              PP_CA?: PeekTuple;
              PP_FeeToken?: PeekTuple;
              PP_TP?: Record<number, PeekTuple>;
          }
        | undefined;
};

// Only CA / TP prices block a bucket — an invalid fee token price just
// disables paying the fee with it (see isFeeTokenPriceInvalid)
const bucketHasInvalidPrice = (
    bucket: ProtocolPricesData[number],
    tpCount: number
): boolean | null => {
    if (!bucket || !bucket.PP_CA || !bucket.PP_TP) return null;
    if (!bucket.PP_CA[1]) return true;
    for (let tp = 0; tp < tpCount; tp++) {
        if (!bucket.PP_TP[tp]?.[1]) return true;
    }
    return false;
};

/**
 * v3 (roc / flipmoney): per-bucket flag, true when one of that bucket's price
 * providers (CA, TPs) reports invalid in peek() — the bucket
 * can't operate. All false while data is incomplete or failed peeks are
 * still being retried, so it never blocks on loading state.
 */
export const invalidPriceBuckets = (
    data: unknown,
    counts: { CA: number; TP: number },
    isRetryingPeeks?: boolean
): boolean[] => {
    const none = Array<boolean>(counts.CA).fill(false);
    if (!isPriceValidationEnabled() || isRetryingPeeks) return none;

    const status = data as ProtocolPricesData | undefined;
    if (!status) return none;

    return none.map(
        (_, ca) => bucketHasInvalidPrice(status[ca], counts.TP) === true
    );
};

/**
 * v3: true when the `caIndex` bucket (or, without it, any bucket) has an
 * invalid price. See invalidPriceBuckets.
 */
export const hasInvalidProtocolPrice = (
    data: unknown,
    counts: { CA: number; TP: number },
    options: { caIndex?: number; isRetryingPeeks?: boolean } = {}
): boolean => {
    const buckets = invalidPriceBuckets(data, counts, options.isRetryingPeeks);
    return options.caIndex !== undefined
        ? buckets[options.caIndex] === true
        : buckets.some(Boolean);
};

/**
 * v3: true when the `caIndex` bucket's fee token price is invalid, so the
 * fee can't be paid with the fee token (pay with the collateral instead).
 */
export const isFeeTokenPriceInvalid = (
    data: unknown,
    caIndex: number,
    isRetryingPeeks?: boolean
): boolean => {
    if (!isPriceValidationEnabled() || isRetryingPeeks) return false;
    const feeToken = (data as ProtocolPricesData | undefined)?.[caIndex]
        ?.PP_FeeToken;
    return !!feeToken && !feeToken[1];
};

type ProtocolPricesDataV1 = { PP_BTC?: PeekTuple; PP_MOC?: PeekTuple };

/**
 * moc-v1: true when the BTC price provider peek() reports invalid (no
 * operations). Same loading semantics as hasInvalidProtocolPrice.
 */
export const hasInvalidProtocolPriceV1 = (
    data: ProtocolPricesDataV1 | undefined,
    isRetryingPeeks?: boolean
): boolean => {
    if (!isPriceValidationEnabled() || isRetryingPeeks || !data) return false;
    return !!data.PP_BTC && !data.PP_BTC[1];
};

/**
 * moc-v1: true when the MoC price is invalid, so the fee can't be paid in
 * MOC (pay in RBTC instead).
 */
export const isMocPriceInvalidV1 = (
    data: ProtocolPricesDataV1 | undefined,
    isRetryingPeeks?: boolean
): boolean => {
    if (!isPriceValidationEnabled() || isRetryingPeeks || !data) return false;
    return !!data.PP_MOC && !data.PP_MOC[1];
};
