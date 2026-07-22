import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { mulPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

// Per-token metrics — the v1 analogue of components/Performance's buckets.tsx,
// minus the collateral-distribution pie chart/table (v1 has a single bucket
// backing just two tokens, so there's nothing to distribute between).
export default function TokensV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1 } = useWalletContext();
    const status = contractProtocolStatusV1.data;

    const discountPriceUsd = status
        ? mulPrecision(status.bproDiscountPrice, status.getBitcoinPrice)
        : 0n;

    return (
        <>
            <div className="layout-card section__innerCard--big perfGlobalMetrics">
                <div className="layout-card-title">
                    <h1>{t("performance.v1.docCardTitle")}</h1>
                </div>

                <div className="metrics">
                    <div className="dataGroup" data-testid="performance-v1-doc-total">
                        <div className="icon__back">
                            <div className="icon-token-tp_0 token__icon"></div>
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
                            <div className="icon-token-tp_0 token__icon"></div>
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
                            <div className="icon-token-tp_0 token__icon"></div>
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

            <div className="layout-card section__innerCard--big perfGlobalMetrics">
                <div className="layout-card-title">
                    <h1>{t("performance.v1.bproCardTitle")}</h1>
                </div>

                <div className="metrics">
                    <div className="dataGroup" data-testid="performance-v1-bpro-price">
                        <div className="icon__back">
                            <div className="icon-token-tc_0 token__icon"></div>
                        </div>
                        <div className="info">
                            <div className="amount">
                                {status
                                    ? PrecisionNumbers({
                                          amount: status.bproUsdPrice,
                                          token: TokenSettings("TC_0"),
                                          decimals: 2,
                                          i18n,
                                          isUSD: true,
                                          compact: true,
                                      })
                                    : "--"}
                            </div>
                            <div className="label">
                                {t("performance.v1.bproPrice")}
                            </div>
                        </div>
                    </div>

                    <div
                        className="dataGroup"
                        data-testid="performance-v1-bpro-discount-price"
                    >
                        <div className="icon__back">
                            <div className="icon-token-tc_0 token__icon"></div>
                        </div>
                        <div className="info">
                            <div className="amount">
                                {status
                                    ? PrecisionNumbers({
                                          amount: discountPriceUsd,
                                          token: TokenSettings("TC_0"),
                                          decimals: 2,
                                          i18n,
                                          isUSD: true,
                                          compact: true,
                                      })
                                    : "--"}
                            </div>
                            <div className="label">
                                {t("performance.v1.bproDiscountPrice")}
                            </div>
                        </div>
                    </div>

                    <div className="dataGroup" data-testid="performance-v1-bpro-total">
                        <div className="icon__back">
                            <div className="icon-token-tc_0 token__icon"></div>
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
                            <div className="icon-token-tc_0 token__icon"></div>
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

            <div className="layout-card section__innerCard--big perfGlobalMetrics">
                <div className="layout-card-title">
                    <h1>{t("performance.v1.mocCardTitle")}</h1>
                </div>

                <div className="metrics">
                    <div className="dataGroup" data-testid="performance-v1-moc-price">
                        <div className="icon__back">
                            <div className="icon-token-tg token__icon"></div>
                        </div>
                        <div className="info">
                            <div className="amount">
                                {status
                                    ? PrecisionNumbers({
                                          amount: status.mocUsdPrice,
                                          token: TokenSettings("TG"),
                                          decimals: 2,
                                          i18n,
                                          isUSD: true,
                                          compact: true,
                                      })
                                    : "--"}
                            </div>
                            <div className="label">
                                {t("performance.v1.mocPrice")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
