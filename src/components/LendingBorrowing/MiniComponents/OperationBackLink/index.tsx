import "./Styles.scss";

import React from "react";

interface OperationBackLinkProps {
    label?: string;
    onClick: () => void;
}

export default function OperationBackLink({
    label = "Back to Lending & Borrowing",
    onClick,
}: OperationBackLinkProps): React.ReactElement {
    return (
        <button className="operation-back-link" onClick={onClick} type="button">
            <div className="icon__navigation-back operation-back-link__icon"></div>
            <div className="operation-back-link__label">{label}</div>
        </button>
    );
}
