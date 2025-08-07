import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";

import { PrecisionNumbers } from "../../PrecisionNumbers";
import PortfolioTable from "../../Tables/PortfolioTable";
import { useWalletContext } from "../../../context/Wallet";
import { mulPrecision, divPrecision, normalizeToBigInt } from "../../../helpers/precision";


export default function Portfolio(): JSX.Element {
    const space: string = "\u00A0";
    const { t, i18n } = useProjectTranslation();    
    const { contractProtocolStatus, userBalance, userBaseCoinBalance } = useWalletContext()

    let balance: bigint;
    let price: bigint;
    let balanceUSD: bigint;
    let totalUSD: bigint = 0n;
    

    // Total tokens
    if (contractProtocolStatus.data &&
        userBalance.data && 
        userBaseCoinBalance.balance ) {

        (settings.tokens.CA).forEach(function (dataItem: any) {

            ////////////////
            // Tokens CA
            ///////////////           

            balance = userBalance.data.CA[dataItem.key].balance;
            price = normalizeToBigInt(contractProtocolStatus.data[dataItem.key].PP_CA[0]) || 0n;
            
            balanceUSD = mulPrecision(balance, price);
            totalUSD = totalUSD + balanceUSD;
            
            /////////////
            // Token TC
            ////////////
            balance = userBalance.data[dataItem.key].TC.balance;
            const priceTEC: bigint = contractProtocolStatus.data[dataItem.key].getPTCac;
            const priceCA: bigint = normalizeToBigInt(contractProtocolStatus.data[dataItem.key].PP_CA[0]) || 0n;
            
            if (contractProtocolStatus.data.canOperate) {
                price = mulPrecision(priceTEC, priceCA);
                balanceUSD = mulPrecision(balance, price);
                totalUSD = totalUSD + balanceUSD;
            }

        });
        ///////////////
        // Tokens TP
        //////////////
        (settings.tokens.TP).forEach(function (dataItem: any) {
            balance = userBalance.data.TP[0][dataItem.key].balance;
            price = dataItem.peggedUSD
                ? 1n
                : normalizeToBigInt(contractProtocolStatus.data[0].PP_TP[dataItem.key][0]) || 0n;
            balanceUSD = divPrecision(balance, price);
            totalUSD = totalUSD + balanceUSD;
        });

        ///////////////
        // Coinbase
        //////////////
        balance = userBaseCoinBalance.balance || 0n;
        price = normalizeToBigInt(contractProtocolStatus.data.PP_COINBASE[0]) || 0n;        
        balanceUSD = mulPrecision(balance, price);
        totalUSD = totalUSD + balanceUSD;

        /////////////////
        // Fee Token (TF) the price provider is expressed in collateral
        ////////////////
        balance = userBalance.data[0].FeeToken.balance;
        const priceCA_0: bigint = normalizeToBigInt(contractProtocolStatus.data[0].PP_CA[0]) || 0n;
        const priceInCA: bigint = normalizeToBigInt(contractProtocolStatus.data[0].PP_FeeToken[0]) || 0n;
        balanceUSD = mulPrecision(mulPrecision(balance, priceInCA), priceCA_0);
        totalUSD = totalUSD + balanceUSD;
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
                            {contractProtocolStatus.data &&
                            !contractProtocolStatus.data.canOperate
                                ? "--"
                                : PrecisionNumbers({
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
