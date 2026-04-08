import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount } from "../../../helpers/currencies";
import { normalizeToBigInt } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import type { TokenConfig } from "../../../types/hooks";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import PortfolioTable from "../../Tables/PortfolioTable";

export default function Portfolio(): JSX.Element {
    const space: string = "\u00A0";
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatus, userBalance, userBaseCoinBalance } =
        useWalletContext();

    let balance: bigint;
    let balanceUSD: bigint;
    let totalUSD: bigint = 0n;

    // Total tokens
    if (
        contractProtocolStatus.data &&
        userBalance.data &&
        userBaseCoinBalance.balance
    ) {
        for (const dataItem of settings.tokens.CA as TokenConfig[]) {
            if (dataItem.key == null) continue;

            // Check if the required data exists before accessing it
            if (
                !userBalance.data?.CA?.[dataItem.key] ||
                !contractProtocolStatus.data?.[dataItem.key]
            ) {
                continue;
            }

            ////////////////
            // Tokens CA
            ///////////////

            balance =
                normalizeToBigInt(userBalance.data.CA[dataItem.key].balance) ||
                0n;
            balanceUSD = ConvertAmount(
                contractProtocolStatus,
                "CA",
                "USD",
                balance,
                dataItem.key
            );
            totalUSD = totalUSD + balanceUSD;

            /////////////
            // Token TC
            ////////////
            balance =
                normalizeToBigInt(userBalance.data[dataItem.key].TC.balance) ||
                0n;
            balanceUSD = ConvertAmount(
                contractProtocolStatus,
                "TC",
                "USD",
                balance,
                dataItem.key
            );
            totalUSD = totalUSD + balanceUSD;
        }
        ///////////////
        // Tokens TP
        //////////////
        for (const dataItem of settings.tokens.TP as TokenConfig[]) {
            if (dataItem.key == null) continue;

            // Check if the required data exists before accessing it
            if (
                !userBalance.data?.TP?.[0]?.[dataItem.key] ||
                !contractProtocolStatus.data?.[0]?.PP_TP?.[dataItem.key]
            ) {
                continue;
            }

            balance =
                normalizeToBigInt(
                    userBalance.data.TP[0][dataItem.key].balance
                ) || 0n;
            balanceUSD = ConvertAmount(
                contractProtocolStatus,
                "TP",
                "USD",
                balance,
                dataItem.key
            );
            totalUSD = totalUSD + balanceUSD;
        }

        ///////////////
        // Coinbase
        //////////////
        balance = BigInt(userBaseCoinBalance.balance || 0);
        balanceUSD = ConvertAmount(
            contractProtocolStatus,
            "COINBASE",
            "USD",
            balance,
            0
        );
        totalUSD = totalUSD + balanceUSD;

        /////////////////
        // Fee Token (TF) the price provider is expressed in collateral
        ////////////////
        // Check if the required data exists before accessing it
        if (
            userBalance.data?.[0]?.FeeToken &&
            contractProtocolStatus.data?.[0]?.PP_CA &&
            contractProtocolStatus.data?.[0]?.PP_FeeToken
        ) {
            balance =
                normalizeToBigInt(userBalance.data[0].FeeToken.balance) || 0n;
            balanceUSD = ConvertAmount(
                contractProtocolStatus,
                "TF",
                "USD",
                balance,
                0
            );
            totalUSD = totalUSD + balanceUSD;
        }
    }

    return (
        <div className="dashboard-portfolio">
            <div className="tokens-card-content">
                <div className="tokens-list-header">
                    <div className="tokens-list-header-title layout-card-title">
                        <h1>{t("portfolio.sectionTitle")}</h1>
                    </div>
                    <div className="tokens-list-header-balance">
                        <div className="tokens-list-header-balance-number">
                            {PrecisionNumbers({
                                amount: totalUSD,
                                token: settings.tokens.COINBASE[0],
                                decimals: 2,
                                i18n: i18n,
                                compact: true,
                                compactVariant: "significant",
                            })}
                            {space}
                            {t("portfolio.totalCurrency")}
                        </div>
                        <div className="tokens-list-header-balance-title">
                            {t("portfolio.totalBalance")}
                        </div>
                    </div>
                </div>
                <div className="tokens-list-table">
                    <PortfolioTable />
                </div>
            </div>
        </div>
    );
}
