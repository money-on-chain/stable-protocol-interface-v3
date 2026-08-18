# Overview

`Overview` is a container component that composes the main **Lending** and **Borrowing** entry points.

It acts as the top-level section for the Lending & Borrowing experience, delegating all user actions to parent handlers.

---

## Import

```tsx
import Overview from "@/components/LendingBorrowing/Overview";
```

---

## Purpose

- Renders both `Lend` and `Borrow` sections
- Wires user interactions to external handlers
- Keeps business logic outside the component

This component does **not** manage state or logic. It only composes and forwards callbacks.

---

## Basic usage

```tsx
<Overview
    onOpenBorrow={handleOpenBorrow}
    onOpenBorrowDepositCollateral={handleDepositCollateral}
    onOpenBorrowRepay={handleRepay}
    onOpenBorrowRepayWithCollateral={handleRepayWithCollateral}
    onOpenBorrowWithdrawCollateral={handleWithdrawCollateral}
    onOpenLendEarn={handleEarn}
    onOpenLendWithdraw={handleWithdraw}
/>
```

---

## Props

```tsx
interface OverviewProps {
    onOpenBorrow: (card: BorrowCardData) => void;
    onOpenBorrowDepositCollateral: (card: BorrowCardData) => void;
    onOpenBorrowRepay: (card: BorrowCardData) => void;
    onOpenBorrowRepayWithCollateral: (card: BorrowCardData) => void;
    onOpenBorrowWithdrawCollateral: (card: BorrowCardData) => void;
    onOpenLendEarn: (token: LendCardData) => void;
    onOpenLendWithdraw: (token: LendCardData) => void;
}
```

---

## Prop reference

| Prop                              | Type                             | Description                    |
| --------------------------------- | -------------------------------- | ------------------------------ |
| `onOpenBorrow`                    | `(card: BorrowCardData) => void` | Opens borrow flow              |
| `onOpenBorrowDepositCollateral`   | `(card: BorrowCardData) => void` | Opens deposit collateral flow  |
| `onOpenBorrowRepay`               | `(card: BorrowCardData) => void` | Opens repay flow               |
| `onOpenBorrowRepayWithCollateral` | `(card: BorrowCardData) => void` | Opens repay using collateral   |
| `onOpenBorrowWithdrawCollateral`  | `(card: BorrowCardData) => void` | Opens withdraw collateral flow |
| `onOpenLendEarn`                  | `(token: LendCardData) => void`  | Opens lend/earn flow           |
| `onOpenLendWithdraw`              | `(token: LendCardData) => void`  | Opens withdraw flow            |

---

## Rendering structure

```tsx
<>
    <Lend onEarn={onOpenLendEarn} onWithdraw={onOpenLendWithdraw} />

    <Borrow
        onOpenBorrow={onOpenBorrow}
        onOpenDepositCollateral={onOpenBorrowDepositCollateral}
        onOpenRepay={onOpenBorrowRepay}
        onOpenRepayWithCollateral={onOpenBorrowRepayWithCollateral}
        onOpenWithdrawCollateral={onOpenBorrowWithdrawCollateral}
    />
</>
```

---

## Behavior

- Renders `Lend` first, then `Borrow`
- Passes callbacks directly to child components
- Does not transform or validate data
- Fully controlled by parent

---

## Notes

- This is a composition layer, not a logic layer
- Ideal place to orchestrate flows at page level
- Any navigation, routing, or modal handling should live in the parent component
