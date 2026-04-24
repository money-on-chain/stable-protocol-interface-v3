import type { BorrowCardData } from "./Borrow/data";
import type { LendCardData } from "./Lend/data";

export type LendingBorrowingView =
    | { screen: "overview" }
    | { screen: "borrow-operation"; card: BorrowCardData }
    | { screen: "borrow-repay"; card: BorrowCardData }
    | { screen: "lend-earn"; token: LendCardData }
    | { screen: "lend-withdraw"; token: LendCardData };
