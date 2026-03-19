import { useCallback, useEffect, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

interface RpcErrorState {
    hasError: boolean;
    errorMessage: string;
    isRetrying: boolean;
    retryCount: number;
}

interface UseRpcErrorHandlerReturn {
    rpcError: RpcErrorState;
    handleRpcError: (error: unknown) => void;
    retryConnection: () => Promise<void>;
    clearError: () => void;
    isRpcHealthy: boolean;
    checkConnectivityNow: () => void;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

export function useRpcErrorHandler(): UseRpcErrorHandlerReturn {
    const publicClient = usePublicClient();
    const walletClient = useWalletClient();

    const [rpcError, setRpcError] = useState<RpcErrorState>({
        hasError: false,
        errorMessage: "",
        isRetrying: false,
        retryCount: 0,
    });

    const [isRpcHealthy, setIsRpcHealthy] = useState(true);

    const isRpcError = useCallback((error: unknown): boolean => {
        if (!error) return false;

        const errorString =
            error instanceof Error ? error.message : JSON.stringify(error);
        const errorMessage =
            error instanceof Error
                ? error.message.toLowerCase()
                : errorString.toLowerCase();

        // Check for common RPC error patterns
        const rpcErrorPatterns = [
            "cors",
            "network error",
            "fetch failed",
            "connection refused",
            "timeout",
            "rpc error",
            "blocked by cors policy",
            "preflight request",
            "access control check",
            "http ok status",
            "failed to fetch",
            "network request failed",
            "connection reset",
            "econnreset",
            "enotfound",
            "etimedout",
            "unable to connect to",
            "err_name_not_resolved",
            "net::err_name_not_resolved",
            "name not resolved",
            "dns resolution failed",
            "no internet connection",
            "network unreachable",
            "forced error", // Add this for testing
        ];

        const isMatch = rpcErrorPatterns.some(
            (pattern) =>
                errorMessage.includes(pattern) || errorString.includes(pattern)
        );

        return isMatch;
    }, []);

    const getErrorMessage = useCallback((error: unknown): string => {
        if (!error) return "Unknown RPC error";

        const errorString =
            error instanceof Error ? error.message : JSON.stringify(error);
        const errorMessage =
            error instanceof Error ? error.message : errorString;

        // Provide user-friendly error messages
        if (errorMessage.toLowerCase().includes("cors")) {
            return "Network connection blocked. The RPC server is temporarily unavailable.";
        }

        if (errorMessage.toLowerCase().includes("timeout")) {
            return "Request timed out. The network is slow or unresponsive.";
        }

        if (errorMessage.toLowerCase().includes("network error")) {
            return "Network error. Please check your internet connection.";
        }

        if (errorMessage.toLowerCase().includes("fetch failed")) {
            return "Failed to connect to the blockchain network.";
        }

        return `RPC Error: ${errorMessage}`;
    }, []);

    const handleRpcError = useCallback(
        (error: unknown) => {
            if (!isRpcError(error)) {
                return;
            }

            // Check if this is a test error (don't auto-retry)
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            const isTestError = errorMessage
                .toLowerCase()
                .includes("forced error");

            setRpcError((prev) => ({
                hasError: true,
                errorMessage: getErrorMessage(error),
                isRetrying: false,
                retryCount: isTestError ? 999 : prev.retryCount, // Set high retry count for test errors
            }));

            setIsRpcHealthy(false);
        },
        [isRpcError, getErrorMessage]
    );

    const retryConnection = useCallback(async (): Promise<void> => {
        if (!publicClient || rpcError.isRetrying) return;

        setRpcError((prev) => ({
            ...prev,
            isRetrying: true,
        }));

        try {
            // Test the connection by making a simple call
            await publicClient.getBlockNumber();

            // If successful, clear the error
            setRpcError({
                hasError: false,
                errorMessage: "",
                isRetrying: false,
                retryCount: 0,
            });

            setIsRpcHealthy(true);
        } catch (error) {
            console.warn("Retry attempt failed:", error);

            // Check if it's a network error (no internet)
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            const isNetworkError =
                errorMessage.toLowerCase().includes("network") ||
                errorMessage.toLowerCase().includes("fetch") ||
                errorMessage.toLowerCase().includes("connection");

            setRpcError((prev) => ({
                hasError: true,
                errorMessage: isNetworkError
                    ? "No internet connection detected"
                    : getErrorMessage(error),
                isRetrying: false,
                retryCount: prev.retryCount + 1,
            }));
        }
    }, [publicClient, rpcError.isRetrying, getErrorMessage]);

    const clearError = useCallback(() => {
        setRpcError({
            hasError: false,
            errorMessage: "",
            isRetrying: false,
            retryCount: 0,
        });
        setIsRpcHealthy(true);
    }, []);

    // Immediate connectivity check function
    const checkConnectivityNow = useCallback(() => {
        if (!navigator.onLine && !rpcError.hasError) {
            handleRpcError(new Error("No internet connection detected"));
        }
    }, [handleRpcError, rpcError.hasError]);

    // Auto-retry logic
    useEffect(() => {
        if (
            rpcError.hasError &&
            !rpcError.isRetrying &&
            rpcError.retryCount < MAX_RETRY_ATTEMPTS
        ) {
            const timer = setTimeout(
                () => {
                    void retryConnection();
                },
                RETRY_DELAY * (rpcError.retryCount + 1)
            ); // Exponential backoff

            return () => clearTimeout(timer);
        }
    }, [
        rpcError.hasError,
        rpcError.isRetrying,
        rpcError.retryCount,
        retryConnection,
    ]);

    // Listen for online/offline events
    useEffect(() => {
        const handleOnline = () => {
            if (rpcError.hasError) {
                // Try to reconnect when internet comes back
                setTimeout(() => {
                    void retryConnection();
                }, 1000);
            }
        };

        const handleOffline = () => {
            // Immediately surface an RPC error so the alert is shown while offline
            handleRpcError(new Error("No internet connection detected"));
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // If already offline when this hook mounts, trigger the error immediately
        if (!navigator.onLine && !rpcError.hasError) {
            handleOffline();
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [rpcError.hasError, retryConnection, handleRpcError]);

    // Health check on mount and when client changes
    useEffect(() => {
        if (!publicClient) return;

        let aborted = false;

        const healthCheck = async () => {
            try {
                await publicClient.getBlockNumber();
                if (aborted) return;
                setIsRpcHealthy(true);
                if (rpcError.hasError) {
                    // Don't clear test errors
                    const isTestError = rpcError.errorMessage
                        .toLowerCase()
                        .includes("forced error");
                    if (!isTestError) {
                        clearError();
                    }
                }
            } catch (error) {
                if (!aborted) handleRpcError(error);
            }
        };

        void healthCheck();

        // If there's an error, check more frequently
        if (rpcError.hasError) {
            const healthCheckInterval = setInterval(() => {
                void (async () => {
                    try {
                        await publicClient.getBlockNumber();
                        if (aborted) return;
                        clearError();
                        clearInterval(healthCheckInterval);
                    } catch (error) {
                        // Still failing, continue checking
                    }
                })();
            }, 3000); // Check every 3 seconds when there's an error

            return () => {
                aborted = true;
                clearInterval(healthCheckInterval);
            };
        }

        return () => { aborted = true; };
    }, [
        publicClient,
        rpcError.hasError,
        rpcError.errorMessage,
        handleRpcError,
        clearError,
    ]);

    // Lightweight periodic RPC heartbeat even when healthy
    useEffect(() => {
        if (!publicClient) return;
        // When healthy, probe the RPC at a low frequency to catch targeted blocking
        if (!rpcError.hasError) {
            let aborted = false;
            const interval = setInterval(() => {
                void (async () => {
                    try {
                        await publicClient.getBlockNumber();
                        // stays healthy
                    } catch (error) {
                        if (!aborted) handleRpcError(error);
                    }
                })();
            }, 15000); // every 15s when healthy
            return () => {
                aborted = true;
                clearInterval(interval);
            };
        }
    }, [publicClient, rpcError.hasError, handleRpcError]);

    // Network connectivity monitoring
    useEffect(() => {
        let aborted = false;

        const handleOnline = () => {
            // Try to clear error immediately
            clearError();

            // Also try to test RPC connection after a short delay
            setTimeout(() => {
                void (async () => {
                    if (aborted || !publicClient || !rpcError.hasError) return;
                    try {
                        await publicClient.getBlockNumber();
                        if (!aborted) clearError();
                    } catch (error) {
                    }
                })();
            }, 1000);
        };

        const handleOffline = () => {
            handleRpcError(new Error("No internet connection detected"));
        };

        // Listen for network status changes
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Also check navigator.onLine status on mount
        if (!navigator.onLine && !rpcError.hasError) {
            handleRpcError(new Error("No internet connection detected"));
        }

        return () => {
            aborted = true;
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [publicClient, handleRpcError, clearError, rpcError.hasError]);

    // Periodic connectivity check (fallback for unreliable navigator.onLine)
    useEffect(() => {
        if (!publicClient) return;

        const controller = new AbortController();

        const checkConnectivity = () => {
            void (async () => {
                // Try multiple reliable endpoints
                const endpoints = [
                    "https://www.google.com/favicon.ico",
                    "https://httpbin.org/status/200",
                    "https://jsonplaceholder.typicode.com/posts/1",
                ];

                let connected = false;
                for (const endpoint of endpoints) {
                    try {
                        await fetch(endpoint, {
                            method: "HEAD",
                            mode: "no-cors",
                            cache: "no-cache",
                            signal: AbortSignal.any([
                                controller.signal,
                                AbortSignal.timeout(3000),
                            ]),
                        });
                        connected = true;
                        break;
                    } catch (e) {
                        if (controller.signal.aborted) return;
                        // continue trying other endpoints
                    }
                }

                if (controller.signal.aborted) return;

                if (connected) {
                    if (rpcError.hasError) {
                        clearError();
                    }
                } else {
                    if (!rpcError.hasError) {
                        handleRpcError(
                            new Error("No internet connection detected")
                        );
                    }
                }
            })();
        };

        // Check connectivity more frequently when there's an error
        const checkInterval = rpcError.hasError ? 5000 : 10000; // 5s when error, 10s when healthy
        const interval = setInterval(checkConnectivity, checkInterval);

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [publicClient, handleRpcError, clearError, rpcError.hasError]);

    // User interaction connectivity check
    useEffect(() => {
        const handleUserInteraction = () => {
            // Check connectivity when user interacts with the page
            if (!navigator.onLine && !rpcError.hasError) {
                handleRpcError(new Error("No internet connection detected"));
            }
        };

        // Listen for various user interactions
        const events = ["click", "keydown", "scroll", "touchstart"];
        events.forEach((event) => {
            document.addEventListener(event, handleUserInteraction, {
                once: false,
            });
        });

        return () => {
            events.forEach((event) => {
                document.removeEventListener(event, handleUserInteraction);
            });
        };
    }, [handleRpcError, rpcError.hasError]);

    return {
        rpcError,
        handleRpcError,
        retryConnection,
        clearError,
        isRpcHealthy,
        checkConnectivityNow,
    };
}
