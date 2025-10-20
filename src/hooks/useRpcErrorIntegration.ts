import { useEffect } from "react";
import { usePublicClient } from "wagmi";

import { useRpcErrorHandler } from "./useRpcErrorHandler";

/**
 * Hook that integrates RPC error handling with other hooks that make RPC calls.
 * This should be used in components that make direct RPC calls to ensure errors are properly handled.
 */
export function useRpcErrorIntegration() {
    const publicClient = usePublicClient();
    const { handleRpcError } = useRpcErrorHandler();

    // Global error handler for unhandled RPC/network errors
    useEffect(() => {
        const originalConsoleError = console.error;

        const rpcErrorPatterns = [
            'cors',
            'network error',
            'fetch failed',
            'connection refused',
            'timeout',
            'rpc error',
            'blocked by cors policy',
            'preflight request',
            'access control check',
            'http ok status',
            'failed to fetch',
            'network request failed',
            'connection reset',
            'econnreset',
            'enotfound',
            'etimedout',
            'unable to connect to',
            // Additional patterns for devtools request blocking and generic failures
            'blocked',
            'net::err_blocked_by_client',
            'err_blocked_by_client',
            'failed to load resource',
            'typeerror: failed to fetch',
            'err_failed'
        ];

        const checkAndHandle = (raw: unknown) => {
            try {
                const text = String(raw).toLowerCase();
                const match = rpcErrorPatterns.some((p) => text.includes(p));
                if (match) {
                    handleRpcError(raw);
                }
            } catch (_) {
                // ignore
            }
        };

        console.error = (...args) => {
            const errorString = args.join(' ').toLowerCase();
            const isRpcError = rpcErrorPatterns.some(pattern => errorString.includes(pattern));
            if (isRpcError) {
                console.log("🚨 RPC Error detected:", args[0]);
                handleRpcError(args[0]);
            }
            originalConsoleError.apply(console, args);
        };

        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            checkAndHandle(event.reason);
        };

        const onWindowError = (event: ErrorEvent) => {
            checkAndHandle(event.message || event.error);
        };

        window.addEventListener('unhandledrejection', onUnhandledRejection);
        window.addEventListener('error', onWindowError);

        return () => {
            console.error = originalConsoleError;
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
            window.removeEventListener('error', onWindowError);
        };
    }, [handleRpcError]);

    return { handleRpcError };
}

