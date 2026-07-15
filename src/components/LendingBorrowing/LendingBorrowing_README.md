# LendingBorrowing

`LendingBorrowing` is the top-level container for the Lending & Borrowing section.

It controls which lending or borrowing view is currently displayed by reading and updating URL search parameters.

The component does not use internal React state for navigation. Instead, it relies on query parameters such as `view` and `token`.

---

## Import

```tsx
import LendingBorrowing from "@/components/LendingBorrowing";
```

---

## Purpose

`LendingBorrowing` acts as the main router-like component for the Lending & Borrowing experience.

It is responsible for:

- reading the current URL search parameters
- resolving the selected lend or borrow card
- deciding which screen should be rendered
- updating search parameters when the user opens a flow
- clearing search parameters when the user goes back

---

## URL parameters

The component reads two URL search parameters:

| Parameter | Description                                 |
| --------- | ------------------------------------------- |
| `view`    | Defines which flow should be displayed      |
| `token`   | Identifies the selected lend or borrow card |

Example URL:

```text
/lending-borrowing?view=borrow-operation&token=DOC
```

---

## Supported views

```tsx
"lend-earn";
"lend-withdraw";
"borrow-operation";
"borrow-deposit-collateral";
"borrow-repay";
"borrow-repay-with-collateral";
"borrow-withdraw-collateral";
```

If no valid view is found, the component renders `Overview`.

---

## Data sources

The component reads card data through `useLendingBorrowingData`:

```tsx
const { borrowCards, lendCards } = useLendingBorrowingData();
```

The selected cards are resolved from the `token` URL parameter:

```tsx
const selectedLendCard = lendCards.find((card) => card.id === tokenId) || null;

const selectedBorrowCard =
    borrowCards.find((card) => card.id === tokenId) || null;
```

`useLendingBorrowingData` is the expected integration point for live API,
contract, wallet, account, and block/query data. The hook still returns mocked
cards today, but the `TODO(api)` comments inside it describe what should be
replaced.

Operation preview calculations are centralized in `operationPreviewAdapter`.
Replace the mock-backed functions there with live simulations or computed
protocol metrics while keeping the exported function names stable.

Confirm actions are centralized in `useLendingBorrowingActions`. Replace the
placeholder callbacks there with allowance checks, contract writes, transaction
status handling, and post-confirmation refetches.

---

## View resolution

The component checks whether the current URL state matches a valid screen.

```tsx
const isLendEarnView = view === "lend-earn" && !!selectedLendCard;
const isLendWithdrawView = view === "lend-withdraw" && !!selectedLendCard;
const isBorrowOperationView =
    view === "borrow-operation" && !!selectedBorrowCard;
```

Some borrowing views are only valid when the selected card has the required position data.

---

## Borrow view validation

### Deposit collateral

```tsx
const isBorrowDepositCollateralView =
    view === "borrow-deposit-collateral" &&
    !!selectedBorrowCard &&
    parseMetricNumber(selectedBorrowCard.currentDebt.value) > 0;
```

This flow is only available when the selected borrow card has current debt.

---

### Repay

```tsx
const isBorrowRepayView =
    view === "borrow-repay" &&
    !!selectedBorrowCard &&
    parseMetricNumber(selectedBorrowCard.currentDebt.value) > 0;
```

This flow is only available when the selected borrow card has current debt.

---

### Repay with collateral

```tsx
const isBorrowRepayWithCollateralView =
    view === "borrow-repay-with-collateral" &&
    !!selectedBorrowCard &&
    parseMetricNumber(selectedBorrowCard.currentDebt.value) > 0 &&
    parseMetricNumber(selectedBorrowCard.depositedCollateral.value) > 0;
```

This flow is only available when the selected borrow card has both:

- current debt
- deposited collateral

---

### Withdraw collateral

