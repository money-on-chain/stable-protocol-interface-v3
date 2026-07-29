const ALLOWED_OPERATIONS_ORIGINS = new Set([
    "https://api-v2.flipmoney.io",
    "https://api-testnet.flipmoney.io",
    "https://api-v2.rifonchain.com",
    "https://api-v2-testnet.rifonchain.com",
    "https://api-testnet.stablex.pro",
    "https://api-operations.moneyonchain.com",
    "https://api-operations-testnet.moneyonchain.com",
]);

const ALLOWED_INCENTIVES_ORIGINS = new Set([
    "https://moc-incentives.moneyonchain.com",
    "https://moc-incentives-testnet.moneyonchain.com",
]);

function validateAndGetApiBase(
    envVarName: string,
    rawValue: string | undefined,
    allowedOrigins: Set<string>
): string {
    if (!rawValue) {
        console.error(`[apiConfig] ${envVarName} is not configured`);
        return "";
    }

    let url: URL;
    try {
        url = new URL(rawValue);
    } catch (_e: unknown) {
        const msg = `[apiConfig] ${envVarName} is not a valid URL: "${rawValue}"`;
        if (import.meta.env.DEV) throw new Error(msg);
        console.error(msg);
        return "";
    }

    // DEV-only escape hatch: local dev/testing against a local API server
    // (e.g. a mock backend or local fork setup) shouldn't require adding
    // 127.0.0.1 to the production allowlist. Production builds (DEV=false)
    // never take this branch.
    const isLocalhost =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (!allowedOrigins.has(url.origin) && !(import.meta.env.DEV && isLocalhost)) {
        const msg = `[apiConfig] API origin "${url.origin}" is not in the allowlist for ${envVarName}`;
        if (import.meta.env.DEV) throw new Error(msg);
        console.error(msg);
        return "";
    }

    return rawValue;
}

export const API_OPERATIONS_BASE = validateAndGetApiBase(
    "REACT_APP_ENVIRONMENT_API_OPERATIONS",
    import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS as string | undefined,
    ALLOWED_OPERATIONS_ORIGINS
);

// Backs moc-v1's Liquidity Mining rewards (see hooks/useIncentives.ts) — the
// legacy off-chain/agent-relayed reward system ported from the old dapp.
// Only moc-v1 configures this env var; other flavors leave it unset.
export const API_INCENTIVES_BASE = validateAndGetApiBase(
    "REACT_APP_ENVIRONMENT_API_INCENTIVES",
    import.meta.env.REACT_APP_ENVIRONMENT_API_INCENTIVES as string | undefined,
    ALLOWED_INCENTIVES_ORIGINS
);
