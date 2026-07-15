const ALLOWED_API_ORIGINS = new Set([
    "https://api-v2.flipmoney.io",
    "https://api-testnet.flipmoney.io",
    "https://api-v2.rifonchain.com",
    "https://api-v2-testnet.rifonchain.com",
    "https://api-testnet.stablex.pro",
    "https://api-operations.moneyonchain.com",
    "https://api-operations-testnet.moneyonchain.com",
]);

function validateAndGetApiBase(): string {
    const raw = import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS as
        | string
        | undefined;

    if (!raw) {
        console.error(
            "[apiConfig] REACT_APP_ENVIRONMENT_API_OPERATIONS is not configured"
        );
        return "";
    }

    let url: URL;
    try {
        url = new URL(raw);
    } catch (_e: unknown) {
        const msg = `[apiConfig] REACT_APP_ENVIRONMENT_API_OPERATIONS is not a valid URL: "${raw}"`;
        if (import.meta.env.DEV) throw new Error(msg);
        console.error(msg);
        return "";
    }

    if (!ALLOWED_API_ORIGINS.has(url.origin)) {
        const msg = `[apiConfig] API origin "${url.origin}" is not in the allowlist`;
        if (import.meta.env.DEV) throw new Error(msg);
        console.error(msg);
        return "";
    }

    return raw;
}

export const API_OPERATIONS_BASE = validateAndGetApiBase();
