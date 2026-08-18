import React from "react";

import settings from "../../settings/settings.json";
import LendBorrowHeaderCenter from "./CustomHeaders/LendBorrowHeaderCenter";
import DefaultHeaderMenu from "./DefaultHeaderMenu";

type HeaderCenterVariant = "default" | "lendBorrowBanner";

interface HeaderMenuOption {
    path: string;
    nameKey: string;
    className: string;
    allowedProjects: string[];
    name: () => string;
}

interface HeaderCenterProps {
    currentPath: string;
    mainMenuOptions: HeaderMenuOption[];
    moreMenuOptions: HeaderMenuOption[];
    onMenuOptionClick: (path: string) => void;
    onMoreMenuToggle: () => void;
    showMoreDropdown: boolean;
    moreLabel: string;
}

interface ProjectSettingsWithHeader {
    header?: {
        centerVariant?: string;
    };
}

function getHeaderCenterVariant(): HeaderCenterVariant {
    const variant = (settings as unknown as ProjectSettingsWithHeader).header
        ?.centerVariant;

    if (variant === "lendBorrowBanner") {
        return variant;
    }

    return "default";
}

export default function HeaderCenter(
    props: HeaderCenterProps
): React.ReactElement {
    switch (getHeaderCenterVariant()) {
        case "lendBorrowBanner":
            return <LendBorrowHeaderCenter {...props} />;
        case "default":
        default:
            return <DefaultHeaderMenu {...props} />;
    }
}
