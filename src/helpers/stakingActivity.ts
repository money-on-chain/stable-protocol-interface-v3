// Turns the raw `omoc_operations` rows returned by the API's
// /omoc/staking_operations/ endpoint into one entry per user action.
//
// A single user action can emit two rows with the same tx hash:
//   stake    -> Supporters_AddStake
//   unstake  -> Supporters_WithdrawStake + DelayMachine_PaymentDeposit
//   restake  -> DelayMachine_PaymentCancel + Supporters_AddStake
//   withdraw -> DelayMachine_PaymentWithdraw
// (see OMoC-Decentralized-Oracle contracts Staking.sol / DelayMachine.sol).

export type StakingOperationName =
    | "Supporters_AddStake"
    | "Supporters_WithdrawStake"
    | "DelayMachine_PaymentDeposit"
    | "DelayMachine_PaymentCancel"
    | "DelayMachine_PaymentWithdraw";

export interface RawStakingOperation {
    _id?: string;
    hash?: string | null;
    blockNumber?: number | null;
    operation?: string | null;
    // DelayMachine payment id
    id?: number | null;
    // Supporters_*: internal supporters tokens - use `mocs` for the MoC value
    // DelayMachine_*: already MoC
    amount?: string | null;
    mocs?: string | null;
    // DelayMachine_PaymentDeposit: lock duration in seconds, not a timestamp
    expiration?: number | null;
    createdAt?: string | null;
}

export type StakingActivityType = "stake" | "unstake" | "restake" | "withdraw";

// Only meaningful for unstakes: what happened to the delayed payment.
export type StakingUnstakeState =
    | "pending"
    | "available"
    | "withdrawn"
    | "restaked";

export interface StakingActivity {
    id: string;
    type: StakingActivityType;
    // MoC amount in wei
    amount: bigint;
    timestamp: string;
    transactionHash: string;
    unlockTimestamp?: string;
    unstakeState?: StakingUnstakeState;
}

function toBigInt(value: string | null | undefined): bigint {
    if (!value) return 0n;
    try {
        return BigInt(value);
    } catch {
        return 0n;
    }
}

function rowKey(row: RawStakingOperation, suffix: string): string {
    return row._id ?? `${row.hash ?? ""}:${suffix}`;
}

// The API returns createdAt as an ISO string with a trailing "Z".
function unlockOf(row: RawStakingOperation): string | undefined {
    if (
        !row.createdAt ||
        row.expiration === null ||
        row.expiration === undefined
    ) {
        return undefined;
    }
    const created = new Date(row.createdAt).getTime();
    if (Number.isNaN(created)) return undefined;
    return new Date(created + row.expiration * 1000).toISOString();
}

export function buildStakingActivity(
    rows: RawStakingOperation[],
    now: Date = new Date()
): StakingActivity[] {
    // DelayMachine payment ids that were later withdrawn or restaked, so an
    // unstake row can say what became of it.
    const withdrawnIds = new Set<number>();
    const restakedIds = new Set<number>();
    for (const row of rows) {
        if (row.id === null || row.id === undefined) continue;
        if (row.operation === "DelayMachine_PaymentWithdraw")
            withdrawnIds.add(row.id);
        if (row.operation === "DelayMachine_PaymentCancel")
            restakedIds.add(row.id);
    }

    const byHash = new Map<string, RawStakingOperation[]>();
    for (const row of rows) {
        if (!row.hash || !row.operation) continue;
        const group = byHash.get(row.hash);
        if (group) group.push(row);
        else byHash.set(row.hash, [row]);
    }

    const result: StakingActivity[] = [];
    for (const [hash, group] of byHash) {
        const ofType = (name: StakingOperationName) =>
            group.filter((row) => row.operation === name);
        const cancels = ofType("DelayMachine_PaymentCancel");
        const deposits = ofType("DelayMachine_PaymentDeposit");
        const addStakes = ofType("Supporters_AddStake");
        const withdrawStakes = ofType("Supporters_WithdrawStake");
        const withdraws = ofType("DelayMachine_PaymentWithdraw");

        // restake: the AddStake in the same tx is its counterpart
        for (const row of cancels) {
            result.push({
                id: rowKey(row, "restake"),
                type: "restake",
                amount: toBigInt(row.amount),
                timestamp: String(row.createdAt ?? ""),
                transactionHash: hash,
            });
        }
        if (cancels.length === 0) {
            for (const row of addStakes) {
                result.push({
                    id: rowKey(row, "stake"),
                    type: "stake",
                    amount: toBigInt(row.mocs),
                    timestamp: String(row.createdAt ?? ""),
                    transactionHash: hash,
                });
            }
        }

        // unstake: prefer the DelayMachine deposit (MoC amount + unlock time),
        // the WithdrawStake in the same tx is its counterpart
        for (const row of deposits) {
            const unlockTimestamp = unlockOf(row);
            let unstakeState: StakingUnstakeState;
            if (
                row.id !== null &&
                row.id !== undefined &&
                withdrawnIds.has(row.id)
            ) {
                unstakeState = "withdrawn";
            } else if (
                row.id !== null &&
                row.id !== undefined &&
                restakedIds.has(row.id)
            ) {
                unstakeState = "restaked";
            } else if (unlockTimestamp && new Date(unlockTimestamp) > now) {
                unstakeState = "pending";
            } else {
                unstakeState = "available";
            }
            result.push({
                id: rowKey(row, "unstake"),
                type: "unstake",
                amount: toBigInt(row.amount),
                timestamp: String(row.createdAt ?? ""),
                transactionHash: hash,
                unlockTimestamp,
                unstakeState,
            });
        }
        if (deposits.length === 0) {
            // counterpart deposit fell outside the fetched window
            for (const row of withdrawStakes) {
                result.push({
                    id: rowKey(row, "unstake"),
                    type: "unstake",
                    amount: toBigInt(row.mocs),
                    timestamp: String(row.createdAt ?? ""),
                    transactionHash: hash,
                });
            }
        }

        for (const row of withdraws) {
            result.push({
                id: rowKey(row, "withdraw"),
                type: "withdraw",
                amount: toBigInt(row.amount),
                timestamp: String(row.createdAt ?? ""),
                transactionHash: hash,
            });
        }
    }

    result.sort(
        (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return result;
}
