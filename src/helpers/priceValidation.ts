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
