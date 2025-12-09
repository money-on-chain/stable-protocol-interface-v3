import type { ReactNode } from "react";
import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
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

    const notify = useCallback((options: CreateNotificationOptions): string => {
        const { id: providedId, onDismiss, ...rest } = options;
        const id = providedId ?? generateNotificationId();

        setNotifications((prev) => [
            ...prev,
            {
                id,
                ...rest,
                itemOnDismiss: onDismiss,
            },
        ]);

        return id;
    }, []);

    const dismiss = useCallback(
        (id: string, _reason?: AppNotificationVisibilityChangeReason) => {
            setNotifications((prev) =>
                prev.filter((notification) => notification.id !== id)
            );
        },
        []
    );

    const clearAll = useCallback(() => {
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
