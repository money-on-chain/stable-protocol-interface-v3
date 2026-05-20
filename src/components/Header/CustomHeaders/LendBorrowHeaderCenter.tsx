import React from "react";

import type { HeaderCenterProps } from "./types";

const EXTERNAL_DAPP_OPTIONS = [
    {
        label: "Money On Chain",
        description: "Open dApp",
        href: "https://dapp.moneyonchain.com",
    },
    {
        label: "MOC Manage",
        description: "Open dApp",
        href: "https://manage.moneyonchain.com",
    },
];

export default function LendBorrowHeaderCenter(
    _props: HeaderCenterProps
): React.ReactElement {
    return (
        <div className="header-center-banner header-center-banner--lend-borrow">
            <div className="header-center-banner__content">
                <span className="header-center-banner__eyebrow">
                    Money On Chain Ecosystem
                </span>
                <span className="header-center-banner__title">
                    Access Protocol Applications
                </span>
            </div>
            <div className="header-center-banner__actions">
                {EXTERNAL_DAPP_OPTIONS.map((option) => (
                    <a
                        aria-label={`Open ${option.label} external dApp`}
                        className="header-center-banner__external-pill"
                        href={option.href}
                        key={option.href}
                        rel="noreferrer"
                        target="_blank"
                    >
                        <span className="header-center-banner__external-icon-wrap">
                            <span className="header-center-banner__external-icon icon-external-link"></span>
                        </span>
                        <span className="header-center-banner__external-copy">
                            <span className="header-center-banner__external-label">
                                {option.label}
                            </span>
                            <span className="header-center-banner__external-description">
                                {option.description}
                            </span>
                        </span>
                        <span className="header-center-banner__external-arrow"></span>
                    </a>
                ))}
            </div>
        </div>
    );
}
