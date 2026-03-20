import React, { useMemo } from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { mulPrecision, normalizeToBigInt } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import type { TokenConfig } from "../../types/hooks";
import { PrecisionNumbers } from "../PrecisionNumbers";

export default function TVL(): JSX.Element {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext();

    const tvl = useMemo(() => {
        if (!contractProtocolStatus.data) return 0n;

        let total = 0n;

        for (const dataItem of settings.tokens.CA as TokenConfig[]) {
            if (dataItem.key == null) continue;

            const entry = contractProtocolStatus.data[dataItem.key];
            if (!entry || !entry.PP_CA || entry.nACcb == null) continue;

            const priceCA = normalizeToBigInt(entry.PP_CA[0]) ?? 0n;
            const nACcb = normalizeToBigInt(entry.nACcb) ?? 0n;

            total += mulPrecision(nACcb, priceCA);
        }

        return total;
    }, [contractProtocolStatus.data]);

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
                    })}
                </div>
                <div className="caption">
                    {t("performance.tvl.expressedIn")}
                </div>
            </div>
        </div>
    );
}
