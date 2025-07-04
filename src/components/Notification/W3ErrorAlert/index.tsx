import React from "react";
import { Alert } from "antd";
import "./Styles.scss";

export default function W3ErrorAlert(): React.ReactElement {
    return (
        <Alert
            className="alert alert-error"
            message="Web3 connection Error!"
            description={
                <div>
                    There is a problem connecting to the blockchain, please
                    review the internet connection.
                </div>
            }
            type="error"
            showIcon
            // closable
        />
    );
}
