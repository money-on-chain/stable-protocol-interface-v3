# MetricCard

`MetricCard` is a compact presentational component used to display a primary metric with an optional secondary value in a local currency.

It is designed for summary views where a value, its unit/context, and an optional fiat/local equivalent need to be shown together.

---

## Import

```tsx
import MetricCard from "@/components/LendingBorrowing/MiniComponents/MetricCard";
```

---

## Basic usage

```tsx
<MetricCard label="Borrow usage" value="42.50" valueLabel="%" />
```

---

## With local currency value

```tsx
<MetricCard
    label="Debt"
    value="1,250.00"
    valueLabel="ARSFLIP"
    localCurrencyValue="1,250.00"
    localCurrencySymbol="USD"
/>
```

---

## With computed local currency

```tsx
<MetricCard
    label="Debt"
    value="1,250.00"
    valueLabel="ARSFLIP"
    getLocalCurrencyValue={() => "1,250.00"}
    localCurrencySymbol="USD"
/>
```

If both `localCurrencyValue` and `getLocalCurrencyValue` are provided, `localCurrencyValue` takes priority.

---

## Props

```tsx
interface MetricCardProps {
    label: string;
    value: string;
    valueLabel: string;
    localCurrencySymbol?: string;
    localCurrencyValue?: string;
    getLocalCurrencyValue?: () => string;
}
```

---

## Prop reference

| Prop                    | Type           | Required | Default | Description                              |
| ----------------------- | -------------- | -------- | ------- | ---------------------------------------- |
| `label`                 | `string`       | yes      | -       | Metric label                             |
| `value`                 | `string`       | yes      | -       | Main value                               |
| `valueLabel`            | `string`       | yes      | -       | Unit or context of the value             |
| `localCurrencySymbol`   | `string`       | no       | `"USD"` | Symbol for local currency                |
| `localCurrencyValue`    | `string`       | no       | -       | Direct local currency value              |
| `getLocalCurrencyValue` | `() => string` | no       | -       | Function to compute local currency value |

---

## Rendering behavior

- `label`, `value`, and `valueLabel` are always rendered.
- Local currency block is rendered only if:

```tsx
localCurrencyValue ?? getLocalCurrencyValue?.();
```

returns a truthy value.

- `localCurrencyValue` takes priority over `getLocalCurrencyValue`.

---

## Structure

```html
<div class="metric-card">
    <div class="metric-card__label"></div>
    <div class="metric-card__amount">
        <div class="metric-card__value"></div>
        <div class="metric-card__value-label"></div>
    </div>
    <div class="metric-card__local-currency">
        <div class="metric-card__local-amount"></div>
        <div class="metric-card__local-symbol"></div>
    </div>
</div>
```

---

## CSS classes

```
.metric-card
.metric-card__label
.metric-card__amount
.metric-card__value
.metric-card__value-label
.metric-card__local-currency
.metric-card__local-amount
.metric-card__local-symbol
```

---

## Notes

- Purely presentational
- No formatting or validation is applied
- Parent component is responsible for formatting numbers and currencies
- `getLocalCurrencyValue` is evaluated on render
