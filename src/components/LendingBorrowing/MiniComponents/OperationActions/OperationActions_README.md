# OperationActions

`OperationActions` is a minimal layout wrapper component used to group and align action elements (typically buttons) within lending/borrowing flows.

It provides a consistent container for primary and secondary actions without adding logic or behavior.

---

## Import

```tsx
import OperationActions from "@/components/LendingBorrowing/MiniComponents/OperationActions";
```

---

## Basic usage

```tsx
<OperationActions>
    <Button type="primary">Confirm</Button>
    <Button>Cancel</Button>
</OperationActions>
```

---

## With custom content

The component accepts any `ReactNode`, allowing full flexibility.

```tsx
<OperationActions>
    <div style={{ display: "flex", gap: 12 }}>
        <Button type="primary">Open Position</Button>
        <Button>Back</Button>
    </div>
</OperationActions>
```

---

## Props

```tsx
interface OperationActionsProps {
    children: React.ReactNode;
}
```

---

## Prop reference

| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | yes | Action elements to render inside the container |

---

## Structure

```html
<div class="operation-actions">
    <!-- children -->
</div>
```

---

## CSS classes

```
.operation-actions
```

---

## Behavior

- Renders children as-is
- No transformation or validation
- No internal layout logic beyond CSS
- Purely presentational

---

## Notes

- Intended to group CTAs consistently across flows
- Layout (spacing, alignment) should be handled via CSS
- Typically used at the bottom of forms or operation panels
