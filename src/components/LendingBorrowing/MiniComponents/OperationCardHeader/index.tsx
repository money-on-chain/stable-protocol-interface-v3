import "./Styles.scss";

import React from "react";

import OperationBackLink from "../OperationBackLink";

interface OperationCardHeaderProps {
    aside?: React.ReactNode;
    backLabel?: string;
    className?: string;
    onBack: () => void;
    title: React.ReactNode;
}

export default function OperationCardHeader({
    aside,
    backLabel,
    className,
    onBack,
    title,
}: OperationCardHeaderProps): React.ReactElement {
    const headerClassName = [
        "layout-card-title",
        "operation-card-header",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={headerClassName}>
            <div className="operation-card-header__title-group">
                <OperationBackLink label={backLabel} onClick={onBack} />
                <h1>{title}</h1>
            </div>
            {aside ? (
                <div className="operation-card-header__aside">{aside}</div>
            ) : null}
        </div>
    );
}
