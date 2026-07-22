import React, { useMemo } from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { mulPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

// v1's analogue of components/Performance's tvl.tsx — v1 has a single bucket,
// so TVL is just that bucket's RBTC balance priced in USD (no CA loop needed).
export default function TVLV1(): JSX.Element {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1 } = useWalletContext();
    const status = contractProtocolStatusV1.data;

    const tvl = useMemo(
        () =>
            status
                ? mulPrecision(status.getBucketNBTC, status.getBitcoinPrice)
                : 0n,
        [status]
    );

    return (
        <div className="section__innerCard--small dash__perfTVL">
            <div className="layout-card-title">
                <h1>{t("performance.tvl.cardTitle")}</h1>
            </div>

            <div className="card-content">
                <div className="big-number">
                    {PrecisionNumbers({
                        amount: tvl,
                        token: TokenSettings("CA_0"),
                        decimals: 2,
                        i18n: i18n,
                        compact: true,
                        useNoLimit: true,
                    })}
                </div>
                <div className="caption">
                    {t("performance.tvl.expressedIn")}
                </div>
            </div>
        </div>
    );
}
