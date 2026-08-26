import "./Styles.scss";

import React from "react";

interface InlineWarningProps {
    children: React.ReactNode;
    className?: string;
}

export default function InlineWarning({
    children,
    className = "",
}: InlineWarningProps): React.ReactElement {
    const classes = ["inlineWarning", className].filter(Boolean).join(" ");

    return (
        <div className={classes} role="alert">
            <span className="inlineWarning__icon" aria-hidden="true" />
            <div className="inlineWarning__message">{children}</div>
        </div>
    );
}
