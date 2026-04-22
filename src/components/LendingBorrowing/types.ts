import type { LendCardData } from "./Lend/data";

export type LendingBorrowingView =
    | { screen: "overview" }
    | { screen: "lend-earn"; token: LendCardData };
