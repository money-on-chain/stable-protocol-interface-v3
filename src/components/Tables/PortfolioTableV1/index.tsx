import "../PortfolioTable/Styles.scss";

import { Skeleton } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";

import { useWalletContext } from "../../../context/Wallet";
import { TokenSettings } from "../../../helpers/currencies";
import { getPortfolioRowsV1 } from "../../../helpers/portfolioV1";
import { useProjectTranslation } from "../../../helpers/translations";
import { useIncentivesBalance } from "../../../hooks/useIncentives";
import { PrecisionNumbers } from "../../PrecisionNumbers";

// v1's portfolio is a fixed 4-token set (RBTC/BPro/DOC/MOC) — no CA-indexed
// loop or portfolio_table config needed, unlike the v3 PortfolioTable.
export default function PortfolioTableV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const navigate = useNavigate();
    const {
        address,
        contractProtocolStatusV1,
        userBalanceV1,
        userBaseCoinBalance,
    } = useWalletContext();
    const { data: incentivesBalance } = useIncentivesBalance(address);

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
    const showLiquidityMiningColumn = rows.some(
        (row) => row.liquidityMiningEnabled
    );

    return (
        <div className="portfolio-table portfolio-table--v1">
            <div className="table__header">
                <div className="table__cell__name">
                    {t("portfolio.tokensTable.tokenName")}
                </div>
                {showLiquidityMiningColumn && (
                    <div className="table__cell__claim">
                        {t("portfolio.tokensTable.liquidityMining")}
                    </div>
                )}
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
                        {showLiquidityMiningColumn && (
                            <div
                                className={`table__cell table__cell__claim${
                                    row.liquidityMiningEnabled
                                        ? ""
                                        : " table__cell__claim--empty"
                                }`}
                            >
                                {row.liquidityMiningEnabled ? (
                                    <>
                                        <button
                                            className="portfolioClaimV1__button"
                                            data-testid={`portfolio-liquidity-mining-${row.tokenTicker}`}
                                            onClick={() =>
                                                navigate("/liquidity-mining")
                                            }
                                            type="button"
                                        >
                                            <span>
                                                {t(
                                                    "portfolio.tokensTable.readyToClaim"
                                                )}
                                            </span>
                                            <span className="portfolioClaimV1__amount">
                                                {incentivesBalance ? (
                                                    <PrecisionNumbers
                                                        amount={
                                                            incentivesBalance.mocBalance
                                                        }
                                                        token={TokenSettings(
                                                            "TG"
                                                        )}
                                                        decimals={6}
                                                        i18n={i18n}
                                                        compact={true}
                                                        useNoLimit={true}
                                                    />
                                                ) : (
                                                    "--"
                                                )}{" "}
                                                MOC
                                            </span>
                                        </button>
                                        <div className="table__cell__label">
                                            {t(
                                                "portfolio.tokensTable.liquidityMining"
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <span aria-hidden="true">&nbsp;</span>
                                )}
                            </div>
                        )}
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
