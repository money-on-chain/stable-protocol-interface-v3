import React, { Fragment } from "react";
import Modal from "antd/lib/modal/Modal";
import Providers from "../../Providers";

interface ModalProvidersProps {
    show: boolean;
    onShow: () => void;
    onHide: () => void;
    [key: string]: any; // For any additional props that might be passed
}

export default function ModalProviders(props: ModalProvidersProps): JSX.Element {
    const { show, onShow, onHide } = props;

    return (
        <Fragment>
            <div className="ShowModalProviders">
                {/*<a onClick={onShow}>{truncatedAddress}</a>*/}
                <Modal
                    width={505}
                    open={show}
                    onCancel={onHide}
                    footer={null}
                    closable={false}
                    className="ModalProviders"
                    centered={true}
                    maskStyle={{}}
                >
                    <Providers
                        {...props}
                        onCloseModal={onHide}
                        
                    />
                </Modal>
            </div>
            <i className="logo-wallet" onClick={onShow}></i>
        </Fragment>
    );
} 