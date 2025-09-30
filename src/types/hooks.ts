// src/types.ts

export type Address = `0x${string}`;

export type ContractInfo = {
    address: Address;
    abi: readonly unknown[];
    name?: string;
    type?: string;
};

/** Bag of contracts discovered at runtime */
export type DContracts = {
    // Governance contracts
    VestingFactory?: ContractInfo;
    TG?: ContractInfo;
    StakingMachine?: ContractInfo;
    DelayMachine?: ContractInfo;
    VotingMachine?: ContractInfo;
    VetoMachine?: ContractInfo;
    IncentiveV2?: ContractInfo;
    IRegistry?: ContractInfo;
    VestingMachine?: ContractInfo;

    // Protocol contracts
    MocMultiCollateralGuard?: ContractInfo;
    PP_COINBASE?: ContractInfo;

    // Protocol buckets Arrays
    Moc?: ContractInfo[];
    CA?: ContractInfo[];
    CollateralToken?: ContractInfo[];
    MocVendors?: ContractInfo[];
    MocQueue?: ContractInfo[];
    FeeToken?: ContractInfo[];
    PP_FeeToken?: ContractInfo[];
    FC_MAX_ABSOLUTE_OP_PROVIDER?: ContractInfo[];
    FC_MAX_OP_DIFFERENCE_PROVIDER?: ContractInfo[];
    TP?: ContractInfo[];
    PP_CA?: ContractInfo[];
    // Pair matrix (CA x TP) of price providers
    PP_TP?: Record<number, ContractInfo[]>;

    // Extras contracts
    tp_legacy?: ContractInfo;
    token_migrator?: ContractInfo;

    [k: string]:
        | ContractInfo
        | ContractInfo[]
        | Record<number, ContractInfo[]>
        | undefined;
};

export type PrimitiveSol =
    | "bool"
    | "address"
    | "uint256"
    | "int256"
    | "bytes32"
    | "string"
    | "uint256[]";

export type TupleField = {
    type: string;
    name?: string;
    internalType?: string;
};
export type ResultType = PrimitiveSol | readonly TupleField[];

export type CallRequest = {
    contract: ContractInfo;
    functionName: string;
    args: readonly unknown[];
    resultType: ResultType;
    keys: readonly (string | number)[];
};

// Define proper types for settings structure
export interface TokenConfig {
    uniqueKey?: number;
    key?: number;
    name: string;
    fullName?: string;
    decimals: number;
    visibleDecimals?: number;
    visiblePriceDecimals?: number;
    visiblePriceUSD?: number;
    visibleBalanceDecimals?: number;
    visibleBalanceUSDDecimals?: number;
    peggedUSD?: boolean;
    collateralType?: string;
    type?: string;
}

export interface SettingsTokens {
    COINBASE: TokenConfig[];
    CA: TokenConfig[];
    TP: TokenConfig[];
    TC: TokenConfig[];
    TF: TokenConfig[];
    TG: TokenConfig[];
}

export interface Settings {
    project: string;
    dapp: {
        name: string;
        description: string;
    };
    showPriceVariation: boolean;
    tokens: SettingsTokens;
}

/** Multicall response shapes we consume */
export type RegistryAddressesData = {
    MOC_STAKING_MACHINE: Address;
    SUPPORTERS_ADDR: Address;
    MOC_DELAY_MACHINE: Address;
    MOC_VESTING_MACHINE: Address;
    MOC_VOTING_MACHINE: Address;
    MOC_VETO_MACHINE: Address;
    MOC_PRICE_PROVIDER_REGISTRY: Address;
    ORACLE_MANAGER_ADDR: Address;
    MOC_TOKEN: Address;
};

// Define SyncMulticallInput interface to match runMulticallSync expectations
//export type ResultType = 'uint256' | 'int256' | 'address' | 'bool'

export interface SyncMulticallInput {
    contract: { address: `0x${string}`; abi: readonly unknown[] };
    functionName: string;
    args?: unknown[];
    resultType?: ResultType;
    keys: (string | number)[];
    transform?: (result: unknown) => unknown;
    onError?: () => { value: unknown; canOperate: boolean };
}

/** Local call shape (allows optional onError) */
export type CallRequestWithOnError = CallRequest & {
    onError?: (..._args: unknown[]) => unknown;
};

export type MocAddressesData = {
    feeToken: Address;
    feeTokenPriceProvider: Address;
    acToken?: Address;
    tcToken: Address;
    maxAbsoluteOpProvider: Address;
    maxOpDiffProvider: Address;
    mocQueue: Address;
    mocVendors: Address;
    tpTokens: Address[]; // we aggregate from keys ['tpTokens', i]
};

export type MultiCallInput = {
    contract: ContractInfo;
    functionName: string;
    args?: readonly unknown[];
    resultType?: ResultType;
    keys: (string | number)[];
    transform?: (result: unknown) => unknown;
    onError?: () => MultiCallErrorResult;
};

export interface UseStorageResult<T> {
    data: T | undefined;
    isLoading: boolean;
    isFetching: boolean;
    refetch: () => Promise<{ data: T }>;
    error: Error | null;
    queryKey?: string[];
    scopeKey?: string;
}

// Interface for parsed prices structure from offchain API
export interface ParsedPrices {
    CA: bigint;
    TP: bigint[];
    TF: bigint;
    COINBASE: bigint;
}

// Interface for external data structure used in multicall
export interface ExternalData {
    [ca: number]: {
        PP_CA: [bigint, boolean];
        PP_TP: {
            [tp: number]: [bigint, boolean];
        };
    };
    [key: string]: unknown;
}

// Interface for multicall options
export interface MultiCallOptions {
    batchSize?: number;
    refetchInterval?: number;
    enabled?: boolean;
    externalData?: ExternalData;
    scopeKey?: string;
}

// Interface for multicall result with error handling
export interface MultiCallErrorResult {
    value: unknown;
    canOperate: boolean;
}

// Interface for proposal count hook return type
export interface UseProposalCountResult {
    proposalCount: bigint | undefined;
    isLoading: boolean;
    isFetching: boolean;
    refetch: () => void;
    error: Error | null;
}
