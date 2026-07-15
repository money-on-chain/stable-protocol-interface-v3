# Lending & Borrowing Handover

This document explains what remains to connect the Lending & Borrowing section
to live APIs and contracts.

The UI is already structured so the next developer should not need to rewrite
the operation screens. The expected work is to replace the current mock-backed
integration points while keeping the existing data shapes and exported function
names stable.

---

## Main Integration Points

### 1. Live Data

File:

```text
src/components/LendingBorrowing/useLendingBorrowingData.ts
```

What to replace:

- lending market mock data
- borrowing market mock data
- wallet/account balances
- position values
- limits
- loading state
- error state
- refetch behavior

Current placeholders are marked with `TODO(api)`.

Expected result:

- `lendCards` returns live `LendCardData[]`
- `borrowCards` returns live `BorrowCardData[]`
- values update when wallet, account, block, query, API, or contract data changes
- `isLoading`, `error`, and `refetch` reflect the real data source

Keep the return shape stable unless there is a strong reason to update all
screens that consume it.

---

### 2. Operation Previews

File:

```text
src/components/LendingBorrowing/operationPreviewAdapter.ts
```

What to replace:

- mock borrow ratios
- mock repay ratios
- mock collateral ratios
- mock risk delta calculations

Current placeholders are marked with `TODO(api)`.

Expected result:

- operation screens receive preview values from live simulations, contract reads,
  or freshly computed protocol metrics
- previews can update when the underlying block/query data changes
- exported function names remain stable where possible:
  - `getBorrowRatio`
  - `getBorrowOperationRiskDelta`
  - `getDepositCollateralRatio`
  - `getRepayRatio`
  - `getRepayWithCollateralRatio`
  - `getWithdrawCollateralRatio`

If previews need to become async, introduce that change at this adapter boundary
and then update the operation screens once, instead of spreading API calls across
the UI.

---

### 3. Confirm Actions

File:

```text
src/components/LendingBorrowing/useLendingBorrowingActions.ts
```

What to replace:

- empty confirm callbacks
- transaction submission
- allowance checks
- contract writes
- status handling
- success/error handling
- post-confirmation refetch

Current placeholders are marked with `TODO(api)`.

Expected result:

- each confirm button triggers its matching real flow
- operation screens keep UI validation and input state
- this hook owns the side effects
- data refresh happens after successful transactions

Callbacks currently prepared:

- `confirmLendEarn`
- `confirmLendWithdraw`
- `confirmBorrowOperation`
- `confirmBorrowRepay`
- `confirmBorrowRepayWithCollateral`
- `confirmBorrowDepositCollateral`
- `confirmBorrowWithdrawCollateral`

---

## What Should Not Need Rewriting

These screens should mostly remain presentational:

- `LendEarn`
- `LendWithdraw`
- `BorrowOperation`
- `BorrowRepay`
- `BorrowRepayWithCollateral`
- `BorrowDepositCollateral`
- `BorrowWithdrawCollateral`

They already receive confirm callbacks and use the preview adapter. Avoid adding
API calls directly inside these screens unless the data contract changes enough
to justify it.

---

## Current Mock Entry Points

Mock card data should enter only through:

```text
src/components/LendingBorrowing/useLendingBorrowingData.ts
```

Mock preview formulas should enter only through:

```text
src/components/LendingBorrowing/operationPreviewAdapter.ts
```

The mock files can remain as local development fixtures, but production data
should not be imported directly by operation screens.

---

## Checklist For The Next Developer

1. Replace `buildLendCardsFromProtocolState` with live lending market data.
2. Replace `buildBorrowCardsFromProtocolState` with live borrowing market data.
3. Wire `useLendingBorrowingData` to wallet/account/block/query dependencies.
4. Implement loading, error, and refetch behavior in `useLendingBorrowingData`.
5. Replace preview adapter mock functions with live simulations or protocol
   calculations.
6. Implement all callbacks in `useLendingBorrowingActions`.
7. Trigger data refetch after successful transactions.
8. Verify every operation screen with changing live values, not only first-load
   mock values.

---

## Important Behavior To Preserve

- URL state controls the active flow through `view` and `token`.
- `Overview` receives `borrowCards` and `lendCards` from the parent container.
- Borrowing sub-flows are guarded by position data before rendering.
- Input validation remains inside the operation screens.
- Side effects belong in `useLendingBorrowingActions`.
- Live data should be able to refresh when conditions change block by block.

