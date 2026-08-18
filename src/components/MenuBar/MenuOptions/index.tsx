import "./Styles.scss";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
    getProjectMenuOptions,
    type RawMenuChildOption,
    type RawMenuOption,
} from "../../../helpers/menuOptions";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings";
import Branding from "../Branding";

export interface MenuOptionsProps {
    maxVisibleItems: number;
}

const isOptionActive = (currentPath: string, optionPath: string): boolean =>
    optionPath === "/"
        ? currentPath === "/"
        : currentPath === optionPath ||
          currentPath.startsWith(`${optionPath}/`);

const isMenuOptionActive = (
    currentPath: string,
    option: RawMenuOption
): boolean =>
    isOptionActive(currentPath, option.path) ||
    Boolean(
        option.children?.some((child) =>
            isOptionActive(currentPath, child.path)
        )
    );

export default function MenuOptions({
    maxVisibleItems,
}: MenuOptionsProps): JSX.Element {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useProjectTranslation();
    const menuRef = useRef<HTMLDivElement>(null);
    const desktopOpenTimerRef = useRef<number | null>(null);
    const desktopCloseTimerRef = useRef<number | null>(null);
    const projectOptionsKey = getProjectMenuOptions(settings.project)
        .map(
            (option) =>
                `${option.path}:${option.children?.map((child) => child.path).join(",") ?? ""}`
        )
        .join("|");
    const [orderedOptions, setOrderedOptions] = useState<RawMenuOption[]>(() =>
        getProjectMenuOptions(settings.project)
    );
    const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(
        null
    );

    const visibleItemsCount = Math.max(1, Math.floor(maxVisibleItems));
    const visibleOptions = orderedOptions.slice(0, visibleItemsCount);
    const moreOptions = orderedOptions.slice(visibleItemsCount);
    const isMoreActive = moreOptions.some((option) =>
        isMenuOptionActive(location.pathname, option)
    );

    useEffect(() => {
        setOrderedOptions(getProjectMenuOptions(settings.project));
    }, [projectOptionsKey]);

    useEffect(
        () => () => {
            if (desktopOpenTimerRef.current !== null)
                window.clearTimeout(desktopOpenTimerRef.current);
            if (desktopCloseTimerRef.current !== null)
                window.clearTimeout(desktopCloseTimerRef.current);
        },
        []
    );

    useEffect(() => {
        if (!isMobileOpen) return;

        const activeSubmenu = orderedOptions.find((option) =>
            option.children?.some((child) =>
                isOptionActive(location.pathname, child.path)
            )
        );
        if (activeSubmenu) setOpenMobileSubmenu(activeSubmenu.path);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileOpen, location.pathname, orderedOptions]);

    useEffect(() => {
        if (!openDesktopMenu && !isMobileOpen) return;

        const closeOnOutsideClick = (event: MouseEvent): void => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setOpenDesktopMenu(null);
                setIsMobileOpen(false);
                setOpenMobileSubmenu(null);
            }
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setOpenDesktopMenu(null);
                setIsMobileOpen(false);
                setOpenMobileSubmenu(null);
            }
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isMobileOpen, openDesktopMenu]);

    const selectOption = (
        option: Pick<RawMenuOption, "path"> | RawMenuChildOption,
        promoteFromMore = false,
        parentPath = option.path
    ): void => {
        setOpenDesktopMenu(null);
        setIsMobileOpen(false);
        setOpenMobileSubmenu(null);
        navigate(option.path);

        if (!promoteFromMore) return;

        setOrderedOptions((currentOptions) => {
            const selectedIndex = currentOptions.findIndex(
                (item) => item.path === parentPath
            );
            if (selectedIndex < visibleItemsCount) return currentOptions;

            const nextOptions = [...currentOptions];
            const [selectedOption] = nextOptions.splice(selectedIndex, 1);
            nextOptions.splice(visibleItemsCount - 1, 0, selectedOption);
            return nextOptions;
        });
    };

    const clearDesktopMenuTimers = (): void => {
        if (desktopOpenTimerRef.current !== null) {
            window.clearTimeout(desktopOpenTimerRef.current);
            desktopOpenTimerRef.current = null;
        }
        if (desktopCloseTimerRef.current !== null) {
            window.clearTimeout(desktopCloseTimerRef.current);
            desktopCloseTimerRef.current = null;
        }
    };

    const scheduleDesktopMenuOpen = (menu: string): void => {
        clearDesktopMenuTimers();

        if (openDesktopMenu && openDesktopMenu !== menu) {
            setOpenDesktopMenu(menu);
            return;
        }

        desktopOpenTimerRef.current = window.setTimeout(() => {
            setOpenDesktopMenu(menu);
            desktopOpenTimerRef.current = null;
        }, 120);
    };

    const scheduleDesktopMenuClose = (): void => {
        if (desktopOpenTimerRef.current !== null) {
            window.clearTimeout(desktopOpenTimerRef.current);
            desktopOpenTimerRef.current = null;
        }
        desktopCloseTimerRef.current = window.setTimeout(() => {
            setOpenDesktopMenu(null);
            desktopCloseTimerRef.current = null;
        }, 220);
    };

    const toggleDesktopMenu = (menu: string): void => {
        clearDesktopMenuTimers();
        setOpenDesktopMenu((openMenu) => (openMenu === menu ? null : menu));
    };

    const closeMobileMenu = (): void => {
        setIsMobileOpen(false);
        setOpenMobileSubmenu(null);
    };

    return (
        <div className="menu-bar-menu" ref={menuRef}>
            <nav
                aria-label={t("menuOptions.navigation", {
                    defaultValue: "Main navigation",
                })}
                className="menu-bar-menu__desktop"
            >
                {visibleOptions.map((option) =>
                    option.children?.length ? (
                        <div
                            className="menu-bar-menu__more"
                            key={option.path}
                            onBlur={(event) => {
                                if (
                                    !event.currentTarget.contains(
                                        event.relatedTarget
                                    )
                                )
                                    scheduleDesktopMenuClose();
                            }}
                            onMouseEnter={() =>
                                scheduleDesktopMenuOpen(option.path)
                            }
                            onMouseLeave={scheduleDesktopMenuClose}
                        >
                            <button
                                aria-expanded={openDesktopMenu === option.path}
                                aria-haspopup="menu"
                                className="menu-bar-menu__item menu-bar-menu__more-trigger"
                                data-active={
                                    isMenuOptionActive(
                                        location.pathname,
                                        option
                                    ) || undefined
                                }
                                data-testid={`menu-bar-item-${option.className}`}
                                onClick={() => toggleDesktopMenu(option.path)}
                                onFocus={() => {
                                    clearDesktopMenuTimers();
                                    setOpenDesktopMenu(option.path);
                                }}
                                type="button"
                            >
                                {t(option.nameKey)}
                                <span
                                    aria-hidden="true"
                                    className="menu-bar-menu__chevron"
                                />
                            </button>

                            {openDesktopMenu === option.path && (
                                <div
                                    className="menu-bar-menu__dropdown"
                                    role="menu"
                                >
                                    {option.children.map((child) => (
                                        <button
                                            aria-current={
                                                isOptionActive(
                                                    location.pathname,
                                                    child.path
                                                )
                                                    ? "page"
                                                    : undefined
                                            }
                                            className="menu-bar-menu__dropdown-item"
                                            data-testid={`menu-bar-item-${child.className ?? option.className}`}
                                            key={child.path}
                                            onClick={() => selectOption(child)}
                                            role="menuitem"
                                            type="button"
                                        >
                                            {t(child.nameKey)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            aria-current={
                                isMenuOptionActive(location.pathname, option)
                                    ? "page"
                                    : undefined
                            }
                            className="menu-bar-menu__item"
                            data-testid={`menu-bar-item-${option.className}`}
                            key={option.path}
                            onClick={() => selectOption(option)}
                            type="button"
                        >
                            {t(option.nameKey)}
                        </button>
                    )
                )}

                {moreOptions.length > 0 && (
                    <div
                        className="menu-bar-menu__more"
                        onBlur={(event) => {
                            if (
                                !event.currentTarget.contains(
                                    event.relatedTarget
                                )
                            )
                                scheduleDesktopMenuClose();
                        }}
                        onMouseEnter={() => scheduleDesktopMenuOpen("more")}
                        onMouseLeave={scheduleDesktopMenuClose}
                    >
                        <button
                            aria-expanded={openDesktopMenu === "more"}
                            aria-haspopup="menu"
                            className="menu-bar-menu__item menu-bar-menu__more-trigger"
                            data-active={isMoreActive || undefined}
                            data-testid="menu-bar-item-more"
                            onClick={() => toggleDesktopMenu("more")}
                            onFocus={() => {
                                clearDesktopMenuTimers();
                                setOpenDesktopMenu("more");
                            }}
                            type="button"
                        >
                            {t("menuOptions.more")}
                            <span
                                aria-hidden="true"
                                className="menu-bar-menu__chevron"
                            />
                        </button>

                        {openDesktopMenu === "more" && (
                            <div
                                className="menu-bar-menu__dropdown"
                                role="menu"
                            >
                                {moreOptions.map((option) =>
                                    option.children?.length ? (
                                        <div
                                            className="menu-bar-menu__dropdown-group"
                                            key={option.path}
                                        >
                                            <span className="menu-bar-menu__dropdown-label">
                                                {t(option.nameKey)}
                                            </span>
                                            {option.children.map((child) => (
                                                <button
                                                    aria-current={
                                                        isOptionActive(
                                                            location.pathname,
                                                            child.path
                                                        )
                                                            ? "page"
                                                            : undefined
                                                    }
                                                    className="menu-bar-menu__dropdown-item"
                                                    data-testid={`menu-bar-item-${child.className ?? option.className}`}
                                                    key={child.path}
                                                    onClick={() =>
                                                        selectOption(
                                                            child,
                                                            true,
                                                            option.path
                                                        )
                                                    }
                                                    role="menuitem"
                                                    type="button"
                                                >
                                                    {t(child.nameKey)}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <button
                                            aria-current={
                                                isMenuOptionActive(
                                                    location.pathname,
                                                    option
                                                )
                                                    ? "page"
                                                    : undefined
                                            }
                                            className="menu-bar-menu__dropdown-item"
                                            data-testid={`menu-bar-item-${option.className}`}
                                            key={option.path}
                                            onClick={() =>
                                                selectOption(option, true)
                                            }
                                            role="menuitem"
                                            type="button"
                                        >
                                            {t(option.nameKey)}
                                        </button>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                )}
            </nav>

            <button
                aria-expanded={isMobileOpen}
                aria-label={t("menuOptions.openNavigation", {
                    defaultValue: "Open navigation",
                })}
                className="menu-bar-menu__mobile-trigger"
                onClick={() => setIsMobileOpen((open) => !open)}
                type="button"
            >
                <span />
                <span />
                <span />
            </button>

            {isMobileOpen && (
                <>
                    <button
                        aria-label={t("menuOptions.closeNavigation", {
                            defaultValue: "Close navigation",
                        })}
                        className="menu-bar-menu__mobile-backdrop"
                        onClick={closeMobileMenu}
                        type="button"
                    />
                    <aside
                        aria-modal="true"
                        className="menu-bar-menu__mobile-dropdown"
                        role="dialog"
                    >
                        <div className="menu-bar-menu__mobile-header">
                            <Branding />
                            <button
                                aria-label={t("menuOptions.closeNavigation", {
                                    defaultValue: "Close navigation",
                                })}
                                className="menu-bar-menu__mobile-close"
                                onClick={closeMobileMenu}
                                type="button"
                            >
                                <span aria-hidden="true" />
                                <span aria-hidden="true" />
                            </button>
                        </div>
                        <nav
                            aria-label={t("menuOptions.navigation", {
                                defaultValue: "Main navigation",
                            })}
                            className="menu-bar-menu__mobile-list"
                        >
                            {orderedOptions.map((option) =>
                                option.children?.length ? (
                                    <div
                                        className="menu-bar-menu__mobile-group"
                                        key={option.path}
                                    >
                                        <button
                                            aria-expanded={
                                                openMobileSubmenu ===
                                                option.path
                                            }
                                            className="menu-bar-menu__mobile-item menu-bar-menu__mobile-parent"
                                            data-contains-active={
                                                option.children.some((child) =>
                                                    isOptionActive(
                                                        location.pathname,
                                                        child.path
                                                    )
                                                ) || undefined
                                            }
                                            onClick={() =>
                                                setOpenMobileSubmenu(
                                                    (openSubmenu) =>
                                                        openSubmenu ===
                                                        option.path
                                                            ? null
                                                            : option.path
                                                )
                                            }
                                            type="button"
                                        >
                                            {t(option.nameKey)}
                                            <span
                                                aria-hidden="true"
                                                className="menu-bar-menu__chevron"
                                            />
                                        </button>
                                        {openMobileSubmenu === option.path && (
                                            <div className="menu-bar-menu__mobile-children">
                                                {option.children.map(
                                                    (child) => (
                                                        <button
                                                            aria-current={
                                                                isOptionActive(
                                                                    location.pathname,
                                                                    child.path
                                                                )
                                                                    ? "page"
                                                                    : undefined
                                                            }
                                                            className="menu-bar-menu__mobile-item menu-bar-menu__mobile-child"
                                                            key={child.path}
                                                            onClick={() =>
                                                                selectOption(
                                                                    child
                                                                )
                                                            }
                                                            type="button"
                                                        >
                                                            {t(child.nameKey)}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        aria-current={
                                            isMenuOptionActive(
                                                location.pathname,
                                                option
                                            )
                                                ? "page"
                                                : undefined
                                        }
                                        className="menu-bar-menu__mobile-item"
                                        key={option.path}
                                        onClick={() => selectOption(option)}
                                        type="button"
                                    >
                                        {t(option.nameKey)}
                                    </button>
                                )
                            )}
                        </nav>
                    </aside>
                </>
            )}
        </div>
    );
}
