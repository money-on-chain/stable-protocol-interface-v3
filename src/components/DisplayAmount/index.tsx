import "./Styles.scss";

import React from "react";

import { TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface DisplayAmountProps {
    value?: string | number;
    token: string;
    label?: string;
    placeholder?: string;
    equivalentValue?: bigint;
    equivalentLabel?: string;
    showApproxSymbol?: boolean;
    className?: string;
}

const space = "\u00A0";

const DisplayAmount: React.FC<DisplayAmountProps> = ({
    value,
    token,
    label,
    placeholder = "0.00",
    equivalentValue,
    equivalentLabel = "USD",
    showApproxSymbol = true,
    className = "",
}) => {
    const { i18n } = useProjectTranslation();

    const resolvedValue =
        value === undefined || value === null || value === ""
            ? placeholder
            : String(value);

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
                        {resolvedValue}
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
                            decimals: 2,
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
