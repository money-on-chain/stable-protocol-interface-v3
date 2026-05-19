import { TokenSettings } from "../../helpers/currencies";

export interface LendingBorrowingTokenMetadata {
    iconClassName: string;
    name: string;
    ticker: string;
    visibleDecimals: number;
}

export function getLendingBorrowingTokenMetadata(
    tokenCode: string
): LendingBorrowingTokenMetadata {
    const tokenSettings = TokenSettings(tokenCode);

    return {
        iconClassName: `icon-token-${tokenCode.toLowerCase()} token-icon`,
        name: tokenSettings.fullName || tokenSettings.name,
        ticker: tokenSettings.name.toUpperCase(),
        visibleDecimals: tokenSettings.visibleDecimals ?? 2,
    };
}
