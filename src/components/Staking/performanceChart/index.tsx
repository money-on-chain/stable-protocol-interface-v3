import React, { useState, useEffect } from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import "./Styles.scss";

interface PerformanceData {
    annualized_value: number;
}

export default function PerformanceChart(): React.ReactElement {
    const [percent, setPercent] = useState<number>(0);
    const { t } = useProjectTranslation();

    useEffect(() => {
        fetch(
            "https://api.moneyonchain.com/api/calculated/moc_last_block_performance"
        )
            .then(async (response) => {
                const data: PerformanceData = await response.json();
                setPercent(Number(data.annualized_value.toFixed(2)));
            })
            .catch((error) => {
                console.log(error);
                setPercent(0);
            });
    }, []);

    const height = percent && percent > 0 ? (percent * 190) / 100 : 0;

    return (
        <div className="ChartContainer">
            <div className="ChartText">
                <div className="percent">{percent > 0 && `${percent}%`}</div>
                <div className="percent-note">
                    {t("staking.performance.bar.description")}
                </div>
            </div>
            <div className="ChartGraphic">
                <div className="ChartColumn">
                    <div className="Bar Percent Hidden" style={{ height }} />
                    <div className="Bar">
                        <div>{t("staking.performance.bar.base")}</div>
                    </div>
                </div>
                <div className="ChartColumn">
                    <div className="Bar Percent Gray" style={{ height }} />
                    <div className="Bar">
                        <div>
                            {t("staking.performance.bar.base")}
                            <br />
                            {t("staking.performance.bar.sign")}
                            <br />
                            {t("staking.performance.bar.staking")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
