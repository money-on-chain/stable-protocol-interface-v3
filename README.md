# Stable Protocol Interface v3 (Multicollateral)

### Warning: This is only for version 3 of the main contracts.

| Project              | Version | V3  |
| -------------------- | ------- | --- |
| MOC (Money on Chain) | V1      | ❌  |
| ROC (RIF on Chain)   | V3      | ✅  |

Stable Protocol Interface v3 is a web interface for the Money on Chain Stable Protocol v3, running on the Rootstock (RSK) blockchain. It allows users to mint and redeem pegged stablecoins (TP tokens) and collateral tokens (TC tokens) backed by crypto collateral, supporting multiple projects with different fiat pegs (ARS, COP, USD, and others). Users can also swap between token types, view their portfolio balances, participate in governance voting and staking via the Govern token, and review transaction history. Wallet connectivity is handled via wagmi/viem, supporting Coinbase Wallet, WalletConnect, and injected providers.

### Releases

Each release gets deployed to IPFS automatically.

Please go to release section, there are several links to [releases](https://github.com/money-on-chain/stable-protocol-interface-v3/releases)

Also you can access with this primary gateways, always point to the latest release

| Project            | Main Gateway                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| ROC Testnet        | [https://dapp-testnet.rifonchain.com](https://dapp-testnet.rifonchain.com) |
| ROC Mainnet        | [https://dapp.rifonchain.com](https://dapp.rifonchain.com)                 |
| MOC Manage Mainnet | [https://manage.moneyonchain.com](https://manage.moneyonchain.com)         |
| MOC Manage Testnet | [https://manage-testnet.moneyonchain.com](https://manage-testnet.moneyonchain.com)         |

## DEVELOP

### Setup: Running develop

Install nodejs

`nvm use`

Install packages

`npm install`

Run

`npm run start:roc-testnet`

or

`npm run start:<environment>`

**Note:** Start the environment you want to run ex. **"start:roc-testnet"** to start environment ROC Testnet

### Faucets

In testnet you may need some test RBTC

- **Faucet tRBTC**: https://faucet.rsk.co/
