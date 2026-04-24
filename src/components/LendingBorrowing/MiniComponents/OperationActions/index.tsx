import "./Styles.scss";

import React from "react";

interface OperationActionsProps {
    children: React.ReactNode;
}

export default function OperationActions({
    children,
}: OperationActionsProps): React.ReactElement {
    return <div className="operation-actions">{children}</div>;
}
