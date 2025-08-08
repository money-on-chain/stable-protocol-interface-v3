import React, { useState } from "react";
import Modal from "antd/lib/modal/Modal";

import { useProjectTranslation } from "../../../helpers/translations";
import ConfirmSend from "../../ConfirmSend";
import { Button } from "antd";

interface ModalConfirmSendProps {
    inputValidationError?: boolean;
    currencyYouExchange: string;
    exchangingUSD: any; //
    amountYouExchange: string;
    destinationAddress: string;
}

export default function ModalConfirmSend(props: ModalConfirmSendProps): React.ReactElement {
    const { /*onClear,*/ inputValidationError } = props;

    const { t } = useProjectTranslation();
    const [visible, setVisible] = useState<boolean>(false);

    const showModal = (): void => {
        setVisible(true);
    };

    const hideModal = (): void => {
        setVisible(false);
    };

    return (
        <div className="ShowModalConfirmOperation">
            <Button
                type="primary"
                className={
                    import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT.toLowerCase()
                        ? "button"
                        : "button"
                }
                onClick={showModal}
                disabled={inputValidationError || false}
            >
                {t("send.buttonPrimary")}
            </Button>
            {visible && (
                <Modal
                    title={t("send.modalTitle")}
                    width={505}
                    open={visible}
                    onCancel={hideModal}
                    footer={null}
                    className="ModalConfirmOperation"
                    closable={false}
                    centered={true}
                    maskClosable={false}
                    maskStyle={{}}
                >
                    <ConfirmSend {...props} onCloseModal={hideModal} />
                </Modal>
            )}
        </div>
    );
}
