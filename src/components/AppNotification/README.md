# AppNotification

`AppNotification` is a semantic, theme-aware notification component designed for consistent messaging across the dApp. It replaces the need for external alert components such as Ant Design’s `Alert`, providing full control over styling, behavior, and integration with the application’s design system.

This documentation is a **work in progress** and will be expanded as the component reaches its final implementation.

---

## ✨ Overview

The component supports:

- Notification types (`neutral`, `info`, `success`, `warning`, `error`, `brand`)
- Optional icons
- Optional title
- Rich HTML or JSX content
- Customizable action buttons or links
- Dismiss button
- Auto-close with configurable timeout
- Compact mode for dense layouts

It will also integrate with (future) global notification providers.

---

## 📦 Basic Usage (Draft)

```tsx
import { AppNotification } from "./AppNotification";

<AppNotification
    type="success"
    title="Transaction confirmed"
    content="Your tokens were successfully sent."
/>;
```

---

## 🎨 Notification Types

```ts
export type AppNotificationType =
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "error"
    | "brand";
```

### Type descriptions

- **neutral** – Non-critical, low-importance contextual information.
- **info** – Informational messages requiring attention but not urgent.
- **success** – Indicates a successful action or confirmed transaction.
- **warning** – Highlights potential issues that may require caution.
- **error** – Represents failed operations or blocking issues.
- **brand** – Used for protocol/product announcements or branded messages.

---

## 🧩 Props (Draft)

| Prop          | Type                      | Description                                    |
| ------------- | ------------------------- | ---------------------------------------------- |
| `type`        | `AppNotificationType`     | Semantic and visual style of the notification. |
| `icon`        | `ReactNode`               | Icon displayed on the left.                    |
| `title`       | `ReactNode`               | Optional title.                                |
| `content`     | `ReactNode`               | Main message content.                          |
| `actions`     | `AppNotificationAction[]` | Buttons/links shown under the content.         |
| `dismissible` | `boolean`                 | Shows a close button if enabled.               |
| `autoClose`   | `number`                  | Auto-dismiss after N milliseconds.             |
| `compact`     | `boolean`                 | Reduces padding and font sizes.                |
| `style`       | `CSSProperties`           | Inline style overrides.                        |
| `className`   | `string`                  | Custom class names.                            |

---

## 🧭 Examples (Draft)

### With actions

```tsx
<AppNotification
    type="warning"
    title="High slippage detected"
    content="Proceed with caution."
    actions={[
        { key: "review", label: "Review settings", onClick: handleReview },
        { key: "docs", label: "Learn more", href: "/docs/slippage" },
    ]}
/>
```

### Auto-closing

```tsx
<AppNotification type="info" content="Settings updated" autoClose={5000} />
```

---

## 🧱 Styling Notes

The component relies on theme variables such as:

- `--notification-[type]-background`
- `--notification-[type]-text`
- `--notification-[type]-filter`

A full design pass will be added when the visual implementation is finalized.

---

## 🚧 Pending Work

- Confirm final layout and spacing
- Add icons per type
- Implement global provider (queue + stacking behavior)
- Accessibility notes (keyboard handling, ARIA roles)
- Unit tests and interaction edge cases

---

## 📜 Internal Use

This component is part of the mimLABS interface system and is not intended for standalone distribution.
