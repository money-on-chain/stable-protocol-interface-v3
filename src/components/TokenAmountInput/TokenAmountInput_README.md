# TokenAmountInput

`TokenAmountInput` is a reusable React component for entering token amounts, displaying fiat equivalents, showing balances, and optionally selecting a token.

It supports editable, read-only, display-only, validation feedback, quick actions, a MAX shortcut, token selector modal, and fiat conversion.

---

## Import

```tsx
import TokenAmountInput from "@/components/TokenAmountInput";
```

Adjust the import path depending on where the component is used.

---

## Basic usage

```tsx
<TokenAmountInput
    label="Amount"
    inputValue={amount}
    onValueChange={setAmount}
    tokenLabel="DOC"
    tokenIconClassName="icon-doc"
    balanceLabel="Balance"
    balanceValue="1,250.00 DOC"
/>
```

---

## How the input value works

The component is controlled through `inputValue`.

```tsx
const [amount, setAmount] = React.useState("");

<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
/>
```

When the user types, the value is sanitized before being passed to `onValueChange`.

The sanitizer:

- limits the value to 20 characters
- converts `.5` into `0.5`
- removes commas
- returns an empty string for invalid numeric values

Example:

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={(value) => {
        setAmount(value);
    }}
/>
```

---

## Static token display

Use `tokenLabel` and optionally `tokenIconClassName` to display a fixed token.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    tokenLabel="DOC"
    tokenIconClassName="icon-doc"
/>
```

If the token is not interactive, it is rendered as a static visual element.

---

## Custom token selector

Use `tokenSelectable`, `selectedTokenValue`, `tokenOptions`, and `onTokenSelect` to allow token selection.

```tsx
const [selectedToken, setSelectedToken] = React.useState("DOC");

<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    tokenSelectable
    selectedTokenValue={selectedToken}
    onTokenSelect={setSelectedToken}
    tokenOptions={[
        {
            label: "DOC",
            displayLabel: "Dollar on Chain",
            value: "DOC",
            iconClassName: "icon-doc",
        },
        {
            label: "BPRO",
            displayLabel: "BPRO",
            value: "BPRO",
            iconClassName: "icon-bpro",
        },
    ]}
/>
```

When the token button is clicked, the component opens an Ant Design `Modal` with the available options.

---

## Token options from project currencies

Instead of passing custom `tokenOptions`, the component can derive options from the project currency configuration by using `currencyOptions` and `action`.

```tsx
<TokenAmountInput
    action="exchange"
    currencyOptions={["CA_0", "TP_0"]}
    selectedTokenValue={selectedToken}
    onTokenSelect={setSelectedToken}
/>
```

Internally, the component uses:

```tsx
getCurrenciesDetail()
t(`${action}.tokens.${currency.value}.abbr`, { ns })
t(`${action}.tokens.${currency.value}.label`, { ns })
```

This means the `action` prop must match the translation namespace structure expected by the project.

---

## Token click without selector

If `onTokenClick` is provided and no selector is available, the token button can trigger a custom action.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    tokenLabel="DOC"
    tokenSelectable
    onTokenClick={() => {
        openCustomTokenPicker();
    }}
/>
```

---

## Fiat equivalent

The fiat value can be passed directly with `fiatValue`.

```tsx
<TokenAmountInput
    inputValue={amount}
    fiatValue="$ 100.00"
    fiatLabel="USD"
/>
```

It can also be calculated from the current numeric input value using `getFiatEquivalent`.

```tsx
<TokenAmountInput
    inputValue={amount}
    getFiatEquivalent={(value) => BigInt(value * 1000000000000000000)}
    fiatLabel="USD"
/>
```

If `getFiatEquivalent` returns a `bigint`, the component renders the value using `PrecisionNumbers`.

If it returns a React node, the component renders it directly.

By default, the fiat value is displayed with an approximate symbol:

```text
≈ 100.00 USD
```

To hide the approximate symbol:

```tsx
<TokenAmountInput showApproxSymbol={false} />
```

---

## Balance display

The balance row can be configured with `balanceLabel` and `balanceValue`.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    balanceLabel="Balance"
    balanceValue="1,250.00 DOC"
/>
```

Legacy aliases are also supported:

```tsx
<TokenAmountInput
    balanceText="Balance"
    balance="1,250.00 DOC"
/>
```

`balanceValue` takes priority over `balance`.

`balanceLabel` takes priority over `balanceText`.

---

## Feedback message

Use `feedbackMessage` and `feedbackState` to show contextual feedback below the input.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    feedbackMessage="Insufficient balance"
    feedbackState="negative"
