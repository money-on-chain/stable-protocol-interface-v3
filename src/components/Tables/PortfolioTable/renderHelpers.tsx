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
            <div className="table__row">
                {/* Token icon, name, and ticker */}
                <div className="table__cell__name">
                    <div className="token">
                        <div className={`${tokenIcon} token__icon`}></div>
                        <span className="token__name">{tokenName}</span>
                        <span className="token__ticker">({tokenTicker})</span>
                    </div>
                </div>
                {/* Token price */}
                <div className="table__cell table__cell__price">
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
                        />
                    ) : (
                        <>--</>
                    )}
                    <div className="table__cell__label">{label.price}</div>
                </div>                
                {/* Token balance */}
                <div className="table__cell table__cell__amount">
                    <PrecisionNumbers
                        amount={balance}
                        token={{
                            name: "",
                            decimals: 18,
                            visibleDecimals: visibleBalanceDecimals,
                        }}
                        decimals={visibleBalanceDecimals}
                        i18n={i18n}
                    />{" "}
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
                    {balanceUSD ? (
                        <PrecisionNumbers
                            amount={balanceUSD}
                            token={{
                                name: "",
                                decimals: 18,
                                visibleDecimals: visibleBalanceUSDDecimals,
                            }}
                            decimals={visibleBalanceUSDDecimals}
                            i18n={i18n}
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
