import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useProjectTranslation } from "../../helpers/translations";
import { AppNotification } from "../Notifications";

export default function UpdateToast() {
    const { t } = useProjectTranslation();
    const [show, setShow] = useState(false);
    const { updateServiceWorker } = useRegisterSW({
        onNeedRefresh() {
            setShow(true);
        },
    });

    if (!show) return null;

    return (
        <AppNotification
            deliveryMode="center"
            type="info"
            title={t("notification.update.title")}
            content={t("notification.update.content")}
            actions={[
                {
                    key: "update",
                    label: t("notification.update.update"),
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
