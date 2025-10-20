import "./Styles.scss";

import { Alert, Button } from "antd";
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
    console.log("🔍 RpcErrorAlert rendering with error:", error);

    return (
        <Alert
            className="alert alert-rpc-error"
            message={t("notification.rpcError.title") || "Network Connection Error"}
            description={
                <div className="rpc-error-description">
                    <p>{t("notification.rpcError.description") || "Unable to connect to the blockchain network. This may be due to network congestion or RPC server issues. The system will automatically retry, or you can try again manually."}</p>
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                        💡 The system will automatically detect when your connection is restored.
                    </p>
                    {error && (
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                            Error: {error.errorMessage}
                        </p>
                    )}
                    <div className="rpc-error-actions">
                        {onRetry && (
                            <Button
                                type="primary"
                                size="small"
                                loading={isRetrying}
                                onClick={onRetry}
                            >
                                {t("notification.rpcError.retry") || "Retry Connection"}
                            </Button>
                        )}
                        {onDismiss && (
                            <Button
                                size="small"
                                onClick={onDismiss}
                                style={{ marginLeft: 8 }}
                            >
                                {t("notification.rpcError.dismiss") || "Dismiss"}
                            </Button>
                        )}
                    </div>
                </div>
            }
            type="error"
            showIcon
            closable={!!onDismiss}
            onClose={onDismiss}
        />
    );
}
