import Modal from "antd/lib/modal/Modal";
import React, { Fragment, useEffect } from "react";

import Providers from "../../Providers";

interface ModalProvidersProps {
    show: boolean;
    onShow: () => void;
    onHide: () => void;
    [key: string]: unknown; // For any additional props that might be passed
}

export default function ModalProviders(
    props: ModalProvidersProps
): JSX.Element {
    const { show, onShow, onHide } = props;

    useEffect(() => {
        if (show) {
            // prevent scroll on body
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [show]);

    return (
        <Fragment>
            <div className="ShowModalProviders">
                <Modal
                    width={505}
                    open={show}
                    onCancel={onHide}
                    footer={null}
                    closable={false}
                    className="ModalProviders"
                    centered={true}
                    maskStyle={{}}
                    maskClosable={false}
                    keyboard={false}
                    //zIndex={1300}
                >
                    <Providers {...props} onCloseModal={onHide} />
                </Modal>
            </div>
            <i className="logo-wallet" onClick={onShow}></i>
        </Fragment>
    );
}
