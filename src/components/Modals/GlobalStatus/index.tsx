import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import type { TokenConfig } from "../../../types/hooks";
import StatusBucket from "./bucket";

// Type definitions
interface GlobalStatusModalProps {
    statusCode: number[];
    hideModal: () => void;
}

export default function GlobalStatusModal(
    props: GlobalStatusModalProps
): JSX.Element {
    const { t } = useProjectTranslation();
    const { statusCode, hideModal } = props;

    return (
        <div className="detailedGlobalStatusModal">
            <div className="collateralContainer">
                {(settings.tokens.CA as TokenConfig[])
                    .filter(
                        (dataItem): dataItem is TokenConfig & { key: number } =>
                            dataItem && typeof dataItem.key === "number"
                    )
                    .map((dataItem) => (
                        <StatusBucket
                            key={dataItem.key}
                            caIndex={dataItem.key}
                            statusCode={statusCode}
                        ></StatusBucket>
                    ))}
            </div>
            <div className="cta">
                <button className="button" onClick={hideModal}>
                    {t("wallet.cta.close")}
                </button>
            </div>
        </div>
    );
}
