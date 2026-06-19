import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import { AppNotification } from "../../Notifications";

interface RpcErrorAlertProps {
    error?: {
        hasError: boolean;
        errorMessage: string;
        retryCount: number;
    };
    onRetry?: () => void;
    onDismiss?: () => void;
    isRetrying?: boolean;
}

export default function RpcErrorAlert({
    error,
    onRetry,
    onDismiss,
    isRetrying = false,
}: RpcErrorAlertProps): React.ReactElement {
    const { t } = useProjectTranslation();

    return (
        <AppNotification
            type="error"
            title={
                t("notification.rpcError.title") || "Network Connection Error"
            }
            content={
                <div className="rpc-error-description">
                    <div className="rpc-error-description-texts">
                        <div className="rpc-error-text">
                            {t("notification.rpcError.description") ||
                                "Unable to connect to the blockchain network. This may be due to network congestion or RPC server issues. The system will automatically retry, or you can try again manually."}
                        </div>

                        <div className="rpc-error-text">
                            <strong>
                                The system will automatically detect when your
                                connection is restored.
                            </strong>
                        </div>

                        {error && (
                            <div className="rpc-error-text">
                                Error: {error.errorMessage}
                            </div>
                        )}
                    </div>
                </div>
            }            
            dismissible={!!onDismiss}
            onDismiss={onDismiss}
            deliveryMode="center"
            notificationId="rpc-error-alert"
            lingerMs={4000}
        />
    );
}
