import type { ReactNode } from "react";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type { AppNotificationVisibilityChangeReason } from "./BaseAppNotification";
import type {
    CreateNotificationOptions,
    NotificationCenterItem,
    NotificationContextValue,
} from "./types";

const NotificationContext = createContext<NotificationContextValue | undefined>(
    undefined
);

const generateNotificationId = (): string => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

interface NotificationProviderProps {
    children: ReactNode;
}

/**
 * NotificationProvider
 *
 * Holds the global notifications state and exposes:
 * - notifications[]
 * - notify()
 * - dismiss()
 * - clearAll()
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
    children,
}) => {
    const [notifications, setNotifications] = useState<
        NotificationCenterItem[]
    >([]);
    const notificationsRef = useRef<NotificationCenterItem[]>([]);
    const dismissTimersRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    const cancelPendingDismiss = useCallback((id: string) => {
        const timerId = dismissTimersRef.current.get(id);
        if (typeof timerId === "number") {
            window.clearTimeout(timerId);
            dismissTimersRef.current.delete(id);
        }
    }, []);

    const notify = useCallback((options: CreateNotificationOptions): string => {
        const { id: providedId, onDismiss, ...rest } = options;
        const id = providedId ?? generateNotificationId();

        cancelPendingDismiss(id);

        setNotifications((prev) => {
            const nextNotification: NotificationCenterItem = {
                id,
                ...rest,
                itemOnDismiss: onDismiss,
            };

            const existingIndex = prev.findIndex(
                (notification) => notification.id === id
            );

            if (providedId && existingIndex !== -1) {
                const next = [...prev];
                next[existingIndex] = {
                    ...next[existingIndex],
                    ...nextNotification,
                };
                return next;
            }

            return [...prev, nextNotification];
        });

        return id;
    }, [cancelPendingDismiss]);

    const dismiss = useCallback(
        (id: string, reason?: AppNotificationVisibilityChangeReason) => {
            const notification = notificationsRef.current.find(
                (item) => item.id === id
            );
            const lingerMs =
                reason === undefined ? notification?.lingerMs ?? 0 : 0;

            cancelPendingDismiss(id);

            if (lingerMs > 0) {
                const timerId = window.setTimeout(() => {
                    dismissTimersRef.current.delete(id);
                    setNotifications((prev) =>
                        prev.filter((item) => item.id !== id)
                    );
                }, lingerMs);

                dismissTimersRef.current.set(id, timerId);
                return;
            }

            setNotifications((prev) =>
                prev.filter((notification) => notification.id !== id)
            );
        },
        [cancelPendingDismiss]
    );

    const clearAll = useCallback(() => {
        dismissTimersRef.current.forEach((timerId) => {
            window.clearTimeout(timerId);
        });
        dismissTimersRef.current.clear();
        setNotifications([]);
    }, []);

    const value: NotificationContextValue = useMemo(
        () => ({
            notifications,
            notify,
            dismiss,
            clearAll,
        }),
        [notifications, notify, dismiss, clearAll]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

/**
 * Hook to access notifications context.
 * Must be used inside a <NotificationProvider>.
 */
export const useNotifications = (): NotificationContextValue => {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error(
            "useNotifications must be used within a NotificationProvider"
        );
    }
    return ctx;
};
export const useOptionalNotifications = (): NotificationContextValue => {
    const ctx = useContext(NotificationContext);

    if (!ctx) {
        // Fallback when there is no NotificationProvider in the tree.
        return {
            notifications: [],
            notify: () => "",
            dismiss: () => {},
            clearAll: () => {},
        };
    }

    return ctx;
};
