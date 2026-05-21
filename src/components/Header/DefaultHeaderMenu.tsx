import React from "react";

interface HeaderMenuOption {
    path: string;
    nameKey: string;
    className: string;
    allowedProjects: string[];
    name: () => string;
}

interface DefaultHeaderMenuProps {
    currentPath: string;
    mainMenuOptions: HeaderMenuOption[];
    moreMenuOptions: HeaderMenuOption[];
    onMenuOptionClick: (path: string) => void;
    onMoreMenuToggle: () => void;
    showMoreDropdown: boolean;
    moreLabel: string;
}

export default function DefaultHeaderMenu({
    currentPath,
    mainMenuOptions,
    moreMenuOptions,
    onMenuOptionClick,
    onMoreMenuToggle,
    showMoreDropdown,
    moreLabel,
}: DefaultHeaderMenuProps): React.ReactElement {
    return (
        <div className="central-menu">
            {mainMenuOptions.map((option: HeaderMenuOption) => (
                <a
                    onClick={() => onMenuOptionClick(option.path)}
                    data-testid={`navbar-menu-item-${option.className}`}
                    className={`menu-nav-item disable-nav-item ${currentPath === option.path ? "menu-nav-item-selected" : ""}`}
                    key={option.path}
                >
                    <div
                        className={`${option.className}${currentPath === option.path ? "-selected" : ""}`}
                    ></div>
                    <span className="menu-nav-item-title">{option.name()}</span>
                </a>
            ))}
            {moreMenuOptions.length > 0 && (
                <div
                    data-testid="navbar-menu-item-more"
                    onClick={onMoreMenuToggle}
                    className="menu-nav-item-more"
                >
                    <div className="logo-more"></div>
                    <span className="menu-nav-item-title-more">
                        {moreLabel}
                    </span>{" "}
                    {showMoreDropdown && (
                        <div className="dropdown-menu show">
                            {moreMenuOptions.map((option: HeaderMenuOption) => (
                                <a
                                    data-testid={`navbar-menu-item-${option.className}`}
                                    onClick={() =>
                                        onMenuOptionClick(option.path)
                                    }
                                    className={`menu-nav-item disable-nav-item ${currentPath === option.path ? "menu-nav-item-selected" : ""}`}
                                    key={option.path}
                                >
                                    <i
                                        className={`${option.className}${currentPath === option.path ? "-selected" : ""}`}
                                    ></i>
                                    <span className="menu-nav-item-title">
                                        {option.name()}
                                    </span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
