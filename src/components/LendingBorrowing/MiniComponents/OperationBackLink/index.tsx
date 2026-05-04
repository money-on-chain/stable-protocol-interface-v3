import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../../helpers/translations";
interface OperationBackLinkProps {
    label?: string;
    onClick: () => void;
}

export default function OperationBackLink({
    label,

    onClick,
}: OperationBackLinkProps): React.ReactElement {
    const { t } = useProjectTranslation();

    const finalLabel = label ?? t("lendingBorrowing.backLink");

    return (
        <button className="operation-back-link" onClick={onClick} type="button">
            <div className="icon__navigation-back operation-back-link__icon"></div>

            <div className="operation-back-link__label">{finalLabel}</div>
        </button>
    );
}
