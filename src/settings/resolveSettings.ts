import type { Settings, TokenConfig } from "../types/hooks";

type TokenRef = { key: number; token: string; [k: string]: unknown };

function isTokenRef(entry: unknown): entry is TokenRef {
    return (
        typeof entry === "object" &&
        entry !== null &&
        "token" in entry &&
        typeof (entry as Record<string, unknown>).token === "string"
    );
}

export function resolveSettings(
    rawSettings: unknown,
    globalTokens: Record<string, TokenConfig>
): Settings {
    const s = rawSettings as Record<string, unknown>;
    const rawTokens = (s.tokens ?? {}) as Record<string, unknown[]>;

    const tokens: Record<string, TokenConfig[]> = {};
    for (const [type, entries] of Object.entries(rawTokens)) {
        tokens[type] = entries.map((entry) => {
            if (isTokenRef(entry)) {
                const { token, ...overrides } = entry;
                const base = globalTokens[token];
                if (!base) {
                    throw new Error(
                        `[settings] Token "${token}" not found in global.json`
                    );
                }
                return { ...base, ...overrides } as TokenConfig;
            }
            return entry as TokenConfig;
        });
    }

    return { ...s, tokens } as unknown as Settings;
}
