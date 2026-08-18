// Fee/output preview math for the legacy v1 MoC contracts.
//
// Mirrors MoCInrate.calcCommissionValue(rbtcAmount, txType) and
// MoCInrate.calculateVendorMarkup(vendorAccount, amount), both of which compute
// `amount * rate / mocPrecision` on-chain (mocPrecision = 1e18, MoCLibConnection.sol).
// Done off-chain here from already-fetched rates (useContractProtocolStatusV1)
// so the UI isn't round-tripping to the RPC on every keystroke.
//
// Important: MoC.sol's transferCommissions() lets the *contract* decide at call
// time whether to charge commission+markup in RBTC or in MOC, based on the
// caller's live MOC balance/allowance (MoCExchange.calculateCommissionsWithPrices).
// The frontend cannot know that choice in advance without also comparing MoC
// price/balance the same way the contract does. Instead of replicating that
// branch, `valueToSend` below is deliberately the *RBTC-fee-path* amount
// (amount + commission + markup) — a safe upper bound: if the contract ends up
// charging fees in MOC instead, `transferCommissions` refunds the RBTC excess
// (`safeTransferRbtc(sender, value.sub(totalBtcWithFees))`) automatically, so
// sending this amount is always sufficient and never lossy.

const MOC_PRECISION = 10n ** 18n;

export type FeePreviewV1 = {
    /** RBTC commission (worst-case estimate — contract may charge in MOC and refund this) */
    commission: bigint;
    /** RBTC vendor markup (same caveat as commission) */
    markup: bigint;
    /** commission + markup */
    total: bigint;
    /** amount + total — safe upper-bound msg.value for mint operations */
    valueToSend: bigint;
};

const applyRate = (rbtcAmount: bigint, rate: bigint): bigint =>
    (rbtcAmount * rate) / MOC_PRECISION;

export const previewFeesV1 = (
    rbtcAmount: bigint,
    commissionRate: bigint,
    vendorMarkupRate: bigint
): FeePreviewV1 => {
    const commission = applyRate(rbtcAmount, commissionRate);
    const markup = applyRate(rbtcAmount, vendorMarkupRate);
    const total = commission + markup;
    return {
        commission,
        markup,
        total,
        valueToSend: rbtcAmount + total,
    };
};

// MOC-denominated fee preview — mirrors MoCExchange.calculateCommissionsWithPrices'
// MOC branch exactly: rate * rbtcAmount is worked out in BTC terms first (using the
// MOC-specific commission rate, which is NOT the same rate as the RBTC path — see
// MoCInrate.sol's *_FEES_MOC vs *_FEES_RBTC constants), then that BTC-denominated
// value is converted to MOC via btcPrice/mocPrice. Vendor markup uses the same rate
// as the RBTC path (there's only one vendor-markup rate), just converted the same way.
export const previewFeesMocV1 = (
    rbtcAmount: bigint,
    mocCommissionRate: bigint,
    vendorMarkupRate: bigint,
    btcPrice: bigint,
    mocPrice: bigint
): FeePreviewV1 => {
    if (mocPrice === 0n) {
        return { commission: 0n, markup: 0n, total: 0n, valueToSend: 0n };
    }
    const commissionInBtc = applyRate(rbtcAmount, mocCommissionRate);
    const markupInBtc = applyRate(rbtcAmount, vendorMarkupRate);
    const commission = (commissionInBtc * btcPrice) / mocPrice;
    const markup = (markupInBtc * btcPrice) / mocPrice;
    const total = commission + markup;
    return {
        commission,
        markup,
        total,
        valueToSend: rbtcAmount,
    };
};
