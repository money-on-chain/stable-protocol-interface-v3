import "./Styles.scss";

import React from "react";

interface OperationNoticeProps {
    children: React.ReactNode;
    title: React.ReactNode;
}

export default function OperationNotice({
    children,
    title,
}: OperationNoticeProps): React.ReactElement {
    return (
        <div className="operation-wrapper">
            <div className="operation-notice">
                <div className="operation-notice__title">{title}</div>
                <div className="operation-notice__content">{children}</div>
            </div>{" "}
        </div>
    );
}
