import React from "react";
import PropTypes from "prop-types";

import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import StatusBucket from "./bucket";


export default function GlobalStatusModal(props) {
    const { t } = useProjectTranslation();
    const { statusCode, hideModal } = props;

    
    return (
        <div className="global-status-modal-container">            
            <div className="status-list">
                {settings.tokens.CA.map((dataItem) => (
                    <StatusBucket key={dataItem.key} caIndex={dataItem.key} statusCode={statusCode}></StatusBucket>
                ))}
            </div>
            <div className="button-container">
                <button
                    type="primary"
                    className="button"
                    onClick={hideModal}
                >
                    {t("wallet.cta.close")}
                </button>
            </div>
        </div>
    );
}

GlobalStatusModal.propTypes = {
    statusCode: PropTypes.array,
    hideModal: PropTypes.func,
};
