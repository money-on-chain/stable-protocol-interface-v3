import { useEffect } from "react";

import { useRpcErrorHandler } from "./useRpcErrorHandler";

/**
 * Hook that integrates RPC error handling with other hooks that make RPC calls.
 * This should be used in components that make direct RPC calls to ensure errors are properly handled.
 */
export function useRpcErrorIntegration() {
    const { handleRpcError } = useRpcErrorHandler();

    // Catch unhandled promise rejections and global errors that may be RPC-related
    useEffect(() => {
        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            handleRpcError(event.reason);
        };

        const onWindowError = (event: ErrorEvent) => {
            handleRpcError(event.error ?? new Error(event.message));
        };

        window.addEventListener("unhandledrejection", onUnhandledRejection);
        window.addEventListener("error", onWindowError);

        return () => {
            window.removeEventListener(
                "unhandledrejection",
                onUnhandledRejection
            );
            window.removeEventListener("error", onWindowError);
        };
    }, [handleRpcError]);

    return { handleRpcError };
}
