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
    // Compact formatting caps the fraction at 2-4 digits (see
    // formatSignificantCompactValue), which silently truncates small values
    // like 0.00015436 down to 0.0001. Pass false to render the full
    // `decimals` precision instead.
    compact?: boolean;
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
    compact = true,
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
                            compact: compact,
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
                            compact: true,
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
