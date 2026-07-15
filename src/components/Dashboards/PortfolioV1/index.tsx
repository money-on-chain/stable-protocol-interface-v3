import { useWalletContext } from "../../../context/Wallet";
import { getPortfolioTotalUsdV1 } from "../../../helpers/portfolioV1";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import PortfolioTableV1 from "../../Tables/PortfolioTableV1";

export default function PortfolioV1(): JSX.Element {
    const space: string = " ";
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1, userBalanceV1, userBaseCoinBalance } =
        useWalletContext();
    const totalUSD = getPortfolioTotalUsdV1(
        contractProtocolStatusV1,
        userBalanceV1,
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
                    <PortfolioTableV1 />
                </div>
            </div>
        </div>
    );
}
