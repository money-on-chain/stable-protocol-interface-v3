# RPC Error Handling

This document explains the RPC error handling system implemented to gracefully handle CORS and network errors from RPC nodes.

## Problem Solved

Previously, when the RSK testnet RPC node blocked requests with CORS errors, users would see a white screen with no feedback. The new system provides:

1. **Automatic fallback** to multiple RPC endpoints
2. **User-friendly error messages** instead of white screens
3. **Automatic retry** with exponential backoff
4. **Manual retry** option for users

## Components

### 1. Enhanced Wagmi Configuration (`src/wagmiConfig.ts`)

- **Environment-based RPC endpoints** for dApp configuration
- **Wallet connector integration** - connectors provide their own RPC endpoints
- **Retry configuration** with 3 attempts and 1-second delay
- **Fallback transport** for custom endpoints when available

```typescript
// dApp approach: Only use environment variables
// Wallet connectors (MetaMask, WalletConnect, etc.) provide their own RPC
[
    env("REACT_APP_RSK_TESTNET_RPC"), // Custom endpoint (optional)
    // Wallet connectors will provide additional endpoints
];
```

### 2. RPC Error Handler Hook (`src/hooks/useRpcErrorHandler.ts`)

- **Detects RPC errors** (CORS, network, timeout)
- **Provides retry functionality** with exponential backoff
- **Tracks error state** and retry attempts
- **Health checking** for RPC connectivity

### 3. RPC Error Alert Component (`src/components/Notification/RpcErrorAlert/`)

- **User-friendly error display** with clear messaging
- **Retry button** for manual connection attempts
- **Dismiss option** to hide the alert
- **Loading state** during retry attempts

### 4. Global Error Integration (`src/hooks/useRpcErrorIntegration.ts`)

- **Catches unhandled RPC errors** from console
- **Automatically triggers** error handling
- **Integrates with** existing error patterns

## Usage

### For Users

When an RPC error occurs:

1. **Automatic retry**: The system automatically retries with different endpoints
2. **Error notification**: A red alert appears at the top of the page
3. **Manual retry**: Users can click "Retry Connection" to try again
4. **Dismiss**: Users can dismiss the alert if needed

### For Developers

The error handling is automatically integrated into the Wallet context:

```typescript
const { rpcError, retryConnection, clearRpcError, isRpcHealthy } =
    useWalletContext();

// Check if there's an RPC error
if (rpcError.hasError) {
    console.log("RPC Error:", rpcError.errorMessage);
}

// Manually retry connection
await retryConnection();

// Clear error state
clearRpcError();
```

## Error Types Handled

- **CORS errors**: "blocked by CORS policy"
- **Network errors**: "fetch failed", "network error"
- **Timeout errors**: "request timeout"
- **Connection errors**: "connection refused", "ECONNRESET"
- **DNS errors**: "ENOTFOUND"

## Configuration

### Environment Variables

Set custom RPC endpoints in your environment:

```bash
# RSK Testnet
REACT_APP_RSK_TESTNET_RPC=https://your-custom-rpc-endpoint.com

# RSK Mainnet
REACT_APP_RSK_MAINNET_RPC=https://your-custom-rpc-endpoint.com

# Local development
REACT_APP_RSK_LOCALHOST_RPC=http://localhost:8545
```

### Retry Configuration

Modify retry behavior in `useRpcErrorHandler.ts`:

```typescript
const MAX_RETRY_ATTEMPTS = 3; // Maximum retry attempts
const RETRY_DELAY = 2000; // Base delay in milliseconds
```

## Testing

To test the error handling:

1. **Block RPC requests** in browser dev tools
2. **Disconnect internet** temporarily
3. **Use invalid RPC endpoints** in environment variables
4. **Simulate CORS errors** by modifying network requests

## Benefits

1. **Better UX**: No more white screens on RPC errors
2. **Higher reliability**: Multiple fallback endpoints
3. **Automatic recovery**: System tries to reconnect automatically
4. **User control**: Manual retry and dismiss options
5. **Clear feedback**: User-friendly error messages

## Future Improvements

- **Endpoint health monitoring**: Track which endpoints are working
- **Smart endpoint selection**: Choose fastest/healthiest endpoints
- **Offline mode**: Graceful degradation when all endpoints fail
- **Analytics**: Track RPC error patterns for optimization
