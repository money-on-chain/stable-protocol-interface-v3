import type { LendCardData } from "../Lend/data";
import { getLendingBorrowingTokenMetadata } from "../tokenMetadata";

type RawLendCardData = Omit<
    LendCardData,
    "depositedTicker" | "tokenIconClassName" | "tokenName" | "tokenTicker"
>;

const RAW_LEND_CARDS: RawLendCardData[] = [
    {
        availableToWithdrawAmount: "15,000.00",
        availableToWithdrawAmountUsd: "10.00",
        caIndex: 1,
        id: "arsflip",
        tokenCode: "TP_0",
        supplyApy: "0.40",
        depositedAmount: "0.00",
        depositedAmountUsd: "0",
        walletBalance: "8,460,750.00",
    },
    {
        availableToWithdrawAmount: "8,500.00",
        availableToWithdrawAmountUsd: "6.80",
        caIndex: 1,
        id: "copflip",
        tokenCode: "TP_1",
        supplyApy: "0.40",
        depositedAmount: "0.00",
        depositedAmountUsd: "0",
        walletBalance: "6,250,000.00",
    },
];

export const LEND_CARDS: LendCardData[] = RAW_LEND_CARDS.map((card) => {
    const tokenMetadata = getLendingBorrowingTokenMetadata(card.tokenCode);

    return {
        ...card,
        depositedTicker: tokenMetadata.ticker,
        tokenIconClassName: tokenMetadata.iconClassName,
        tokenName: tokenMetadata.name,
        tokenTicker: tokenMetadata.ticker,
    };
});
