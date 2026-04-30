# OperationNotice

`OperationNotice` is a simple presentational wrapper used to display contextual information related to an operation.

It provides a consistent layout with a title and a content area, typically used for summaries, warnings, or explanations within lending/borrowing flows.

---

## Import

```tsx
import OperationNotice from "@/components/LendingBorrowing/MiniComponents/OperationNotice";
```

---

## Basic usage

```tsx
<OperationNotice title="Summary">
    This operation will increase your borrow usage and reduce your distance to liquidation.
</OperationNotice>
```

---

## With JSX content

The `children` prop accepts any `ReactNode`, allowing full flexibility.

```tsx
<OperationNotice title="Important">
    <p>Your position will be updated after confirmation.</p>
    <strong>Make sure to review all values.</strong>
</OperationNotice>
```

---

## Props

```tsx
interface OperationNoticeProps {
    title: React.ReactNode;
    children: React.ReactNode;
}
```

---

## Prop reference

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `React.ReactNode` | yes | Title displayed at the top of the notice |
| `children` | `React.ReactNode` | yes | Content inside the notice |

---

## Structure

```html
<div class="operation-wrapper">
    <div class="operation-notice">
        <div class="operation-notice__title"></div>
        <div class="operation-notice__content"></div>
    </div>
</div>
```

---

## CSS classes

```
.operation-wrapper
.operation-notice
.operation-notice__title
.operation-notice__content
```

---

## Behavior

- Always renders both `title` and `children`
- Does not apply any formatting or validation
- Purely presentational
- Intended to be used as a container for contextual UI messaging

---

## Notes

- Keep content concise and focused
- Typically used for summaries, warnings, or important context before confirmation
- Can be composed with other components inside `children`
