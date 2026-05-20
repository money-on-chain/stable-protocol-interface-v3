import React from "react";

import settings from "../../settings/settings.json";
import DefaultHeaderMenu from "./CustomHeaders/DefaultHeaderMenu";
import LendBorrowHeaderCenter from "./CustomHeaders/LendBorrowHeaderCenter";
import type { HeaderCenterProps } from "./CustomHeaders/types";

type HeaderCenterVariant = "default" | "lendBorrowBanner";

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
