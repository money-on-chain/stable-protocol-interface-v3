import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { mulPrecision, normalizeToBigInt } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import { PrecisionNumbers } from "../PrecisionNumbers";

export default function TVL(): JSX.Element {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext();

    let collateralTotalInUSD = 0n;
    let collateralInUSD: bigint;

    if (contractProtocolStatus.data) {
        settings.tokens.CA.forEach(function (dataItem) {
            // Check if the required data exists before accessing it
            if (!(contractProtocolStatus.data)?.[dataItem.key] || !(contractProtocolStatus.data)?.[dataItem.key]?.PP_CA) {
                return;
            }
            
            const priceCA =
                normalizeToBigInt(
                    (contractProtocolStatus.data)[dataItem.key].PP_CA[0]
                ) || 0n;

            const nACcb = (contractProtocolStatus.data)[dataItem.key].nACcb || 0n;
            collateralInUSD = mulPrecision(nACcb, priceCA);
            collateralTotalInUSD = collateralTotalInUSD + collateralInUSD;
        });
    }

    return (
        <div className="section__innerCard--small dash__perfTVL">
            <div className="layout-card-title">
                <h1>{t("performance.tvl.cardTitle")}</h1>
            </div>

            <div className="card-content">
                <div className="big-number">
                    {!(contractProtocolStatus.data)?.canOperate
                        ? "--"
                        : PrecisionNumbers({
                              amount: collateralTotalInUSD
                                  ? collateralTotalInUSD
                                  : 0n,
                              token: TokenSettings("CA_0"),
                              decimals: 2,
                              i18n: i18n,
                          })}
                </div>
                <div className="caption">
                    {t("performance.tvl.expressedIn")}
                </div>
            </div>
        </div>
    );
}
