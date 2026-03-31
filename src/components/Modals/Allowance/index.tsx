import Modal from "antd/lib/modal/Modal";
import React from "react";

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

    return (
        <div className="ShowModalAllowance">
            <Modal
                title={title}
                width={505}
                open={visible}
                onCancel={onHideModalAllowance}
                footer={null}
                closable={false}
                className="ModalAllowance"
                centered={true}
                maskClosable={false}
                maskStyle={{}}
            >
                <Allowance {...props} onCloseModal={onHideModalAllowance} />
            </Modal>
        </div>
    );
}
