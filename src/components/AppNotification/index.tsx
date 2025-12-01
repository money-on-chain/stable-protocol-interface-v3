import "./Styles.scss";

import type { CSSProperties, ReactNode } from "react";
import React, { useEffect, useMemo, useState } from "react";

export type AppNotificationType =
    | "info"
    | "success"
    | "warning"
    | "error"
    | "neutral";

export type AppNotificationVisibilityChangeReason = "manual" | "auto";

export type AppNotificationActionVisualType = "primary" | "secondary" | "link";

export interface AppNotificationAction {
    /** Unique identifier for the action, used as React key */
    key: string;
    /** Visible label of the action */
    label: ReactNode;
    /** Called when the action is clicked */
    onClick?: () => void;
    /** Optional href: renders the action as an anchor if provided */
    href?: string;
    /** Target for anchor actions */
    target?: string;
    /** Visual style of the action button */
    type?: AppNotificationActionVisualType;
    /** Disables the action */
    disabled?: boolean;
}

export interface AppNotificationProps {
    /** Visual style / semantic type of the notification */
    type?: AppNotificationType;

    /** Optional icon rendered on the left side */
    icon?: ReactNode;

    /** Notification title (single line, bold by default) */
    title?: ReactNode;

    /** Main message / HTML content. Can be rich JSX */
    content?: ReactNode;

    /** Optional expandable details block */
    details?: ReactNode;

    /** Initial state of the details section */
    detailsInitiallyOpen?: boolean;

    /** Custom labels for the details toggle button */
    detailsToggleLabels?: {
        show: string;
        hide: string;
    };

    /**
     * Simple declarative actions.
     * If you need full custom layout, you can pass a ReactNode instead.
     */
    actions?: AppNotificationAction[] | ReactNode;

    /** Shows a dismiss (close) button */
    dismissible?: boolean;

    /** Called when the notification is dismissed (manual or auto) */
    onDismiss?: (reason: AppNotificationVisibilityChangeReason) => void;

    /**
     * Automatically closes the notification after N milliseconds.
     * If omitted or <= 0, auto close is disabled.
     */
    autoCloseAfterMs?: number;

    /** Compacts paddings / font size for tighter layouts */
    compact?: boolean;

    /** Additional className for custom styling */
    className?: string;

    /** Inline style if needed */
    style?: CSSProperties;

    /**
     * Controlled visibility.
     * If provided, the notification will not manage its own "visible" state.
     */
    visible?: boolean;

    /**
     * Initial visibility for uncontrolled mode.
     * Defaults to true if not provided.
     */
    defaultVisible?: boolean;

    /** Notified whenever visibility changes */
    onVisibleChange?: (
        visible: boolean,
        reason: AppNotificationVisibilityChangeReason
    ) => void;

    /**
     * Optional ARIA role. Defaults to "status".
     * You may want "alert" for error-type banners.
     */
    role?: "status" | "alert";
}

export const AppNotification: React.FC<AppNotificationProps> = ({
    type = "neutral",
    icon,
    title,
    content,
    details,
    detailsInitiallyOpen,
    detailsToggleLabels = {
        show: "Show details",
        hide: "Hide details",
    },
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
    role = "status",
}) => {
    const isControlled = typeof visible === "boolean";

    const [internalVisible, setInternalVisible] = useState<boolean>(
        defaultVisible ?? true
    );

    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(
        detailsInitiallyOpen ?? false
    );

    const isVisible = isControlled ? visible : internalVisible;

    const handleVisibilityChange = (
        nextVisible: boolean,
        reason: AppNotificationVisibilityChangeReason
    ) => {
        if (!isControlled) {
            setInternalVisible(nextVisible);
        }

        if (!nextVisible) {
            onDismiss?.(reason);
        }

        onVisibleChange?.(nextVisible, reason);
    };

    const handleDismiss = (reason: AppNotificationVisibilityChangeReason) => {
        if (!isVisible) return;
        handleVisibilityChange(false, reason);
    };

    // Auto close (inline logic to avoid handleDismiss in deps)
    useEffect(() => {
        if (!isVisible) return;
        if (!autoCloseAfterMs || autoCloseAfterMs <= 0) return;

        const timerId = window.setTimeout(() => {
            if (!isVisible) return;

            if (!isControlled) {
                setInternalVisible(false);
            }

            onDismiss?.("auto");
            onVisibleChange?.(false, "auto");
        }, autoCloseAfterMs);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [isVisible, autoCloseAfterMs, isControlled, onDismiss, onVisibleChange]);

    const rootClassName = useMemo(() => {
        const classes = ["app-notification", `app-notification--type-${type}`];

        if (compact) {
            classes.push("app-notification--compact");
        }

        if (dismissible) {
            classes.push("app-notification--dismissible");
        }

        if (className) {
            classes.push(className);
        }

        return classes.join(" ");
    }, [type, compact, dismissible, className]);

    const renderActions = () => {
        if (!actions) return null;

        // Custom layout passed directly
        if (!Array.isArray(actions)) {
            return <div className="app-notification__actions">{actions}</div>;
        }

        if (actions.length === 0) return null;

        return (
            <div className="app-notification__actions">
                {actions.map((action) => {
                    const {
                        key,
                        label,
                        onClick,
                        href,
                        target,
                        type: actionType = "primary",
                        disabled,
                    } = action;

                    const actionClassName = [
                        "app-notification__action",
                        `app-notification__action--${actionType}`,
                        disabled ? "app-notification__action--disabled" : "",
                    ]
                        .filter(Boolean)
                        .join(" ");

                    if (href) {
                        return (
                            <a
                                key={key}
                                href={href}
                                target={target}
                                rel={
                                    target === "_blank"
                                        ? "noreferrer noopener"
                                        : undefined
                                }
                                className={actionClassName}
                                aria-disabled={disabled || undefined}
                                onClick={(event) => {
                                    if (disabled) {
                                        event.preventDefault();
                                        return;
                                    }
                                    onClick?.();
                                }}
                            >
                                {label}
                            </a>
                        );
                    }

                    return (
                        <button
                            key={key}
                            type="button"
                            className={actionClassName}
                            disabled={disabled}
                            onClick={() => {
                                if (disabled) return;
                                onClick?.();
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        );
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div
            className={rootClassName}
            style={style}
            role={role}
            aria-live={role === "alert" ? "assertive" : "polite"}
        >
            <div className="app-notification__body">
                {title && (
                    <div className="app-notification__title">
                        {" "}
                        {icon && (
                            <div
                                className={`app-notification__icon ${icon}`}
                            ></div>
                        )}
                        {title}
                    </div>
                )}
                {content && (
                    <div className="app-notification__content">{content}</div>
                )}
                {details && (
                    <div className="app-notification__details">
                        <button
                            type="button"
                            className="app-notification__details-toggle"
                            onClick={() => setIsDetailsOpen((prev) => !prev)}
                        >
                            {isDetailsOpen
                                ? detailsToggleLabels.hide
                                : detailsToggleLabels.show}
                        </button>
                        {isDetailsOpen && (
                            <div className="app-notification__details-body">
                                {details}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {renderActions()}
            {dismissible && (
                <button
                    type="button"
                    className="app-notification__close icon__close__menu"
                    aria-label="Dismiss notification"
                    onClick={() => handleDismiss("manual")}
                ></button>
            )}
        </div>
    );
};
