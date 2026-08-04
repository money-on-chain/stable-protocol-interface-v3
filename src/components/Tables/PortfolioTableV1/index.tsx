import "../PortfolioTable/Styles.scss";

import { Skeleton } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";

import { useWalletContext } from "../../../context/Wallet";
import { getPortfolioRowsV1 } from "../../../helpers/portfolioV1";
import { useProjectTranslation } from "../../../helpers/translations";
import { usePortfolioCurrentDebt } from "../../../hooks/usePortfolioCurrentDebt";
import { PrecisionNumbers } from "../../PrecisionNumbers";

// v1's portfolio is a fixed 4-token set (RBTC/BPro/DOC/MOC) — no CA-indexed
// loop or portfolio_table config needed, unlike the v3 PortfolioTable.
export default function PortfolioTableV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const navigate = useNavigate();
    const {
        address,
        contractsAddress,
        contractProtocolStatusV1,
        userBalanceV1,
        userBaseCoinBalance,
    } = useWalletContext();
    const { hasCurrentDebt } = usePortfolioCurrentDebt(
        contractsAddress,
        address
    );

    const ready =
        contractProtocolStatusV1.data != null && userBalanceV1.data != null;

    if (!ready) {
        return <Skeleton active />;
    }

    const rows = getPortfolioRowsV1(
        contractProtocolStatusV1,
        userBalanceV1,
        userBaseCoinBalance
    );
    return (
        <div className="portfolio-table portfolio-table--v1">
            <div className="table__header">
                <div className="table__cell__name">
                    {t("portfolio.tokensTable.tokenName")}
                </div>
                <div
                    aria-hidden="true"
                    className="table__cell__claim"
                ></div>
                <div className="table__cell__price">
                    {t("portfolio.tokensTable.priceInUSD")}
                </div>
                <div className="table__cell__amount">
                    {t("portfolio.tokensTable.balance")}
                </div>
                <div className="table__cell__usdBalance">
                    {t("portfolio.tokensTable.usdBalance")}
                </div>
            </div>
            <div className="table__body">
                {rows.map((row) => (
                    <div
                        key={row.key}
                        data-testid={`portfolio-row-${row.tokenTicker}`}
                        className="table__row"
                    >
                        <div className="table__cell__name">
                            <div className="token">
                                <div
                                    className={`icon-token-${row.tokenTicker} token__icon`}
                                ></div>
                                <span className="token__name">
                                    {row.tokenName}
                                </span>
                                <span className="token__ticker">
                                    ({row.tokenTicker})
                                </span>
                            </div>
                        </div>
                        <div
                            className={`table__cell table__cell__claim${
                                row.tokenTicker === "DOC"
                                    ? ""
                                    : " table__cell__claim--empty"
                            }`}
                        >
                            {row.tokenTicker === "DOC" &&
                            hasCurrentDebt === undefined ? (
                                <Skeleton.Button active size="small" />
                            ) : row.tokenTicker === "DOC" ? (
                                <button
                                    className="portfolioActionV1__button"
                                    data-testid="portfolio-lending-borrowing-DOC"
                                    onClick={() =>
                                        navigate("/lending-borrowing")
                                    }
                                    type="button"
                                >
                                    {t(
                                        hasCurrentDebt === true
                                            ? "portfolio.tokensTable.viewCurrentDebt"
                                            : "portfolio.tokensTable.lendAndBorrow"
                                    )}
                                </button>
                            ) : (
                                <span aria-hidden="true">&nbsp;</span>
                            )}
                        </div>
                        <div
                            data-testid={`portfolio-price-${row.tokenTicker}`}
                            className="table__cell table__cell__price"
                        >
                            {row.priceAvailable ? (
                                <PrecisionNumbers
                                    amount={row.price}
                                    token={{
                                        name: "",
                                        decimals: 18,
                                        visibleDecimals:
                                            row.visiblePriceDecimals,
                                    }}
                                    decimals={row.visiblePriceDecimals}
                                    i18n={i18n}
                                    compact={true}
                                />
                            ) : (
                                <>--</>
                            )}
                            <div className="table__cell__label">
                                {t("portfolio.tokensTable.priceInUSD")}
                            </div>
                        </div>
                        <div
                            data-testid={`portfolio-balance-${row.tokenTicker}`}
                            className="table__cell table__cell__amount"
                        >
                            {row.balanceLoaded ? (
                                <PrecisionNumbers
                                    amount={row.balance}
                                    token={{
                                        name: "",
                                        decimals: 18,
                                        visibleDecimals:
                                            row.visibleBalanceDecimals,
                                    }}
                                    decimals={row.visibleBalanceDecimals}
                                    i18n={i18n}
                                    compact={true}
                                />
                            ) : (
                                <>--</>
                            )}
                            <div className="table__cell__label">
                                {t("portfolio.tokensTable.balance")}
                            </div>
                        </div>
                        <div className="table__cell table__cell__usdBalance">
                            {row.balanceLoaded && row.priceAvailable ? (
                                <PrecisionNumbers
                                    amount={row.balanceUSD}
                                    token={{
                                        name: "",
                                        decimals: 18,
                                        visibleDecimals:
                                            row.visibleBalanceUSDDecimals,
                                    }}
                                    decimals={row.visibleBalanceUSDDecimals}
                                    i18n={i18n}
                                    compact={true}
                                />
                            ) : (
                                <>--</>
                            )}
                            <div className="table__cell__label">
                                {t("portfolio.tokensTable.usdBalance")}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