```tsx
const isBorrowWithdrawCollateralView =
    view === "borrow-withdraw-collateral" &&
    !!selectedBorrowCard &&
    parseMetricNumber(selectedBorrowCard.depositedCollateral.value) > 0;
```

This flow is only available when the selected borrow card has deposited collateral.

---

## Search parameter updates

The component uses a local helper to update URL search parameters without losing existing parameters.

```tsx
const updateSearchParams = (updater: (params: URLSearchParams) => void) => {
    const nextParams = new URLSearchParams(searchParams);
    updater(nextParams);
    setSearchParams(nextParams);
};
```

Usage example:

```tsx
updateSearchParams((params) => {
    params.set("view", "borrow-operation");
    params.set("token", card.id);
});
```

---

## Opening flows from Overview

When the default `Overview` is rendered, callback props are passed down to open the available flows.

```tsx
<Overview
    borrowCards={borrowCards}
    lendCards={lendCards}
    onOpenBorrow={(card) =>
        updateSearchParams((params) => {
            params.set("view", "borrow-operation");
            params.set("token", card.id);
        })
    }
    onOpenBorrowRepay={(card) =>
        updateSearchParams((params) => {
            params.set("view", "borrow-repay");
            params.set("token", card.id);
        })
    }
    onOpenBorrowDepositCollateral={(card) =>
        updateSearchParams((params) => {
            params.set("view", "borrow-deposit-collateral");
            params.set("token", card.id);
        })
    }
    onOpenBorrowRepayWithCollateral={(card) =>
        updateSearchParams((params) => {
            params.set("view", "borrow-repay-with-collateral");
            params.set("token", card.id);
        })
    }
    onOpenBorrowWithdrawCollateral={(card) =>
        updateSearchParams((params) => {
            params.set("view", "borrow-withdraw-collateral");
            params.set("token", card.id);
        })
    }
    onOpenLendEarn={(token) =>
        updateSearchParams((params) => {
            params.set("view", "lend-earn");
            params.set("token", token.id);
        })
    }
    onOpenLendWithdraw={(token) =>
        updateSearchParams((params) => {
            params.set("view", "lend-withdraw");
            params.set("token", token.id);
        })
    }
/>
```

---

## Back behavior

Each detail flow receives an `onBack` callback.

The callback clears both `view` and `token` from the URL.

```tsx
onBack={() =>
    updateSearchParams((params) => {
        params.delete("view");
        params.delete("token");
    })
}
```

This returns the user to the default `Overview` screen.

---

## Rendering order

The component renders screens in this priority order:

1. `Overview`
2. `LendEarn`
3. `LendWithdraw`
4. `BorrowDepositCollateral`
5. `BorrowRepay`
6. `BorrowRepayWithCollateral`
7. `BorrowWithdrawCollateral`
8. `BorrowOperation`

The last branch renders `BorrowOperation` as a fallback when a borrow card exists but no more specific borrow flow matches.

---

## Rendered components

```tsx
Overview;
LendEarn;
LendWithdraw;
BorrowDepositCollateral;
BorrowOperation;
BorrowRepay;
BorrowRepayWithCollateral;
BorrowWithdrawCollateral;
```

---

## Props

`LendingBorrowing` does not receive props.

```tsx
const LendingBorrowing: React.FC = () => {
    // ...
};
```

---

## Structure

```html
<div class="section-container">
    <!-- active lending or borrowing view -->
</div>
```

---

## CSS classes

```scss
.section-container
```

The component also imports:

```tsx
import "./Styles.scss";
```

---

## Notes

- Navigation state is stored in URL search parameters.
- Invalid or incomplete URL states return to `Overview`.
- Borrowing sub-flows are guarded by card data checks.
- The current mock data enters through `useLendingBorrowingData`.
- Preview mocks enter through `operationPreviewAdapter`.
- Submit placeholders live in `useLendingBorrowingActions`.
- `parseMetricNumber` is used to validate numeric card values.
- Parent routing should render this component at the Lending & Borrowing page level.