/>
```

Available states:

```tsx
"default" | "negative" | "neutral" | "positive"
```

If `validateError` is `true`, the component applies the error style and uses `"negative"` as the feedback state unless `feedbackState` is explicitly provided.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    validateError
    feedbackMessage="Invalid amount"
/>
```

To preserve feedback spacing even when there is no message:

```tsx
<TokenAmountInput preserveSpaceWhenNoFeedback />
```

---

## Read-only mode

Use `readOnly` to prevent editing.

```tsx
<TokenAmountInput
    inputValue="100"
    tokenLabel="DOC"
    readOnly
/>
```

In read-only mode:

- the input cannot be edited
- pointer events are disabled on the input
- the input is removed from keyboard tab order
- the component gets the `tokenAmountInput--readonly` class

---

## Display-only mode

Use `displayOnly` when the component should behave as a non-editable display element.

```tsx
<TokenAmountInput
    inputValue="100"
    tokenLabel="DOC"
    displayOnly
/>
```

`displayOnly` also makes the component non-editable and adds the `tokenAmountInput--displayOnly` class.

---

## MAX shortcut

The MAX shortcut is shown by default.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    onMaxClick={() => {
        setAmount(maxAmount);
    }}
/>
```

To hide it:

```tsx
<TokenAmountInput showMaxShortcut={false} />
```

Legacy alias:

```tsx
<TokenAmountInput
    setAddTotalAvailable={() => {
        setAmount(maxAmount);
    }}
/>
```

`onMaxClick` takes priority over `setAddTotalAvailable`.

---

## Quick actions

Use `quickActions` to render percentage shortcuts.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    quickActions={[25, 50, 75]}
    onQuickActionClick={(percentage) => {
        setAmount(calculatePercentageAmount(percentage));
    }}
/>
```

The component renders them as inline buttons separated by dividers.

Example visual output:

```text
25% | 50% | 75% | MAX
```

---

## Validation state

Use `validateError` to apply error styling to the whole component.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    validateError
/>
```

This adds the `tokenAmountInput--error` class.

---

## Disabled state

Use `disabled` to prevent the token selector or token click action from being interactive.

```tsx
<TokenAmountInput
    inputValue={amount}
    onValueChange={setAmount}
    tokenSelectable
    disabled
/>
```

Important: `disabled` only affects token interaction. It does not make the amount input read-only. Use `readOnly` or `displayOnly` for that.

---

## Test IDs

The component supports both `testId` and `data-testid`.

```tsx
<TokenAmountInput
    testId="borrow-amount"
    inputValue={amount}
    onValueChange={setAmount}
