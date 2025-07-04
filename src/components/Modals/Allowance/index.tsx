import React from "react";
import Modal from "antd/lib/modal/Modal";

import Allowance from "../../Allowance";

interface ModalAllowanceOperationProps {
    visible?: boolean;
    onHideModalAllowance: () => void;
    title?: string;
    currencyYouExchange: string;
    currencyYouReceive: string;
    amountYouExchangeLimit: any; // BigNumber type
    onRealSendTransaction: () => void;
    disAllowance?: boolean;
}

export default function ModalAllowanceOperation(props: ModalAllowanceOperationProps): React.ReactElement {
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
