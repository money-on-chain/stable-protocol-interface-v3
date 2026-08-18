import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

// Per-token metrics — the v1 analogue of components/Performance's buckets.tsx,
// minus the collateral-distribution pie chart/table (v1 has a single bucket
// backing just two tokens, so there's nothing to distribute between).
export function DocMetricsV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1 } = useWalletContext();
    const status = contractProtocolStatusV1.data;

    return (
        <div className="layout-card section__innerCard--big perfGlobalMetrics">
            <div className="layout-card-title perfCardTitleV1 perfAssetTitleV1">
                <div className="icon-token-tp_0 perfAssetTitleV1__icon"></div>
                <h1>DOC {t("performance.v1.docCardTitle")}</h1>
            </div>

            <div className="metrics">
                <div
                    className="dataGroup"
                    data-testid="performance-v1-doc-total"
                >
                    <div className="icon__back">
                        <div className="icon icon__DocTotal"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.getBucketNDoc,
                                      token: TokenSettings("TP_0"),
                                      decimals: 2,
                                      i18n,
                                      compact: true,
                                      useNoLimit: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.v1.totalDoc")}
                        </div>
                    </div>
                </div>

                <div
                    className="dataGroup"
                    data-testid="performance-v1-doc-redeemable"
                >
                    <div className="icon__back">
                        <div className="icon icon__DocRedeemable"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.freeDoc,
                                      token: TokenSettings("TP_0"),
                                      decimals: 2,
                                      i18n,
                                      compact: true,
                                      useNoLimit: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.v1.availableRedeemDoc")}
                        </div>
                    </div>
                </div>

                <div
                    className="dataGroup"
                    data-testid="performance-v1-doc-mintable"
                >
                    <div className="icon__back">
                        <div className="icon icon__DocMintable"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.absoluteMaxDoc,
                                      token: TokenSettings("TP_0"),
                                      decimals: 2,
                                      i18n,
                                      compact: true,
                                      useNoLimit: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.v1.availableMintDoc")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function BproMetricsV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1 } = useWalletContext();
    const status = contractProtocolStatusV1.data;

    return (
        <div className="layout-card section__innerCard--big perfGlobalMetrics">
            <div className="layout-card-title perfCardTitleV1 perfAssetTitleV1">
                <div className="icon-token-tc_0 perfAssetTitleV1__icon"></div>
                <h1>
                    {t("performance.v1.bproCardTitle")}{" "}
                    {t("performance.v1.tokenCollateral")}
                </h1>
            </div>

            <div className="metrics">
                <div
                    className="dataGroup"
                    data-testid="performance-v1-bpro-total"
                >
                    <div className="icon__back">
                        <div className="icon icon__BproTotal"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.getBucketNBPro,
                                      token: TokenSettings("TC_0"),
                                      decimals: 2,
                                      i18n,
                                      compact: true,
                                      useNoLimit: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.v1.totalBpro")}
                        </div>
                    </div>
                </div>

                <div
                    className="dataGroup"
                    data-testid="performance-v1-bpro-redeemable"
                >
                    <div className="icon__back">
                        <div className="icon icon__BproRedeemable"></div>
                    </div>
                    <div className="info">
                        <div className="amount">
                            {status
                                ? PrecisionNumbers({
                                      amount: status.absoluteMaxBPro,
                                      token: TokenSettings("TC_0"),
                                      decimals: 2,
                                      i18n,
                                      compact: true,
                                      useNoLimit: true,
                                  })
                                : "--"}
                        </div>
                        <div className="label">
                            {t("performance.v1.availableRedeemBpro")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
