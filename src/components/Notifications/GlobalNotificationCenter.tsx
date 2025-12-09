import React from "react";

import { NotificationCenter } from "./NotificationCenter";
import { useNotifications } from "./NotificationProvider";
import type { GlobalNotificationCenterProps } from "./types";

/**
 * GlobalNotificationCenter
 *
 * Thin wrapper around NotificationCenter that reads notifications
 * from NotificationProvider via context.
 *
 * Usage:
 * - Place it once in your main layout (or wherever you want to show global notifications).
 */
export const GlobalNotificationCenter: React.FC<
    GlobalNotificationCenterProps
> = ({ className, style, renderItem }) => {
    const { notifications, dismiss } = useNotifications();

    return (
        <NotificationCenter
            notifications={notifications}
            onNotificationDismiss={dismiss}
            className={className}
            style={style}
            renderItem={renderItem}
        />
    );
};
