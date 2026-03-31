// Lightweight chain constants — no wagmi createConfig calls, no side effects.
// Safe to import from anywhere (context providers, wagmiConfig, tests, etc.)
// without triggering the full wagmi/connector initialisation.

import { localhost, rootstock, rootstockTestnet } from "wagmi/chains";

const env = (k: string): string | undefined => {
    const importMetaEnv =
        typeof import.meta !== "undefined"
            ? (import.meta as { env?: Record<string, string> }).env?.[k]
            : undefined;
    const processEnv =
        typeof process !== "undefined"
            ? (process as { env?: Record<string, string> }).env?.[k]
            : undefined;
    return importMetaEnv || processEnv;
};

export const ENV_CHAIN_ID = Number(
    env("REACT_APP_ENVIRONMENT_CHAIN_ID") ??
        env("VITE_ENVIRONMENT_CHAIN_ID") ??
        31
);

export const ALLOWED_CHAIN =
    ENV_CHAIN_ID === rootstock.id
        ? rootstock
        : ENV_CHAIN_ID === rootstockTestnet.id
          ? rootstockTestnet
          : localhost;

// Patch localhost with the multicall3 address used on RSK dev nodes.
// Creating a new object avoids mutating the shared wagmi/chains export.
const localhostWithMulticall = {
    ...localhost,
    contracts: {
        ...localhost.contracts,
        multicall3: {
            address:
                "0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`,
        },
    },
} as const;

export const CHAINS = [
    rootstock,
    rootstockTestnet,
    localhostWithMulticall,
] as const;
