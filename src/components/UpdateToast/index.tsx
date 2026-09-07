import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useProjectTranslation } from "../../helpers/translations";
import { AppNotification } from "../Notifications";

// registerType is "prompt": without an explicit re-check, a tab that stays open
// only discovers a new deployment on a full reload. Poll sw.js so the update
// toast appears on its own; this never reloads the page — the user still clicks
// "update".
const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

export default function UpdateToast() {
    const { t } = useProjectTranslation();
    const [show, setShow] = useState(false);
    const { updateServiceWorker } = useRegisterSW({
        onNeedRefresh() {
            setShow(true);
        },
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
            setInterval(() => {
                if (!navigator.onLine) return;
                void registration.update().catch(() => undefined);
            }, UPDATE_CHECK_INTERVAL_MS);
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
