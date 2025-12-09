import React from "react";

import {
    type AppNotificationVisibilityChangeReason,
    BaseAppNotification,
} from "./BaseAppNotification";
import type { NotificationCenterItem, NotificationCenterProps } from "./types";

/**
 * Basic NotificationCenter component.
 *
 * Responsibility:
 * - Receives a list of notification items.
 * - Renders one AppNotification per item.
 * - Bridges each AppNotification `onDismiss` to a center-level
 *   `onNotificationDismiss(id, reason)` so the parent can remove it.
 *
 * It does NOT:
 * - Manage internal state.
 * - Group notifications.
 * - Decide which notifications are global or local.
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
    notifications,
    onNotificationDismiss,
    className,
    style,
    renderItem,
}) => {
    if (!notifications || notifications.length === 0) {
        return null;
    }

    const containerClassName = ["notification-center", className || ""]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={containerClassName} style={style}>
            {notifications.map((item: NotificationCenterItem) => {
                const {
                    id,
                    itemOnDismiss,
                    // The rest of props will go to AppNotification.
                    ...appNotificationProps
                } = item;

                const handleDismiss = (
                    reason: AppNotificationVisibilityChangeReason
                ) => {
                    // First call per-item handler (if any)
                    itemOnDismiss?.(reason);

                    // Then notify the center parent
                    onNotificationDismiss?.(id, reason);
                };

                if (renderItem) {
                    // Custom rendering path (e.g. for animations)
                    return (
                        <React.Fragment key={id}>
                            {renderItem({
                                ...item,
                                itemOnDismiss: handleDismiss,
                            })}
                        </React.Fragment>
                    );
                }

                return (
                    <BaseAppNotification
                        key={id}
                        {...appNotificationProps}
                        onDismiss={handleDismiss}
                    />
                );
            })}
        </div>
    );
};
