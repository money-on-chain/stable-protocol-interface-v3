import "./Styles.scss";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getProjectMenuOptions, type RawMenuOption } from "../../../helpers/menuOptions";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings";

export interface MenuOptionsProps {
    maxVisibleItems: number;
}

const isOptionActive = (currentPath: string, optionPath: string): boolean =>
    optionPath === "/" ? currentPath === "/" : currentPath === optionPath || currentPath.startsWith(`${optionPath}/`);

export default function MenuOptions({ maxVisibleItems }: MenuOptionsProps): JSX.Element {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useProjectTranslation();
    const menuRef = useRef<HTMLDivElement>(null);
    const projectOptions = useMemo(() => getProjectMenuOptions(settings.project), []);
    const [orderedOptions, setOrderedOptions] = useState<RawMenuOption[]>(projectOptions);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const visibleItemsCount = Math.max(1, Math.floor(maxVisibleItems));
    const visibleOptions = orderedOptions.slice(0, visibleItemsCount);
    const moreOptions = orderedOptions.slice(visibleItemsCount);
    const isMoreActive = moreOptions.some((option) => isOptionActive(location.pathname, option.path));

    useEffect(() => {
        if (!isMoreOpen && !isMobileOpen) return;

        const closeOnOutsideClick = (event: MouseEvent): void => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsMoreOpen(false);
                setIsMobileOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setIsMoreOpen(false);
                setIsMobileOpen(false);
            }
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isMobileOpen, isMoreOpen]);

    const selectOption = (option: RawMenuOption, promoteFromMore = false): void => {
        setIsMoreOpen(false);
        setIsMobileOpen(false);
        navigate(option.path);

        if (!promoteFromMore) return;

        setOrderedOptions((currentOptions) => {
            const selectedIndex = currentOptions.findIndex((item) => item.path === option.path);
            if (selectedIndex < visibleItemsCount) return currentOptions;

            const nextOptions = [...currentOptions];
            const [selectedOption] = nextOptions.splice(selectedIndex, 1);
            nextOptions.splice(visibleItemsCount - 1, 0, selectedOption);
            return nextOptions;
        });
    };

    return (
        <div className="menu-bar-menu" ref={menuRef}>
            <nav
                aria-label={t("menuOptions.navigation", { defaultValue: "Main navigation" })}
                className="menu-bar-menu__desktop"
            >
                {visibleOptions.map((option) => (
                    <button
                        aria-current={isOptionActive(location.pathname, option.path) ? "page" : undefined}
                        className="menu-bar-menu__item"
                        key={option.path}
                        onClick={() => selectOption(option)}
                        type="button"
                    >
                        {t(option.nameKey)}
                    </button>
                ))}

                {moreOptions.length > 0 && (
                    <div className="menu-bar-menu__more">
                        <button
                            aria-expanded={isMoreOpen}
                            aria-haspopup="menu"
                            className="menu-bar-menu__item menu-bar-menu__more-trigger"
                            data-active={isMoreActive || undefined}
                            onClick={() => setIsMoreOpen((open) => !open)}
                            type="button"
                        >
                            {t("menuOptions.more")}
                            <span aria-hidden="true" className="menu-bar-menu__chevron" />
                        </button>

                        {isMoreOpen && (
                            <div className="menu-bar-menu__dropdown" role="menu">
                                {moreOptions.map((option) => (
                                    <button
                                        aria-current={
                                            isOptionActive(location.pathname, option.path) ? "page" : undefined
                                        }
                                        className="menu-bar-menu__dropdown-item"
                                        key={option.path}
                                        onClick={() => selectOption(option, true)}
                                        role="menuitem"
                                        type="button"
                                    >
                                        {t(option.nameKey)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </nav>

            <button
                aria-expanded={isMobileOpen}
                aria-label={t("menuOptions.navigation", { defaultValue: "Open navigation" })}
                className="menu-bar-menu__mobile-trigger"
                onClick={() => setIsMobileOpen((open) => !open)}
                type="button"
            >
                <span />
                <span />
                <span />
            </button>

            {isMobileOpen && (
                <nav
                    aria-label={t("menuOptions.navigation", { defaultValue: "Main navigation" })}
                    className="menu-bar-menu__mobile-dropdown"
                >
                    {orderedOptions.map((option) => (
                        <button
                            aria-current={isOptionActive(location.pathname, option.path) ? "page" : undefined}
                            className="menu-bar-menu__mobile-item"
                            key={option.path}
                            onClick={() => selectOption(option)}
                            type="button"
                        >
                            {t(option.nameKey)}
                        </button>
                    ))}
                </nav>
            )}
        </div>
    );
}