/>
```

The root element receives:

```tsx
data-testid="borrow-amount"
```

The input receives:

```tsx
data-testid="borrow-amount-input"
```

`testId` takes priority over `data-testid`.

---

## Props

```tsx
interface TokenAmountInputProps {
    action?: string;
    balance?: React.ReactNode;
    balanceLabel?: string;
    balanceText?: string;
    balanceValue?: React.ReactNode;
    currencyOptions?: string[];
    disabled?: boolean;
    "data-testid"?: string;
    displayOnly?: boolean;
    feedbackMessage?: React.ReactNode;
    feedbackState?: "default" | "negative" | "neutral" | "positive";
    getFiatEquivalent?: (value: number) => bigint | React.ReactNode;
    fiatLabel?: string;
    fiatValue?: React.ReactNode;
    inputValue?: string;
    label?: string;
    onMaxClick?: () => void;
    onQuickActionClick?: (percentage: number) => void;
    onTokenClick?: () => void;
    onTokenSelect?: (value: string) => void;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    quickActions?: number[];
    readOnly?: boolean;
    preserveSpaceWhenNoFeedback?: boolean;
    selectedTokenValue?: string;
    showApproxSymbol?: boolean;
    showMaxShortcut?: boolean;
    setAddTotalAvailable?: () => void;
    testId?: string;
    title?: string;
    tokenIconClassName?: string;
    tokenLabel?: string;
    tokenOptions?: TokenAmountInputOption[];
    tokenSelectable?: boolean;
    validateError?: boolean;
    value?: string;
    onChange?: (value: string) => void;
}
```

---

## Token option shape

```tsx
interface TokenAmountInputOption {
    displayLabel?: string;
    icon?: React.ReactNode;
    iconClassName?: string;
    label: string;
    value: string;
}
```

### `label`

Short token label shown inside the input.

```tsx
label: "DOC"
```

### `displayLabel`

Optional longer label shown in the selector modal.

```tsx
displayLabel: "Dollar on Chain"
```

If `displayLabel` is not provided, the selector uses `label`.

### `icon`

Optional React node used as the token icon.

```tsx
icon: <DocIcon />
```

### `iconClassName`

Optional CSS class used when no React icon is passed.

```tsx
iconClassName: "icon-doc"
```

### `value`

Internal token value used for selection.

```tsx
value: "DOC"
```

---

## Prop reference

| Prop | Type | Default | Description |
|---|---|---:|---|
| `action` | `string` | `undefined` | Used with `currencyOptions` to resolve token labels from translations. |
| `balance` | `React.ReactNode` | `undefined` | Legacy balance value. Used if `balanceValue` is not provided. |
| `balanceLabel` | `string` | `undefined` | Label shown before the balance value. |
| `balanceText` | `string` | `undefined` | Legacy balance label. Used if `balanceLabel` is not provided. |
| `balanceValue` | `React.ReactNode` | `undefined` | Balance value shown on the bottom right. |
| `currencyOptions` | `string[]` | `[]` | Token values resolved from project currency settings. |
| `disabled` | `boolean` | `false` | Disables token interaction. Does not disable the amount input. |
| `data-testid` | `string` | `undefined` | Test ID for the root element. |
| `displayOnly` | `boolean` | `false` | Makes the input non-editable and applies display-only styles. |
| `feedbackMessage` | `React.ReactNode` | `undefined` | Message shown below the input. |
| `feedbackState` | `"default" \| "negative" \| "neutral" \| "positive"` | `"default"` | Visual state for the feedback message. |
| `getFiatEquivalent` | `(value: number) => bigint \| React.ReactNode` | `undefined` | Calculates fiat equivalent from the numeric input value. |
| `fiatLabel` | `string` | `"USD"` | Label shown after the fiat value. |
| `fiatValue` | `React.ReactNode` | `undefined` | Direct fiat value. Used when `getFiatEquivalent` is not provided. |
| `inputValue` | `string` | `""` | Controlled amount input value. |
| `label` | `string` | `action` | Top-left label. Falls back to `action`. |
| `onMaxClick` | `() => void` | `undefined` | Handler for the MAX shortcut. |
| `onQuickActionClick` | `(percentage: number) => void` | `undefined` | Handler for quick action percentage buttons. |
| `onTokenClick` | `() => void` | `undefined` | Custom token button handler when no selector is available. |
| `onTokenSelect` | `(value: string) => void` | `undefined` | Handler called when a token is selected. |
| `onValueChange` | `(value: string) => void` | `undefined` | Handler called with the sanitized input value. |
| `placeholder` | `string` | `"0.00"` | Input placeholder. |
| `quickActions` | `number[]` | `[]` | Percentage shortcut buttons. |
| `readOnly` | `boolean` | `false` | Makes the input non-editable. |
| `preserveSpaceWhenNoFeedback` | `boolean` | `false` | Keeps feedback spacing even when there is no message. |
| `selectedTokenValue` | `string` | `undefined` | Currently selected token value. |
| `showApproxSymbol` | `boolean` | `true` | Shows `≈` before the fiat value. |
| `showMaxShortcut` | `boolean` | `true` | Shows or hides the MAX shortcut. |
| `setAddTotalAvailable` | `() => void` | `undefined` | Legacy alias for `onMaxClick`. |
| `testId` | `string` | `undefined` | Preferred test ID. Takes priority over `data-testid`. |
| `title` | `string` | `"Select a token"` | Token selector modal title. |
| `tokenIconClassName` | `string` | `undefined` | CSS class for the static token icon. |
| `tokenLabel` | `string` | `undefined` | Static token label. |
| `tokenOptions` | `TokenAmountInputOption[]` | `[]` | Custom token selector options. |
| `tokenSelectable` | `boolean` | `false` | Enables token selector behavior. |
| `validateError` | `boolean` | `false` | Applies error styling. |
| `value` | `string` | `undefined` | Legacy selected token value fallback. |
| `onChange` | `(value: string) => void` | `undefined` | Legacy token selection handler fallback. |

---

## Internal priority rules

### Token options

```tsx
const resolvedTokenOptions = tokenOptions.length
    ? tokenOptions
    : tokenOptionsFromCurrencies;
