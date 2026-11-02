export interface LendCardData {
    availableToWithdrawAmount: string;
    availableToWithdrawAmountUsd: string;
    caIndex: number;
    id: string;
    tokenCode: string;
    tokenDecimals: number;
    tokenIconClassName: string;
    tokenName: string;
    tokenTicker: string;
    supplyApy: string;
    depositedAmount: string;
    depositedTicker: string;
    depositedAmountUsd: string;
    walletBalance: string;
    // Unix seconds when the pool's next scheduled liquidity injection
    // (see MocLendingManager.triggerTPInjection) becomes callable.
    nextInjectionAt: number;
    // Whether nextInjectionAt has passed the chain's own current block
    // timestamp (not the browser's clock — see useChainTime).
    injectionReady: boolean;
}
