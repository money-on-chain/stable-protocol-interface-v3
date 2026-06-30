import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { AppNotification } from "../Notifications";

export default function UpdateToast() {
    const [show, setShow] = useState(false);
    const { updateServiceWorker } = useRegisterSW({
        onNeedRefresh() {
            setShow(true);
        },
    });

    if (!show) return null;

    return (
        <AppNotification
            type="info"
            title="New version available"
            content="A new version of the app has been deployed."
            actions={[
                {
                    key: "update",
                    label: "Update",
                    type: "primary",
                    onClick: () => void updateServiceWorker(true),
                },
            ]}
            notificationId="pwa-update"
            dismissible
            onDismiss={() => setShow(false)}
        />
    );
}
