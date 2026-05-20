export interface HeaderMenuOption {
    path: string;
    nameKey: string;
    className: string;
    allowedProjects: string[];
    name: () => string;
}

export interface HeaderCenterProps {
    currentPath: string;
    mainMenuOptions: HeaderMenuOption[];
    moreMenuOptions: HeaderMenuOption[];
    onMenuOptionClick: (path: string) => void;
    onMoreMenuToggle: () => void;
    showMoreDropdown: boolean;
    moreLabel: string;
}
