# CompactMetricDisplay

`CompactMetricDisplay` is a minimal, presentational component used to display a labeled metric in a compact format.

It is designed for tight UI spaces where a simple label → value relationship is needed, with an optional secondary label for the value.

---

## Import

```tsx
import CompactMetricDisplay from "@/components/LendingBorrowing/MiniComponents/CompactMetricDisplay";
```

---

## Basic usage

```tsx
<CompactMetricDisplay label="Borrow usage" value="42.50%" />
```

---

## With value label

```tsx
<CompactMetricDisplay
    label="Liquidation price"
    value="1.25"
    valueLabel="ARSFLIP/DOC"
/>
```

---

## JSX / custom content

```tsx
<CompactMetricDisplay
    label={<span>Borrow usage</span>}
    value={<strong>42.50%</strong>}
    valueLabel={<span className="muted">After</span>}
/>
```

---

## Props

```tsx
interface CompactMetricDisplayProps {
    label: React.ReactNode;
    value: React.ReactNode;
    valueLabel?: React.ReactNode;
}
```

---

## Prop reference

| Prop         | Type              | Required | Description           |
| ------------ | ----------------- | -------- | --------------------- |
| `label`      | `React.ReactNode` | yes      | Metric label          |
| `value`      | `React.ReactNode` | yes      | Main value            |
| `valueLabel` | `React.ReactNode` | no       | Secondary value label |

---

## Structure

```html
<div class="compact-metric-display">
    <div class="compact-metric-display__label"></div>
    <div class="compact-metric-display__amount">
        <div class="compact-metric-display__value"></div>
        <div class="compact-metric-display__value-label"></div>
    </div>
</div>
```

---

## CSS classes

```
.compact-metric-display
.compact-metric-display__label
.compact-metric-display__amount
.compact-metric-display__value
.compact-metric-display__value-label
```

---

## Notes

- Purely presentational
- No formatting or validation
- Accepts any ReactNode
