# BeforeAfterCard

`BeforeAfterCard` is a small presentational component used to display a metric in two possible modes:

1. **Before / After mode**, when both `before` and `after` values are provided.
2. **After-only mode**, when only the `after` value is provided.

It is useful for operation previews where the UI needs to show the current value and the projected value after the user confirms an action.

---

## Import

```tsx
import BeforeAfterCard from "@/components/LendingBorrowing/MiniComponents/BeforeAfterCard";
```

Adjust the import path depending on where the component is used.

---

## Basic usage

```tsx
<BeforeAfterCard
    title="Borrow usage"
    before={{
        label: "Current",
        value: "42.50",
        unit: "%",
    }}
    after={{
        label: "After",
        value: "58.20",
        unit: "%",
    }}
    trend="negative"
/>
```

---

## After-only usage

If `before` is not provided, the component renders only the `after` section.

```tsx
<BeforeAfterCard
    title="Borrow available"
    after={{
        label: "Available",
        value: "1,250.00",
        unit: "ARSFLIP",
    }}
/>
```

In this mode, the trend indicator is not rendered, even if `trend` is passed.

---

## Invalid values

Each entry can be marked as invalid with `isInvalid`.

```tsx
<BeforeAfterCard
    title="Liquidation price"
    before={{
        label: "Current",
        value: "1.23",
        unit: "DOC",
    }}
    after={{
        label: "After",
        isInvalid: true,
        unit: "DOC",
    }}
    trend="negative"
/>
```

When `isInvalid` is `true`, the component displays:

```text
- -
```

The `unit` is not rendered for invalid values.

---

## Empty values

If `value` is missing, empty, or only contains whitespace, the component displays:

```text
- -
```

Example:

```tsx
<BeforeAfterCard
    title="Debt"
    after={{
        label: "After",
        value: "",
        unit: "ARSFLIP",
    }}
/>
```

This renders the value as `- -`.

---

## Trend indicator

The `trend` prop controls the visual trend indicator shown next to the `after` value.

```tsx
<BeforeAfterCard
    title="Risk"
    before={{
        label: "Current",
        value: "Low",
    }}
    after={{
        label: "After",
        value: "Medium",
    }}
    trend="negative"
/>
```

Available trend values:

```tsx
"positive" | "negative" | "neutral"
```

Important: the trend indicator is only rendered when `before` exists.

If the card is in after-only mode, `trend` is ignored.

---

## Border style

Use `useBorder` to apply the bordered card modifier.

```tsx
<BeforeAfterCard
    title="Deposited collateral"
    before={{
        label: "Current",
        value: "500.00",
        unit: "DOC",
    }}
    after={{
        label: "After",
        value: "750.00",
        unit: "DOC",
    }}
    trend="positive"
    useBorder
/>
```

This adds the following class to the root element:

```scss
.before-after-card--bordered
```

---

## Custom notch size

The component supports custom notch dimensions through CSS variables.

```tsx
<BeforeAfterCard
    title="Borrow usage"
    before={{
        label: "Current",
        value: "42.50",
        unit: "%",
    }}
    after={{
        label: "After",
        value: "58.20",
        unit: "%",
    }}
    trend="negative"
    notchHeight={16}
    notchWidth={24}
/>
```

This sets the following CSS custom properties inline:

```scss
--before-after-card-notch-height: 16px;
--before-after-card-notch-width: 24px;
```

If neither `notchHeight` nor `notchWidth` is provided, no inline style is applied.

---

## Props

```tsx
type BeforeAfterTrend = "positive" | "negative" | "neutral";

interface BeforeAfterCardEntry {
    isInvalid?: boolean;
    label: string;
    unit?: string;
    value?: string;
}

interface BeforeAfterCardProps {
    after: BeforeAfterCardEntry;
    before?: BeforeAfterCardEntry;
    notchHeight?: number;
    notchWidth?: number;
    trend?: BeforeAfterTrend;
    title: string;
    useBorder?: boolean;
}
```

---

## Entry props

Each card entry uses this shape:

