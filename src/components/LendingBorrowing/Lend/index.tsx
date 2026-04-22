import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import MetricCard from "../MetricCard";
import { LEND_CARDS, type LendCardData } from "./data";

interface LendProps {
    onEarn: (token: LendCardData) => void;
}

export default function Lend({ onEarn }: LendProps): React.ReactElement {
    const { t } = useProjectTranslation();

    return (
        <div className={"layout-card"}>
            <div className={"layout-card-title"}>
                <h1>{t("lending.cardTitle.section")}</h1>
            </div>
            <div className="lend-items">
                {LEND_CARDS.map((card) => (
                    <div className={"card"} key={card.id}>
                        <div className="card-header">
                            <div className="token">
                                <div className={card.tokenIconClassName}></div>
                                <div className="token-name">
                                    {card.tokenName}
                                    <div className="token-ticker">
                                        ({card.tokenTicker})
                                    </div>
                                </div>
                            </div>
                            <div className="interest-wrapper">
                                <div className="label">
                                    {t("lending.labelInterest")}
                                </div>
                                <div className="interest-data">
                                    <div>{card.supplyApy}</div> <div>%</div>
                                </div>
                            </div>
                        </div>
                        <div className="card-content">
                            <MetricCard
                                label={t("lending.labelDeposits")}
                                localCurrencyValue={card.depositedAmountUsd}
                                value={card.depositedAmount}
                                valueLabel={card.depositedTicker}
                            />
                            <div className="cta">
                                <button
                                    className="button--compact"
                                    onClick={() => onEarn(card)}
                                    type="button"
                                >
                                    {t("lending.cta.earn")}
                                </button>
                                <button
                                    className="button--compact button--compact--secondary"
                                    type="button"
                                >
                                    {t("lending.cta.withdraw")}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
