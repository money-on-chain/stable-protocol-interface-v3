import React from "react";

import type { ContractProtocolStatusResult } from "../../../types/status";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface TokenRowProps {
    key: number;
    label: {
        name: string;
        price: string;
        variation: string;
        balance: string;
        usdBalance: string;
    };
    tokenIcon: string;
    tokenName: string;
    tokenTicker: string;
    price: bigint;
    balance: bigint;
    balanceLoaded: boolean;
    balanceUSD: bigint;
    visiblePriceDecimals: number;
    visibleBalanceDecimals: number;
    visibleBalanceUSDDecimals: number;
    contractProtocolStatus: ContractProtocolStatusResult;
    i18n: { languages: readonly string[] };
}

interface TokenRow {
    key: number;
    renderRow: React.ReactElement;
}

export const generateTokenRow = ({
    key,
    label,
    tokenIcon,
    tokenName,
    tokenTicker,
    price,
    balance,
    balanceLoaded,
    balanceUSD,
    visiblePriceDecimals,
    visibleBalanceDecimals,
    visibleBalanceUSDDecimals,
    contractProtocolStatus,
    i18n,
}: TokenRowProps): TokenRow => {
    return {
        key,
        renderRow: (
            <div
                data-testid={`portfolio-row-${tokenTicker}`}
                className="table__row"
            >
                {/* Token icon, name, and ticker */}
                <div className="table__cell__name">
                    <div className="token">
                        <div className={`${tokenIcon} token__icon`}></div>
                        <span className="token__name">{tokenName}</span>
                        <span className="token__ticker">({tokenTicker})</span>
                    </div>
                </div>
                {/* Token price */}
                <div
                    data-testid={`portfolio-price-${tokenTicker}`}
                    className="table__cell table__cell__price"
                >
                    {price ? (
                        <PrecisionNumbers
                            amount={price}
                            token={{
                                name: "",
                                decimals: 18,
                                visibleDecimals: visiblePriceDecimals,
                            }}
                            decimals={visiblePriceDecimals}
                            i18n={i18n}
                            compact={true}
                            compactVariant="significant"
                            tooltipVariant="formatted"
                        />
                    ) : (
                        <>--</>
                    )}
                    <div className="table__cell__label">{label.price}</div>
                </div>
                {/* Token balance */}
                <div
                    data-testid={`portfolio-balance-${tokenTicker}`}
                    className="table__cell table__cell__amount"
                >
                    {balanceLoaded ? (
                        <PrecisionNumbers
                            amount={balance}
                            token={{
                                name: "",
                                decimals: 18,
                                visibleDecimals: visibleBalanceDecimals,
                            }}
                            decimals={visibleBalanceDecimals}
                            i18n={i18n}
                            compact={true}
                            compactVariant="significant"
                            tooltipVariant="formatted"
                        />
                    ) : (
                        <>--</>
                    )}{" "}
                    <div className="token__ticker">
                        {/* {tokenTicker}  */}
                        {/* show token ticker after balance */}
                        <div className="table__cell__label">
                            {label.balance}
                        </div>
                    </div>
                </div>
                {/* Token balance in USD */}
                <div className="table__cell table__cell__usdBalance">
                    {balanceLoaded && balanceUSD ? (
                        <PrecisionNumbers
                            amount={balanceUSD}
                            token={{
                                name: "",
                                decimals: 18,
                                visibleDecimals: visibleBalanceUSDDecimals,
                            }}
                            decimals={visibleBalanceUSDDecimals}
                            i18n={i18n}
                            compact={true}
                            compactVariant="significant"
                            tooltipVariant="formatted"
                        />
                    ) : (
                        <>--</>
                    )}
                    <div className="table__cell__label">{label.usdBalance}</div>
                </div>
            </div>
        ),
    };
};
