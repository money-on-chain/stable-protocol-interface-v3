import settings from "../settings";
import type { TokenConfig } from "../types/hooks";
import type {
    ContractProtocolStatusResult,
    UserBalanceResult,
} from "../types/status";
import { ConvertAmount } from "./currencies";
import { normalizeToBigInt } from "./precision";

export function getPortfolioTokenUsdBalance(
    contractProtocolStatus: ContractProtocolStatusResult,
    token: Pick<TokenConfig, "type" | "key" | "peggedUSD">,
    balance: bigint
): bigint {
    switch (token.type) {
        case "COINBASE":
            return ConvertAmount(
                contractProtocolStatus,
                "COINBASE",
                "USD",
                balance,
                0
            );
        case "CA":
        case "TC":
        case "TF":
            return ConvertAmount(
                contractProtocolStatus,
                token.type,
                "USD",
                balance,
                token.key || 0
            );
        case "TP":
            return token.peggedUSD
                ? balance
                : ConvertAmount(
                      contractProtocolStatus,
                      `TP_${token.key || 0}`,
                      "USD",
                      balance,
                      0
                  );
        default:
            return 0n;
    }
}

export function getPortfolioTotalUsd(
    contractProtocolStatus: ContractProtocolStatusResult,
    userBalance: UserBalanceResult,
    userBaseCoinBalance?: { balance?: bigint | string | number | null }
): bigint {
    if (
        !contractProtocolStatus.data ||
        !userBalance.data ||
        userBaseCoinBalance?.balance == null
    ) {
        return 0n;
    }

    let totalUSD = 0n;
    const tfTokenNames = new Set<string>();
    const portfolioTable = settings.portfolio_table;

    Object.entries(settings.tokens).forEach(([type, tokens]) => {
        (tokens as TokenConfig[]).forEach((baseToken, index) => {
            const tokenKey = baseToken.key !== undefined ? baseToken.key : index;

            if (portfolioTable) {
                const typeKeyEntry = `${type}_${tokenKey}`;
                if (!portfolioTable.includes(type) && !portfolioTable.includes(typeKeyEntry)) return;
            }

            const token: TokenConfig = {
                ...baseToken,
                type,
                key: tokenKey,
            };

            if (type === "TF") {
                if (tfTokenNames.has(token.name)) return;
                tfTokenNames.add(token.name);
            }

            let balance = 0n;

            switch (token.type) {
                case "COINBASE":
                    balance = BigInt(userBaseCoinBalance.balance || 0);
                    break;
                case "CA":
                    if (
                        !token.collateralType ||
                        token.collateralType === "coinbase"
                    ) {
                        return;
                    }
                    balance =
                        normalizeToBigInt(
                            userBalance.data?.CA?.[token.key || 0]?.balance
                        ) || 0n;
                    break;
                case "TP":
                    balance =
                        normalizeToBigInt(
                            userBalance.data?.TP?.[0]?.[token.key || 0]
                                ?.balance
                        ) || 0n;
                    break;
                case "TC":
                    balance =
                        normalizeToBigInt(
                            userBalance.data?.[token.key || 0]?.TC?.balance
                        ) || 0n;
                    break;
                case "TF":
                    balance =
                        normalizeToBigInt(
                            userBalance.data?.[token.key || 0]?.FeeToken
                                ?.balance
                        ) || 0n;
                    break;
                default:
                    return;
            }

            totalUSD += getPortfolioTokenUsdBalance(
                contractProtocolStatus,
                token,
                balance
            );
        });
    });

    return totalUSD;
}
