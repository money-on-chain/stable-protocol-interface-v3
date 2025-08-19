import React from "react";
import { useProjectTranslation } from "../../helpers/translations";
import "./Styles.scss";
export default function NotConnected(): React.ReactElement {
    const { t } = useProjectTranslation();

    return (
        <div className="section-container">
            <div className="content-page">
                <div className="layout-card notConnectedSplash decontent-page-header">
                    <h1>{t("exchange.cardTitle")}</h1>
                </div>
            </div>
        </div>
    );
}
