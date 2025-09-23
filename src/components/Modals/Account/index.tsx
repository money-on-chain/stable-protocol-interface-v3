import Modal from "antd/lib/modal/Modal";
import React, { Fragment } from "react";

import Account from "../../Account";

interface ModalAccountProps {
    show: boolean;
    onShow: () => void;
    onHide: () => void;
    vestingOn: boolean;
    setVestingOn: (value: boolean) => void;
    [key: string]: any; // For any additional props that might be passed
}

export default function ModalAccount(props: ModalAccountProps): JSX.Element {
    const { show, onShow, onHide, vestingOn, setVestingOn } = props;

    return (
        <Fragment>
            <div className="ShowModalAccount">
                {/*<a onClick={onShow}>{truncatedAddress}</a>*/}
                <Modal
                    width={505}
                    open={show}
                    onCancel={onHide}
                    footer={null}
                    closable={false}
                    className="ModalAccount"
                    centered={true}
                    maskStyle={{}}
                >
                    <Account
                        {...props}
                        onCloseModal={onHide}
                        vestingOn={vestingOn}
                        setVestingOn={setVestingOn}
                    />
                </Modal>
            </div>
            <i className="logo-wallet" onClick={onShow}></i>
        </Fragment>
    );
}
