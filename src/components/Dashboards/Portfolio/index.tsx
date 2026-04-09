import { useWalletContext } from "../../../context/Wallet";
import { getPortfolioTotalUsd } from "../../../helpers/portfolio";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import PortfolioTable from "../../Tables/PortfolioTable";

export default function Portfolio(): JSX.Element {
    const space: string = "\u00A0";
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatus, userBalance, userBaseCoinBalance } =
        useWalletContext();
    const totalUSD = getPortfolioTotalUsd(
        contractProtocolStatus,
        userBalance,
        userBaseCoinBalance
    );

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
