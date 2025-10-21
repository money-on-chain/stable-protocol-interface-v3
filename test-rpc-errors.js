// RPC Error Testing Utility
// Run this in your browser console to test different error scenarios

const testRpcErrors = {
    // Test CORS error (most common)
    testCorsError: () => {
        console.error(
            "Access to fetch at 'https://public-node.testnet.rsk.co/' from origin 'http://localhost:4173' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status."
        );
    },

    // Test network error
    testNetworkError: () => {
        console.error("Network error - unable to connect to server");
    },

    // Test timeout error
    testTimeoutError: () => {
        console.error("Request timeout - network connection is slow");
    },

    // Test connection refused
    testConnectionRefused: () => {
        console.error("Connection refused - ECONNREFUSED");
    },

    // Test DNS error
    testDnsError: () => {
        console.error("ENOTFOUND - unable to resolve hostname");
    },

    // Test all errors at once
    testAllErrors: () => {
        console.warn("Testing all RPC error types...");
        setTimeout(() => testRpcErrors.testCorsError(), 100);
        setTimeout(() => testRpcErrors.testNetworkError(), 200);
        setTimeout(() => testRpcErrors.testTimeoutError(), 300);
        setTimeout(() => testRpcErrors.testConnectionRefused(), 400);
        setTimeout(() => testRpcErrors.testDnsError(), 500);
    },

    // Direct test - bypass console interception
    testDirect: () => {
        console.warn("🧪 Testing direct RPC error...");
        // This will trigger the error handler directly
        const error = new Error(
            "Access to fetch at 'https://public-node.testnet.rsk.co/' from origin 'http://localhost:4173' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status."
        );

        // Try to find the error handler in the global scope
        if (
            window.React &&
            window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
        ) {
            console.warn(
                "React found, but we need to access the error handler differently"
            );
        }

        // Just trigger console.error which should be intercepted
        console.error(error);
    },
};

// Make it available globally
window.testRpcErrors = testRpcErrors;

console.warn("🚀 RPC Error Testing Utility loaded!");
console.warn("Available tests:");
console.warn("- testRpcErrors.testCorsError()");
console.warn("- testRpcErrors.testNetworkError()");
console.warn("- testRpcErrors.testTimeoutError()");
console.warn("- testRpcErrors.testConnectionRefused()");
console.warn("- testRpcErrors.testDnsError()");
console.warn("- testRpcErrors.testAllErrors()");
console.warn("- testRpcErrors.testDirect()");
console.warn("");
console.warn("Example: testRpcErrors.testCorsError()");
console.warn("Direct test: testRpcErrors.testDirect()");
