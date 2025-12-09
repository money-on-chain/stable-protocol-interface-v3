import type { CSSProperties, ReactNode } from "react";

import type {
    AppNotificationProps,
    AppNotificationVisibilityChangeReason,
} from "./AppNotification";

/**
 * Single notification entry managed by the NotificationCenter.
 * It reuses AppNotificationProps but adds a required `id` and
 * an optional per-item dismiss handler.
 */
export interface NotificationCenterItem
    extends Omit<
        AppNotificationProps,
        "onDismiss" | "visible" | "defaultVisible" | "onVisibleChange"
    > {
    /** Unique identifier for the notification inside the center */
    id: string;

    /**
     * Optional per-item dismiss handler.
     * This is called before the center-level onNotificationDismiss.
     */
    itemOnDismiss?: AppNotificationProps["onDismiss"];
}

/**
 * Props for the NotificationCenter component.
 * In esta etapa básica no hay grouping ni pinned, solo lista plana.
 */
export interface NotificationCenterProps {
    /** List of notifications to display */
    notifications: NotificationCenterItem[];

    /**
     * Called when a notification is dismissed (manual or auto).
     * Normalmente el provider/parent usa esto para remover el item del array.
     */
    onNotificationDismiss?: (
        id: string,
        reason: AppNotificationVisibilityChangeReason
    ) => void;

    /** Optional className for the outer container */
    className?: string;

    /** Optional inline styles for the container */
    style?: CSSProperties;

    /**
     * Optional custom renderer in case you want to wrap each notification
     * with animations or extra markup in the future.
     */
    renderItem?: (item: NotificationCenterItem) => ReactNode;
}
