import "./Styles.scss";

import React from "react";

import { TokenSettings } from "../../../helpers/currencies";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface ProposalStatsProps {
    amount: bigint;
    percentage: bigint;
    label: string;
}

export default function ProposalStats(
    props: ProposalStatsProps
): React.ReactElement {
    const { i18n } = useProjectTranslation();

    const amountBig = props.amount;
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
                            token: TokenSettings("TG"),
                            decimals: 2,
                            i18n: i18n,
                            //skipContractConvert: true,
                            compact: true,
                        })}
                    </div>
                    <div className="statPercentage">
                        (
                        {PrecisionNumbers({
                            amount: percentageBig,
                            token: TokenSettings("TG"),
                            decimals: 2,
                            i18n: i18n,
                            //skipContractConvert: true,
                            compact: true,
                        })}
                        %)
                    </div>
                </div>
            )}
        </>
    );
}
