# OperationBackLink

`OperationBackLink` is a small presentational component used to render a back navigation button within lending/borrowing flows.

It displays a left-arrow icon and a label, and triggers a callback when clicked.

---

## Import

```tsx
import OperationBackLink from "@/components/LendingBorrowing/MiniComponents/OperationBackLink";
```

---

## Basic usage

```tsx
<OperationBackLink onClick={handleBack} />
```

---

## With custom label

```tsx
<OperationBackLink
    label="Back to dashboard"
    onClick={handleBack}
/>
```

---

## Props

```tsx
interface OperationBackLinkProps {
    label?: string;
    onClick: () => void;
}
```

---

## Prop reference

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `label` | `string` | no | `"Back to Lending & Borrowing"` | Text displayed next to the icon |
| `onClick` | `() => void` | yes | - | Callback executed when the button is clicked |

---

## Behavior

- Renders a `<button>` element
- Calls `onClick` when pressed
- Uses `type="button"` to prevent form submission side effects
- Displays a navigation icon and a label

---

## Structure

```html
<button class="operation-back-link">
    <div class="icon__navigation-back operation-back-link__icon"></div>
    <div class="operation-back-link__label"></div>
</button>
```

---

## CSS classes

```
.operation-back-link
.operation-back-link__icon
.operation-back-link__label
```

---

## Notes

- Purely presentational
- Does not handle routing internally
- Parent component is responsible for navigation logic
