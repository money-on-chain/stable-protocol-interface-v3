export interface LendCardData {
    availableToWithdrawAmount: string;
    availableToWithdrawAmountUsd: string;
    id: string;
    tokenIconClassName: string;
    tokenName: string;
    tokenTicker: string;
    supplyApy: string;
    depositedAmount: string;
    depositedTicker: string;
    depositedAmountUsd: string;
    walletBalance: string;
}

export const LEND_CARDS: LendCardData[] = [
    {
        availableToWithdrawAmount: "15,000.00",
        availableToWithdrawAmountUsd: "10.00",
        id: "arsflip",
        tokenIconClassName: "icon-token-tp_0 token-icon",
        tokenName: "Argentine Peso",
        tokenTicker: "ARSFLIP",
        supplyApy: "0.40",
        depositedAmount: "0.00",
        depositedTicker: "ARSFLIP",
        depositedAmountUsd: "0",
        walletBalance: "8,460,750.00",
    },
    {
        availableToWithdrawAmount: "8,500.00",
        availableToWithdrawAmountUsd: "6.80",
        id: "copflip",
        tokenIconClassName: "icon-token-tp_1 token-icon",
        tokenName: "Colombian Peso",
        tokenTicker: "COPFLIP",
        supplyApy: "0.40",
        depositedAmount: "0.00",
        depositedTicker: "COPFLIP",
        depositedAmountUsd: "0",
        walletBalance: "6,250,000.00",
    },
];
