import Modal from "antd/lib/modal/Modal";
import React, { useRef } from "react";

import type { AllowanceStep } from "../../../types/status";
import Allowance from "../../Allowance";

interface ModalAllowanceOperationProps {
    name?: string;
    visible?: boolean;
    onHideModalAllowance: () => void;
    title?: string;
    currencyYouExchange: string;
    currencyYouReceive: string;
    amountYouExchangeLimit: bigint;
    onCallback: (startPoint: AllowanceStep) => void;
    disAllowance?: boolean;
    caIndex: number;
}

export default function ModalAllowanceOperation(
    props: ModalAllowanceOperationProps
): React.ReactElement {
    const { visible, onHideModalAllowance, title } = props;
    // Close the approval dialog before starting the next wallet request.
    // destroyOnClose then resets its state for the next approval.
    const pendingStep = useRef<AllowanceStep>();

    const closeModal = (nextStep?: AllowanceStep): void => {
        pendingStep.current = nextStep;
        onHideModalAllowance();
    };

    const afterClose = (): void => {
        const nextStep = pendingStep.current;
        pendingStep.current = undefined;
        if (nextStep) props.onCallback(nextStep);
    };

    return (
        <div className="ShowModalAllowance">
            <Modal
                title={title}
                width={505}
                open={visible}
                onCancel={() => closeModal()}
                afterClose={afterClose}
                destroyOnClose
                footer={null}
                closable={false}
                className="ModalAllowance"
                centered={true}
                maskClosable={false}
                maskStyle={{}}
            >
                <Allowance {...props} onCloseModal={closeModal} />
            </Modal>
        </div>
    );
}
