import { Button } from "antd";
import Modal from "antd/lib/modal/Modal";
import React, { useState } from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import ConfirmOperation from "../../ConfirmOperation";
import type { CommissionsState } from "../../../types/status";

interface ModalConfirmOperationProps {
    inputValidationError?: boolean;
    currencyYouExchange: string;
    currencyYouReceive: string;
    exchangingUSD: bigint;
    commissionsByKey: CommissionsState;
    amountYouExchange: bigint;
    amountYouReceive: bigint;
    executionFee: bigint;
    executionFeeUSD: bigint;
    radioSelectFee: number;
    caIndex: number;
    operationType: string;
    slippageTolerance: number;
}

export default function ModalConfirmOperation(
    props: ModalConfirmOperationProps
): React.ReactElement {
    const { /*onClear,*/ inputValidationError } = props;

    const { t } = useProjectTranslation();
    const [visible, setVisible] = useState<boolean>(false);

    const showModal = (): void => {
        setVisible(true);
    };

    /*
    const clear = () => {
        onClear();
    };*/

    const hideModal = (): void => {
        setVisible(false);
    };

    return (
        <div className="ShowModalConfirmOperation">
            <Button
                type="primary"
                className="button"
                data-testid="confirm-operation-ok"
                onClick={showModal}
                disabled={inputValidationError || false}
            >
                {t("exchange.buttonPrimary")}
            </Button>
            {visible && (
                <Modal
                    title={t("exchange.modalTitle")}
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
                    <ConfirmOperation {...props} onCloseModal={hideModal} />
                </Modal>
            )}
        </div>
    );
}