```tsx
interface BeforeAfterCardEntry {
    isInvalid?: boolean;
    label: string;
    unit?: string;
    value?: string;
}
```

### `label`

Text shown above the value.

```tsx
label: "Current"
```

or:

```tsx
label: "After"
```

### `value`

Main value shown in the card.

```tsx
value: "42.50"
```

If the value is missing, empty, or only whitespace, the component displays `- -`.

### `unit`

Optional unit shown next to the value.

```tsx
unit: "%"
```

or:

```tsx
unit: "DOC"
```

The unit is not rendered when `isInvalid` is `true`.

### `isInvalid`

Forces the entry to render as an invalid or unavailable value.

```tsx
isInvalid: true
```

When enabled, the value becomes:

```text
- -
```

---

## Prop reference

| Prop | Type | Default | Description |
|---|---|---:|---|
| `after` | `BeforeAfterCardEntry` | required | Value shown as the final or projected state. |
| `before` | `BeforeAfterCardEntry` | `undefined` | Optional value shown as the previous or current state. |
| `notchHeight` | `number` | `undefined` | Sets `--before-after-card-notch-height` in pixels. |
| `notchWidth` | `number` | `undefined` | Sets `--before-after-card-notch-width` in pixels. |
| `trend` | `"positive" \| "negative" \| "neutral"` | `undefined` | Visual trend indicator for the `after` value. Only used when `before` exists. |
| `title` | `string` | required | Card title. |
| `useBorder` | `boolean` | `false` | Adds bordered card styling. |

---

## Internal behavior

### Value rendering

Values are normalized by `renderEntryValue`.

```tsx
function renderEntryValue(
    entry: BeforeAfterCardEntry
): { unit?: string; value: string } {
    if (entry.isInvalid) {
        return { value: "- -" };
    }

    return {
        unit: entry.unit,
        value: entry.value?.trim() ? entry.value : "- -",
    };
}
```

Rules:

1. If `isInvalid` is `true`, the value is `- -`.
2. If `value` is empty or missing, the value is `- -`.
3. Otherwise, the component renders the provided `value`.
4. The `unit` is only returned when the entry is not invalid.

---

## CSS classes

The root element always uses:

```scss
.before-after-card
```

Conditional root class:

```scss
.before-after-card--bordered
```

Main internal classes:

```scss
.before-after-card__title
.before-after-card__section
.before-after-card__section--before
.before-after-card__section--after
.before-after-card__section--after-only
.before-after-card__label
.before-after-card__value-row
.before-after-card__value-row--with-trend
.before-after-card__value-group
.before-after-card__value
.before-after-card__unit
.before-after-card__trend
.before-after-card__trend--positive
.before-after-card__trend--negative
.before-after-card__trend--neutral
```

---

## Complete example

```tsx
import React from "react";

import BeforeAfterCard from "@/components/LendingBorrowing/MiniComponents/BeforeAfterCard";

export function BorrowUsagePreview(): React.ReactElement {
    return (
        <BeforeAfterCard
            title="Borrow usage"
            before={{
                label: "Current",
                value: "42.50",
                unit: "%",
            }}
            after={{
                label: "After",
                value: "58.20",
                unit: "%",
            }}
            trend="negative"
            useBorder
            notchHeight={14}
            notchWidth={20}
        />
    );
}
```

---

## Suggested use cases

```tsx
<BeforeAfterCard
    title="Liquidation price"
    before={{
        label: "Current",
        value: "1.20",
        unit: "ARSFLIP/DOC",
    }}
    after={{
        label: "After",
        value: "1.35",
        unit: "ARSFLIP/DOC",
    }}
    trend="negative"
/>
```

```tsx
<BeforeAfterCard
    title="Deposited collateral"
    before={{
        label: "Current",
        value: "500.00",
        unit: "DOC",
    }}
    after={{
        label: "After",
        value: "750.00",
        unit: "DOC",
    }}
    trend="positive"
/>
```

```tsx
<BeforeAfterCard
    title="Minimum required collateral"
    after={{
        label: "Required",
        value: "300.00",
        unit: "DOC",
    }}
/>
```
