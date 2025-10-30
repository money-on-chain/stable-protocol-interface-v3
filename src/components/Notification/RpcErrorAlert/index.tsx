import "./Styles.scss";

import { Alert } from "antd";
import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";

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

    // Debug logging
    console.warn("🔍 RpcErrorAlert rendering with error:", error);

    return (
        <Alert
            className="alert alert-error alert-rpc-error"
            message={
                t("notification.rpcError.title") || "Network Connection Error"
            }
            description={
                <div className="rpc-error-description">
                    <div className="rpc-error-description-texts">
                        <div className="rpc-error-text">
                            {t("notification.rpcError.description") ||
                                "Unable to connect to the blockchain network. This may be due to network congestion or RPC server issues. The system will automatically retry, or you can try again manually."}
                        </div>
                        <div className="rpc-error-text">
                            The system will automatically detect when your
                            connection is restored.
                        </div>
                        {error && (
                            <div className="rpc-error-text">
                                Error: {error.errorMessage}
                            </div>
                        )}
                    </div>
                    <div className="rpc-error-actions">
                        {onRetry && (
                            <button
                                className="button button--small"
                                type="primary"
                                size="small"
                                loading={isRetrying}
                                onClick={onRetry}
                            >
                                {t("notification.rpcError.retry") ||
                                    "Retry Connection"}
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                className="button button--small"
                                size="small"
                                onClick={onDismiss}
                            >
                                {t("notification.rpcError.dismiss") ||
                                    "Dismiss"}
                            </button>
                        )}
                    </div>
                </div>
            }
            type="error"
            showIcon
            // closable={!!onDismiss}
            onClose={onDismiss}
        />
    );
}
