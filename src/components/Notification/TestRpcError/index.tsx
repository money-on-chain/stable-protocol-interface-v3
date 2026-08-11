import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import Button from "../../Button";

export default function TestRpcError(): React.ReactElement {
    const {
        rpcError,
        handleRpcError,
        retryConnection,
        clearRpcError,
        checkConnectivityNow,
    } = useWalletContext();

    const testCorsError = () => {
        console.warn("🧪 Testing CORS error...");
        const corsError = new Error(
            "Access to fetch at 'https://public-node.testnet.rsk.co/' from origin 'http://localhost:4173' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status."
        );
        handleRpcError(corsError);
    };

    const testNetworkError = () => {
        console.warn("🧪 Testing network error...");
        const networkError = new Error(
            "Network error - unable to connect to server"
        );
        handleRpcError(networkError);
    };

    const testTimeoutError = () => {
        console.warn("🧪 Testing timeout error...");
        const timeoutError = new Error(
            "Request timeout - network connection is slow"
        );
        handleRpcError(timeoutError);
    };

    const testNetworkDisconnection = () => {
        console.warn("🧪 Testing network disconnection...");
        const networkError = new Error("Failed to fetch - network error");
        handleRpcError(networkError);
    };

    const testRealRpcCall = async () => {
        console.warn("🧪 Testing real RPC call failure...");
        try {
            // This will fail if there's no internet
            const response = await fetch(
                "https://public-node.testnet.rsk.co/",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_blockNumber",
                        params: [],
                        id: 1,
                    }),
                }
            );
            console.warn("RPC call succeeded:", response.status);
        } catch (error) {
            console.warn("RPC call failed:", error);
            handleRpcError(error);
        }
    };

    const forceShowAlert = () => {
        console.warn("🧪 Force showing alert...");
        // Directly trigger the error state
        handleRpcError(new Error("FORCED ERROR - This should show the alert"));
    };

    const testConnectivityCheck = () => {
        console.warn("🧪 Testing connectivity check...");
        void checkConnectivityNow();
    };

    return (
        <div
            style={{
                position: "fixed",
                top: "10px",
                right: "10px",
                zIndex: 9999,
                background: "white",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
        >
            <h4>🧪 Test RPC Errors</h4>
            <div
                style={{
                    fontSize: "12px",
                    marginBottom: "8px",
                    color: rpcError.hasError ? "red" : "green",
                }}
            >
                Status: {rpcError.hasError ? "ERROR" : "OK"}
            </div>
            <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
                <Button size="small" onClick={testCorsError}>
                    Test CORS Error
                </Button>
                <Button size="small" onClick={testNetworkError}>
                    Test Network Error
                </Button>
                <Button size="small" onClick={testTimeoutError}>
                    Test Timeout Error
                </Button>
                <Button size="small" onClick={testNetworkDisconnection}>
                    Test Network Disconnect
                </Button>
                <Button size="small" onClick={() => void testRealRpcCall()}>
                    Test Real RPC Call
                </Button>
                <Button
                    size="small"
                    onClick={forceShowAlert}
                    style={{ background: "orange", color: "white" }}
                >
                    FORCE SHOW ALERT
                </Button>
                <Button
                    size="small"
                    onClick={testConnectivityCheck}
                    style={{ background: "blue", color: "white" }}
                >
                    Check Connectivity
                </Button>
                <Button
                    size="small"
                    onClick={clearRpcError}
                    disabled={!rpcError.hasError}
                >
                    Clear Error
                </Button>
            </div>
        </div>
    );
}
