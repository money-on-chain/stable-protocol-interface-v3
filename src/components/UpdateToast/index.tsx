// src/UpdateToast.tsx
import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export default function UpdateToast() {
    const [show, setShow] = useState(false);
    const { updateServiceWorker } = useRegisterSW({
        onNeedRefresh() {
            setShow(true);
        },
    });
    if (!show) return null;
    return (
        <div
            style={{
                position: "fixed",
                right: 16,
                bottom: 16,
                padding: 12,
                background: "#141a2e",
                color: "#fff",
                borderRadius: 12,
            }}
        >
            New version available. Click the button below to update the app.
            <button
                style={{ marginLeft: 8 }}
                onClick={() => void updateServiceWorker(true)}
            >
                Update
            </button>
        </div>
    );
}