```

Custom `tokenOptions` take priority over options derived from `currencyOptions`.

### Selected token value

```tsx
const resolvedSelectedTokenValue = selectedTokenValue || value;
```

`selectedTokenValue` takes priority over `value`.

### Token select handler

```tsx
const resolvedOnTokenSelect = onTokenSelect || onChange;
```

`onTokenSelect` takes priority over `onChange`.

### Balance

```tsx
const resolvedBalanceLabel = balanceLabel || balanceText;
const resolvedBalanceValue = balanceValue !== undefined ? balanceValue : balance;
```

`balanceLabel` takes priority over `balanceText`.

`balanceValue` takes priority over `balance`.

### MAX action

```tsx
const resolvedOnMaxClick = onMaxClick || setAddTotalAvailable;
```

`onMaxClick` takes priority over `setAddTotalAvailable`.

---

## CSS classes

The root element always uses:

```scss
.tokenAmountInput
```

Conditional root classes:

```scss
.tokenAmountInput--displayOnly
.tokenAmountInput--error
.tokenAmountInput--readonly
.tokenAmountInput--token-selectable
```

Main internal classes:

```scss
.tokenAmountInput__field
.tokenAmountInput__topRow
.tokenAmountInput__label
.tokenAmountInput__actions
.tokenAmountInput__quick-actions
.tokenAmountInput__quick-action
.tokenAmountInput__divider
.tokenAmountInput__divider--max
.tokenAmountInput__maxButton
.tokenAmountInput__content
.tokenAmountInput__amountBlock
.tokenAmountInput__value
.tokenAmountInput__tokenButton
.tokenAmountInput__tokenButton--static
.tokenAmountInput__token-selectSlot
.tokenAmountInput__token-selectSlot--hidden
.tokenAmountInput__token-selectIcon
.tokenAmountInput__token-icon
.tokenAmountInput__token-label
.tokenAmountInput__bottomRow
.tokenAmountInput__fiatValue
.tokenAmountInput__balance
.tokenAmountInput__feedback
.tokenAmountInput__feedback--default
.tokenAmountInput__feedback--negative
.tokenAmountInput__feedback--neutral
.tokenAmountInput__feedback--positive
.tokenAmountInput__feedback--placeholder
.tokenAmountInput__selectorModal
.tokenAmountInput__optionList
.tokenAmountInput__option
.tokenAmountInput__option--selected
.tokenAmountInput__optionIcon
.tokenAmountInput__optionLabel
```

---

## Notes and caveats

### `disabled` does not disable the input

The `disabled` prop only disables token interaction.

Use this if the amount should not be editable:

```tsx
<TokenAmountInput readOnly />
```

or:

```tsx
<TokenAmountInput displayOnly />
```

### `inputValue` is displayed as received

The sanitized value is passed to `onValueChange`, but the input renders the `inputValue` prop directly.

The parent component is responsible for storing and passing back the sanitized value.

### Wheel changes are blocked

The component prevents mouse wheel changes on the input to avoid accidental amount changes.

### The input uses `inputMode="decimal"`

This improves mobile keyboard behavior for decimal numeric entry.

---

## Complete example

```tsx
import React from "react";

import TokenAmountInput, {
    TokenAmountInputOption,
} from "@/components/TokenAmountInput";

const tokenOptions: TokenAmountInputOption[] = [
    {
        label: "DOC",
        displayLabel: "Dollar on Chain",
        value: "DOC",
        iconClassName: "icon-doc",
    },
    {
        label: "BPRO",
        displayLabel: "BPRO",
        value: "BPRO",
        iconClassName: "icon-bpro",
    },
];

export function BorrowAmountInput(): React.ReactElement {
    const [amount, setAmount] = React.useState("");
    const [selectedToken, setSelectedToken] = React.useState("DOC");

    const handleMaxClick = (): void => {
        setAmount("1000");
    };

    const handleQuickActionClick = (percentage: number): void => {
        const maxAmount = 1000;
        const nextAmount = (maxAmount * percentage) / 100;

        setAmount(String(nextAmount));
    };

    return (
        <TokenAmountInput
            label="Amount to borrow"
            inputValue={amount}
            onValueChange={setAmount}
            placeholder="0.00"
            tokenSelectable
            selectedTokenValue={selectedToken}
            onTokenSelect={setSelectedToken}
            tokenOptions={tokenOptions}
            balanceLabel="Available"
            balanceValue="1,000.00 DOC"
            fiatValue="$ 1,000.00"
            fiatLabel="USD"
            quickActions={[25, 50, 75]}
            onQuickActionClick={handleQuickActionClick}
            onMaxClick={handleMaxClick}
            feedbackMessage={
                Number(amount) > 1000 ? "Amount exceeds available balance" : null
            }
            feedbackState={Number(amount) > 1000 ? "negative" : "default"}
            validateError={Number(amount) > 1000}
            testId="borrow-amount"
        />
    );
}
```
