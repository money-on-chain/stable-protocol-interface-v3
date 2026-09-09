import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useProjectTranslation } from "../../helpers/translations";
import { AppNotification } from "../Notifications";

// registerType is "prompt", so the browser only discovers a new deployment on a
// full navigation — a tab left open for hours never notices. Re-check on an
// interval and whenever the tab regains focus. This only surfaces the prompt;
// the page still reloads only when the user clicks "update".
const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

export default function UpdateToast() {
    const { t } = useProjectTranslation();
    const [show, setShow] = useState(false);
    const registrationRef = useRef<ServiceWorkerRegistration | undefined>(
        undefined
    );

    const { updateServiceWorker } = useRegisterSW({
        onNeedRefresh() {
            setShow(true);
        },
        onRegisteredSW(_swUrl, registration) {
            registrationRef.current = registration;
        },
    });

    useEffect(() => {
        const check = () => {
            if (!navigator.onLine) return;
            void registrationRef.current?.update().catch(() => undefined);
        };
        const onVisible = () => {
            if (document.visibilityState === "visible") check();
        };
        const interval = window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", check);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", check);
        };
    }, []);

    if (!show) return null;

    return (
        <AppNotification
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
