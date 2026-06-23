import "./Styles.scss";

import { AppNotification } from "../../Notifications";
import React from "react";

export default function W3ErrorAlert(): React.ReactElement {
    return (
        <AppNotification
            type="error"
            title="Web3 connection Error!"
            content={
                <div>
                    There is a problem connecting to the blockchain, please
                    review the internet connection.
                </div>
            }
            notificationId="w3-error-alert"
            lingerMs={4000}
        />
    );
}
