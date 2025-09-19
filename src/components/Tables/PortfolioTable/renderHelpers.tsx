import PropTypes from "prop-types";
import React from "react";

import { absBigInt } from "../../../helpers/precision";
import settings from "../../../settings/settings.json";
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
    priceDelta: bigint;
    variation: bigint;
    visiblePriceDecimals: number;
    visibleBalanceDecimals: number;
    visibleBalanceUSDDecimals: number;
    contractProtocolStatus: any;
    i18n: any;
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
    priceDelta,
    variation,
    visiblePriceDecimals,
    visibleBalanceDecimals,
    visibleBalanceUSDDecimals,
    contractProtocolStatus,
    i18n,
}: TokenRowProps): TokenRow => {
    const getSign = (): string => {
        if (priceDelta === 0n) return "";
        return priceDelta > 0n ? "+" : "-";
    };
    
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
                    {contractProtocolStatus.data.canOperate ? (
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

                {/* Token 24h variation */}
                {settings.showPriceVariation && (
                    <div className="table__cell">
                        {contractProtocolStatus.data.canOperate ? (
                            <div className="table__cell__variation">
                                {`${getSign()} `}
                                <PrecisionNumbers
                                    amount={absBigInt(variation)}
                                    token={{
                                        name: "",
                                        decimals: 18,
                                        visibleDecimals: 2,
                                    }}
                                    decimals={2}
                                    i18n={i18n}                                    
                                />
                                {" %"}
                                <span
                                    className={`variation-indicator ${
                                        getSign() === "+"
                                            ? "positive-indicator"
                                            : getSign() === "-"
                                              ? "negative-indicator"
                                              : "neutral-indicator"
                                    }`}
                                ></span>
                            </div>
                        ) : (
                            <>
                                <div className="table__cell__variation">--</div>
                                <div className="table__cell__label">
                                    {label.variation}
                                </div>
                            </>
                        )}
                    </div>
                )}
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
                    {contractProtocolStatus.data.canOperate ? (
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

generateTokenRow.propTypes = {
    key: PropTypes.string,
    label: PropTypes.string,
    tokenIcon: PropTypes.string,
    tokenName: PropTypes.string,
    tokenTicker: PropTypes.string,
    price: PropTypes.object,
    balance: PropTypes.object,
    balanceUSD: PropTypes.object,
    priceDelta: PropTypes.object,
    variation: PropTypes.object,
    visiblePriceDecimals: PropTypes.number,
    visibleBalanceDecimals: PropTypes.number,
    visibleBalanceUSDDecimals: PropTypes.number,
    contractProtocolStatus: PropTypes.object,
    i18n: PropTypes.object,
};
