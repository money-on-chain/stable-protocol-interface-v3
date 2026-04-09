import "./style.scss";

import Modal from "antd/lib/modal/Modal";
import React, { useState } from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import Swap from "../Swap";

// If you know the props type, replace 'unknown' with the correct interface
export interface ModalTokenMigrationProps {
    // Add specific prop types here if known
    [key: string]: unknown;
}

export default function ModalTokenMigration(
    props: ModalTokenMigrationProps
): React.ReactElement {
    const [visible, setVisible] = useState(false);

    const showModal = () => {
        setVisible(true);
    };

    const hideModal = () => {
        setVisible(false);
    };

    const { t } = useProjectTranslation();

    return (
        <div className="ShowTokenMigration">
            <div className="NotificationMigration">
                <div className="Information">
                    {t("swapModal.text1")}
                    <span
                        className="swapNow"
                        onClick={showModal}
                        style={{ cursor: "pointer" }}
                    >
                        {t("swapModal.text2")}
                    </span>
                </div>
                <div className="cta-options-group">
                    <button
                        data-testid="token-migrator-start"
                        type="button"
                        className="button"
                        onClick={showModal}
                    >
                        {t("swapModal.button")}
                    </button>
                </div>
            </div>
            {visible && (
                <Modal
                    title=""
                    width={560}
                    open={visible}
                    onCancel={hideModal}
                    footer={null}
                    className="ModalTokenMigration"
                    centered={true}
                    maskStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.08)",
                        backdropFilter: "blur(2px)",
                    }}
                >
                    <Swap {...props} onCloseModal={hideModal} />
                </Modal>
            )}
        </div>
    );
}
