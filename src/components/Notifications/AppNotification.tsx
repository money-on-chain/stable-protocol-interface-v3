import React, { useEffect, useRef } from "react";

import {
    BaseAppNotification,
    type BaseAppNotificationProps,
} from "./BaseAppNotification";
import { useOptionalNotifications } from "./NotificationProvider";
import type { CreateNotificationOptions } from "./types";

export type NotificationDeliveryMode = "inline" | "center";

export interface AppNotificationProps extends BaseAppNotificationProps {
    /**
     * Controls where the notification is delivered:
     * - "inline": rendered where the component is used (default).
     * - "center": sent to the NotificationCenter via NotificationProvider.
     */
    deliveryMode?: NotificationDeliveryMode;
    /** Stable id so a center notification can be updated instead of recreated. */
    notificationId?: string;
    /** Optional delay before dismissing a center notification on unmount. */
    lingerMs?: number;
}

/**
 * AppNotification (smart)
 *
 * Public component to be used across the app.
 * - If deliveryMode="inline" (default): renders the base notification inline.
 * - If deliveryMode="center": sends the notification to the global
 *   NotificationCenter and renders nothing inline.
 */
export const AppNotification: React.FC<AppNotificationProps> = ({
    deliveryMode = "inline",
    notificationId,
    lingerMs,
    ...baseProps
}) => {
    const { notify, dismiss } = useOptionalNotifications();
    const notificationIdRef = useRef<string | null>(null);
    const {
        type,
        icon,
        noIcon,
        title,
        content,
        details,
        detailsInitiallyOpen,
        detailsToggleLabels,
        actions,
        dismissible,
        onDismiss,
        autoCloseAfterMs,
        compact,
        className,
        style,
        visible,
        defaultVisible,
        onVisibleChange,
        role,
    } = baseProps;

    useEffect(() => {
        if (deliveryMode !== "center") {
            if (notificationIdRef.current) {
                dismiss(notificationIdRef.current);
                notificationIdRef.current = null;
            }
            return;
        }

        const options: CreateNotificationOptions = {
            type,
            icon,
            noIcon,
            title,
            content,
            details,
            detailsInitiallyOpen,
            detailsToggleLabels,
            actions,
            dismissible,
            autoCloseAfterMs,
            compact,
            className,
            style,
            role,
            lingerMs,
            id: notificationId ?? notificationIdRef.current ?? undefined,
            // Map onDismiss from props to center-level itemOnDismiss
            onDismiss,
        };

        notificationIdRef.current = notify(options);
    }, [
        deliveryMode,
        notify,
        dismiss,
        type,
        icon,
        noIcon,
        title,
        content,
        details,
        detailsInitiallyOpen,
        detailsToggleLabels,
        actions,
        dismissible,
        onDismiss,
        autoCloseAfterMs,
        compact,
        className,
        style,
        visible,
        defaultVisible,
        onVisibleChange,
        role,
        notificationId,
        lingerMs,
    ]);

    useEffect(() => {
        return () => {
            if (notificationIdRef.current) {
                dismiss(notificationIdRef.current);
                notificationIdRef.current = null;
            }
        };
    }, [dismiss]);

    if (deliveryMode === "center") {
        // Do not render anything inline, the center will show it.
        return null;
    }

    // Inline mode: render the base visual component.
    return <BaseAppNotification {...baseProps} />;
};
