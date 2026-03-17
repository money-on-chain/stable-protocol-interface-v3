import "./Styles.scss";

import React from "react";

import { TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface DisplayAmountProps {
    value?: bigint;
    token: string;
    label?: string;
    equivalentValue?: bigint;
    equivalentLabel?: string;
    showApproxSymbol?: boolean;
    className?: string;
    decimals?: number;
    equivalentDecimals?: number;
}

const space = "\u00A0";

const DisplayAmount: React.FC<DisplayAmountProps> = ({
    value,
    token,
    label,    
    equivalentValue,
    equivalentLabel = "USD",
    showApproxSymbol = true,
    className = "",
    decimals = 2,
    equivalentDecimals = 2,
}) => {
    const { i18n } = useProjectTranslation();
    
    return (
        <div className={`displayAmount ${className}`.trim()}>
            {label && (
                <div className="displayAmount__topBar">
                    <div className="displayAmount__label">{label}</div>
                </div>
            )}

            <div className="displayAmount__mainRow">
                <div className="displayAmount__valueBlock">
                    <span className="displayAmount__value">
                        {PrecisionNumbers({
                            amount: value || 0n,
                            token: TokenSettings("CA_0"),
                            decimals: decimals,
                            i18n: i18n,
                        })}
                    </span>
                </div>

                <div className="displayAmount__ticker">{token}</div>
            </div>

            {equivalentValue !== undefined && (
                <div className="displayAmount__bottomBar">
                    <div className="displayAmount__equivalent">
                        {showApproxSymbol && "≈ "}
                        {PrecisionNumbers({
                            amount: equivalentValue,
                            token: TokenSettings("CA_0"),
                            decimals: equivalentDecimals,
                            i18n,
                            isUSD: true,
                        })}
                        {space}
                        {equivalentLabel}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisplayAmount;
