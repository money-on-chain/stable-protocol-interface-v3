import React from "react";

import type { BorrowCardData } from "./Borrow/data";
import type { LendCardData } from "./Lend/data";
import { BORROW_CARDS } from "./mocks/borrowCards";
import { LEND_CARDS } from "./mocks/lendCards";

interface LendingBorrowingData {
    borrowCards: BorrowCardData[];
    error: Error | null;
    isLoading: boolean;
    lendCards: LendCardData[];
    refetch: () => void;
}

function buildLendCardsFromProtocolState(): LendCardData[] {
    // TODO(api): Replace this mock source with API/contract data for lending markets.
    // Keep returning the LendCardData shape so the UI can stay mostly unchanged.
    return LEND_CARDS;
}

function buildBorrowCardsFromProtocolState(): BorrowCardData[] {
    // TODO(api): Replace this mock source with API/contract data for borrow markets.
    // Operation screens expect current values, wallet balances, limits, and metric previews
    // to be refreshed here whenever the backing block/query data changes.
    return BORROW_CARDS;
}

export function useLendingBorrowingData(): LendingBorrowingData {
    // TODO(api): This hook is the data integration boundary for Lending & Borrowing.
    // Wire wallet/account/block/query dependencies here so markets, balances,
    // limits, loading, errors, and refetch all update when live protocol data changes.
    const lendCards = React.useMemo(() => buildLendCardsFromProtocolState(), []);
    const borrowCards = React.useMemo(() => buildBorrowCardsFromProtocolState(), []);

    const refetch = React.useCallback(() => {
        // TODO(api): Wire this to the API/query/contract refetch once live data replaces mocks.
    }, []);

    return {
        borrowCards,
        error: null,
        isLoading: false,
        lendCards,
        refetch,
    };
}
