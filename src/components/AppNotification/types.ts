export type AppNotificationType =
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "error";

export type AppNotificationActionVisualType = "primary" | "secondary" | "link";

export interface AppNotificationAction {
    key: string;
    label: string;
    visualType?: AppNotificationActionVisualType;
    onClick?: () => void;
    disabled?: boolean;
}

export interface AppNotificationProps {
    /** Visual type (maps to CSS modifiers) */
    type?: AppNotificationType;

    /** Optional icon (e.g. font-awesome / icon-font class) */
    iconClassName?: string;

    /** Title of the notification (can be plain text or JSX) */
    title?: React.ReactNode;

    /** Main HTML/message content */
    content?: React.ReactNode;

    /** Extra content below the main message (e.g. details) */
    extraContent?: React.ReactNode;

    /** Show close button */
    dismissible?: boolean;

    /** Called when user dismisses the notification */
    onDismiss?: () => void;

    /** List of actions (buttons / links) */
    actions?: AppNotificationAction[];

    /** Auto-close delay in milliseconds */
    autoCloseAfterMs?: number;

    /** Denser layout */
    compact?: boolean;

    /** Extra classNames for wrapper */
    className?: string;
}
export interface AppNotificationProps {
    // ...lo que ya tenés

    /** Optional expandable details block */
    details?: React.ReactNode;
    /** Initial state of the details section */
    detailsInitiallyOpen?: boolean;
    /** Custom labels for toggle button */
    detailsToggleLabels?: {
        show: string;
        hide: string;
    };
}
