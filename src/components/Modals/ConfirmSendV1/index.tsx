import Modal from "antd/lib/modal/Modal";
import React, { useState } from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import Button from "../../Button";
import ConfirmSendV1 from "../../ConfirmSendV1";

interface ModalConfirmSendV1Props {
    inputValidationError?: boolean;
    currencyYouExchange: string;
    exchangingUSD: bigint;
    amountYouExchange: string;
    destinationAddress: string;
    onClear: () => void;
}

export default function ModalConfirmSendV1(
    props: ModalConfirmSendV1Props
): React.ReactElement {
    const { inputValidationError } = props;

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
                className="button"
                data-testid="confirm-send-v1-ok"
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
                    <ConfirmSendV1 {...props} onCloseModal={hideModal} />
                </Modal>
            )}
        </div>
    );
}
