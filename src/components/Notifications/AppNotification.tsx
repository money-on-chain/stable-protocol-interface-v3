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
    ...baseProps
}) => {
    const { notify } = useOptionalNotifications();

    // This ref prevents multiple notifications being sent
    // when React StrictMode mounts the component twice in development.
    const hasNotifiedRef = useRef(false);

    useEffect(() => {
        // If we are not in "center" mode, reset the flag and do nothing.
        if (deliveryMode !== "center") {
            hasNotifiedRef.current = false;
            return;
        }

        // If a notification was already sent for this component instance, skip.
        if (hasNotifiedRef.current) {
            return;
        }

        const options: CreateNotificationOptions = {
            ...baseProps,
            // Map onDismiss from props to center-level itemOnDismiss
            onDismiss: baseProps.onDismiss,
        };

        notify(options);
        hasNotifiedRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deliveryMode, notify]);

    if (deliveryMode === "center") {
        // Do not render anything inline, the center will show it.
        return null;
    }

    // Inline mode: render the base visual component.
    return <BaseAppNotification {...baseProps} />;
};
