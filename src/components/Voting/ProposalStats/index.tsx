import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import { TokenSettings } from "../../../helpers/currencies";
import "./Styles.scss";

interface ProposalStatsProps {
    amount: bigint;
    percentage: bigint;
    label: string;
}

export default function ProposalStats(props: ProposalStatsProps): React.ReactElement {
    const { i18n } = useProjectTranslation();
    
    const amountBig =props.amount;
    const percentageBig = props.percentage;

    // Convert data for display compatibility
    //const amountDisplay = amountBig.toNumber();
    //const percentageDisplay = percentageBig.toNumber();

    return (
        <>
            {amountBig && (
                <div className="statContainer">
                    <div className="statLabel">{props.label}</div>
                    {/* <div className="statSeparator">:</div> */}
                    <div className="statAmount">
                        {PrecisionNumbers({
                            amount: amountBig,
                            token: TokenSettings("TG") as any, // Type assertion to fix type mismatch
                            decimals: 2,
                            i18n: i18n,
                            //skipContractConvert: true,
                        })}
                    </div>
                    <div className="statPercentage">
                        (
                        {PrecisionNumbers({
                            amount: percentageBig,
                            token: TokenSettings("TG") as any, // Type assertion to fix type mismatch
                            decimals: 2,
                            i18n: i18n,
                            //skipContractConvert: true,
                        })}
                        %)
                    </div>
                </div>
            )}
        </>
    );
}
