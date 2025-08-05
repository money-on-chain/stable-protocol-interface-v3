import React from "react";

import "./Styles.scss";
import { PrecisionNumbers } from "../../PrecisionNumbers3";
import { TokenSettings } from "../../../helpers/currencies";
import { useProjectTranslation } from "../../../helpers/translations";

// Import the Token type from the correct location if available
// import type { Token } from "../../../helpers/currencies";

interface BalanceBarProps {
    againstVotes: any; // Replace 'any' with the correct type if known
    against: string;
    infavorVotes: any; // Replace 'any' with the correct type if known
    infavor: string;
}

export default function BalanceBar(props: BalanceBarProps): React.ReactElement {
    const { i18n } = useProjectTranslation();
    const space = "\u00A0";

    return (
        <div className="balanceBar">
            <div className="balanceBar__labels">
                <div className="label">
                    {PrecisionNumbers({
                        amount: props.againstVotes,
                        token: TokenSettings("TG") as any, // Type assertion to fix type mismatch
                        decimals: 2,
                        i18n: i18n,
                        //skipContractConvert: true,
                    })}
                    {space}({props.against}) against
                </div>
                <div className="label">
                    {PrecisionNumbers({
                        amount: props.infavorVotes,
                        token: TokenSettings("TG") as any, // Type assertion to fix type mismatch
                        decimals: 2,
                        i18n: i18n,
                        //skipContractConvert: true,
                    })}
                    {space}({props.infavor}) in favor
                </div>
            </div>
            <div className="balanceBar__wrapper">
                <div
                    className={`against ${props.against === "100%" ? " maxvalue" : ""}`}
                    style={{ width: props.against }}
                ></div>

                <div className="graphDivider"></div>
                <div
                    className={`infavor ${props.infavor === "100%" ? " maxvalue" : ""}`}
                    style={{ width: props.infavor }}
                ></div>
            </div>
        </div>
    );
}
