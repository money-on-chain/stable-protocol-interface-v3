import type { BorrowCardData } from "./Borrow/data";
import type { LendCardData } from "./Lend/data";

export type LendingBorrowingView =
    | { screen: "overview" }
    | { screen: "lend-earn"; token: LendCardData }
    | { screen: "lend-withdraw"; token: LendCardData }
    | { screen: "borrow-operation"; card: BorrowCardData };
