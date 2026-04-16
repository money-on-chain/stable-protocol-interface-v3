import "./Styles.scss";

import type { CSSProperties, ReactNode } from "react";
import React, { useEffect, useMemo, useRef, useState } from "react";

export type AppNotificationType =
    | "info"
    | "success"
    | "warning"
    | "error"
    | "neutral";

export type AppNotificationVisibilityChangeReason = "manual" | "auto";

export type AppNotificationActionVisualType = "primary" | "secondary" | "link";

export interface AppNotificationAction {
    key: string;
    label: ReactNode;
    onClick?: () => void;
    href?: string;
    target?: string;
    type?: AppNotificationActionVisualType;
    disabled?: boolean;
    loading?: boolean;
}

export interface BaseAppNotificationProps {
    type?: AppNotificationType;
    icon?: string;
    noIcon?: boolean;
    title?: ReactNode;
    content?: ReactNode;
    details?: ReactNode;
    detailsInitiallyOpen?: boolean;
    detailsToggleLabels?: {
        show: string;
        hide: string;
    };
    actions?: AppNotificationAction[] | ReactNode;
    dismissible?: boolean;
    onDismiss?: (reason: AppNotificationVisibilityChangeReason) => void;
    autoCloseAfterMs?: number;
    compact?: boolean;
    className?: string;
    style?: CSSProperties;
    visible?: boolean;
    defaultVisible?: boolean;
    onVisibleChange?: (
        visible: boolean,
        reason: AppNotificationVisibilityChangeReason
    ) => void;
    role?: "status" | "alert";
}

export const BaseAppNotification: React.FC<BaseAppNotificationProps> = ({
    type = "neutral",
    icon,
    noIcon,
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
    const defaultIcons: Record<AppNotificationType, string> = {
        info: "icon-status-info",
        warning: "icon-status-warning",
        success: "icon-status-success",
        neutral: "icon-status-neutral",
        error: "icon-status-error",
    };

    const iconClass = noIcon ? null : (icon ?? defaultIcons[type]);

    const isControlled = typeof visible === "boolean";

    const [internalVisible, setInternalVisible] = useState<boolean>(
        defaultVisible ?? true
    );

    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(
        detailsInitiallyOpen ?? false
    );

    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
        null
    );

    const autoCloseDeadlineRef = useRef<number | null>(null);

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

    useEffect(() => {
        if (!isVisible || !autoCloseAfterMs || autoCloseAfterMs <= 0) {
            autoCloseDeadlineRef.current = null;
            setRemainingSeconds(null);
            return;
        }

        const now = Date.now();
        const deadline = now + autoCloseAfterMs;
        autoCloseDeadlineRef.current = deadline;

        setRemainingSeconds(Math.ceil(autoCloseAfterMs / 1000));

        const intervalId = window.setInterval(() => {
            if (!autoCloseDeadlineRef.current) return;

            const remainingMs = autoCloseDeadlineRef.current - Date.now();

            if (remainingMs <= 0) {
                setRemainingSeconds(0);
                window.clearInterval(intervalId);
                return;
            }

            setRemainingSeconds(Math.ceil(remainingMs / 1000));
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isVisible, autoCloseAfterMs]);

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
                        loading,
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
                                aria-loading={loading ? "true" : "false"}
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
            <div className="app-notification__header">
                {title && (
                    <div className="app-notification__title">
                        {iconClass && (
                            <div
                                className={`app-notification__icon ${iconClass}`}
                            />
                        )}
                        {title}
                    </div>
                )}
                {dismissible && (
                    <div className="app-notification__close-wrapper">
                        {autoCloseAfterMs &&
                            autoCloseAfterMs > 0 &&
                            remainingSeconds !== null && (
                                <span className="app-notification__countdown">
                                    {remainingSeconds}s
                                </span>
                            )}
                        <button
                            type="button"
                            className="app-notification__close icon__close__menu"
                            aria-label="Dismiss notification"
                            onClick={() => handleDismiss("manual")}
                        ></button>
                    </div>
                )}
            </div>
            <div className="app-notification__body">
                {content && (
                    <div className="app-notification__content">
                        {content}
                        {details && (
                            <div className="app-notification__details">
                                <button
                                    type="button"
                                    className="app-notification__details-toggle"
                                    onClick={() =>
                                        setIsDetailsOpen((prev) => !prev)
                                    }
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
                )}
                <div className="app-notification__actions-wrapper">
                    {renderActions()}
                </div>
            </div>
        </div>
    );
};
