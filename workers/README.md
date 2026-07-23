# Cloudflare Workers — IPFS Proxy

Each worker sits in front of a Pinata IPFS gateway and serves the latest dapp build by reading the current CID from a KV namespace. This avoids exposing raw `/ipfs/<CID>` URLs to users and enables clean domain-based deployments.

## How it works

1. A GitHub Actions workflow builds the dapp, pins it to IPFS via Pinata, and writes the resulting CID to a Cloudflare KV namespace.
2. The worker reads `current_cid` from KV on every request and proxies the content from the Pinata gateway.
3. SPA routing is handled automatically: unknown paths fall back to `index.html`.

## Environments

| Env | Worker name | Domain |
|-----|-------------|--------|
| `roc` | dapp-proxy-roc | dapp.rifonchain.com |
| `roc-testnet` | dapp-proxy-roc-testnet | dapp-testnet.rifonchain.com |
| `flipmoney` | dapp-proxy-flipmoney | dapp.flipmoney.io |
| `flipmoney-testnet` | dapp-proxy-flipmoney-testnet | dapp-testnet.flipmoney.io |
| `moc` | dapp-proxy-moc | manage.moneyonchain.com |
| `moc-testnet` | dapp-proxy-moc-testnet | manage-testnet.moneyonchain.com |

## Prerequisites

- Node.js v22+
- Wrangler: `corepack pnpm dlx wrangler login`

## Deploy

```bash
# Deploy a single environment
corepack pnpm dlx wrangler deploy --env roc
corepack pnpm dlx wrangler deploy --env roc-testnet
corepack pnpm dlx wrangler deploy --env flipmoney
corepack pnpm dlx wrangler deploy --env flipmoney-testnet
corepack pnpm dlx wrangler deploy --env moc
corepack pnpm dlx wrangler deploy --env moc-testnet

# Deploy all at once
for env in roc roc-testnet flipmoney flipmoney-testnet moc moc-testnet; do
  corepack pnpm dlx wrangler deploy --env $env
done
```

## GitHub Actions secrets required

| Secret | Description |
|--------|-------------|
| `CF_ACCOUNT_ID` | Cloudflare account ID |
| `CF_API_TOKEN` | API token with **Workers KV Storage:Edit** permission |
| `CF_KV_NAMESPACE_ID_ROC` | KV namespace ID for roc mainnet |
| `CF_KV_NAMESPACE_ID_ROC_TESTNET` | KV namespace ID for roc testnet |
| `CF_KV_NAMESPACE_ID_FLIPMONEY` | KV namespace ID for flipmoney mainnet |
| `CF_KV_NAMESPACE_ID_FLIPMONEY_TESTNET` | KV namespace ID for flipmoney testnet |
| `CF_KV_NAMESPACE_ID_MOC` | KV namespace ID for moc mainnet |
| `CF_KV_NAMESPACE_ID_MOC_TESTNET` | KV namespace ID for moc testnet |

## Creating new KV namespaces (first-time setup)

```bash
corepack pnpm dlx wrangler kv namespace create DAPP_KV --env roc
corepack pnpm dlx wrangler kv namespace create DAPP_KV --env roc-testnet
corepack pnpm dlx wrangler kv namespace create DAPP_KV --env flipmoney
corepack pnpm dlx wrangler kv namespace create DAPP_KV --env flipmoney-testnet
corepack pnpm dlx wrangler kv namespace create DAPP_KV --env moc
corepack pnpm dlx wrangler kv namespace create DAPP_KV --env moc-testnet
```

Copy the returned IDs into `wrangler.toml` and add them as GitHub secrets.
