import React from "react";

import "./Styles.scss";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import { TokenSettings } from "../../../helpers/currencies";
import { useProjectTranslation } from "../../../helpers/translations";
import { fromWei } from "../../../helpers/precision";

interface BalanceBarProps {
    againstVotes: bigint; // BigInt with 18 decimals
    against: bigint; // BigInt with 18 decimals
    infavorVotes: bigint; // BigInt with 18 decimals
    infavor: bigint; // BigInt with 18 decimals
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
                        i18n: i18n                        
                    })}
                    {space}
                    ({
                    PrecisionNumbers({
                        amount: props.against,
                        token: TokenSettings("TG") as any, // Type assertion to fix type mismatch
                        decimals: 2,
                        i18n: i18n                        
                        })}
                        %) 
                    against
                </div>
                <div className="label">
                    {PrecisionNumbers({
                        amount: props.infavorVotes,
                        token: TokenSettings("TG") as any, // Type assertion to fix type mismatch
                        decimals: 2,
                        i18n: i18n                        
                    })}
                    {space}(
                        {PrecisionNumbers({
                            amount: props.infavor,
                            token: TokenSettings("TG") as any, // Type assertion to fix type mismatch
                            decimals: 2,
                            i18n: i18n                        
                        })}
                        %) in favor
                </div>
            </div>
            <div className="balanceBar__wrapper">
                <div
                    className={`against ${props.against === 100000000000000000000n ? " maxvalue" : ""}`}
                    style={{ width: fromWei(props.against) + "%" }}
                ></div>

                <div className="graphDivider"></div>
                <div
                    className={`infavor ${props.infavor === 100000000000000000000n ? " maxvalue" : ""}`}
                    style={{ width: fromWei(props.infavor) + "%" }}
                ></div>
            </div>
        </div>
    );
}
