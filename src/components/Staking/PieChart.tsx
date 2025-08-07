import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import settings from "../../settings/settings.json";
import { toBigIntPrecision } from "../../helpers/precision";
import { bigIntToInputValue } from "../../helpers/currencies";

interface UserInfoStaking {
    tgBalance: bigint;
    stakedBalance: bigint;
    totalPendingExpiration: bigint;
    totalAvailableToWithdraw: bigint;
    lockedInVoting: bigint;
}

interface PieChartData {
    type: string;
    value: number;
}

interface PieChartComponentProps {
    userInfoStaking: UserInfoStaking;
}

const convertBigIntToNumber = (amount: bigint) => {
    return Number(bigIntToInputValue(amount, 'TG', 2));
}

const PieChartComponent: React.FC<PieChartComponentProps> = (props) => {
    const { t, i18n } = useProjectTranslation();
    const [data, setData] = useState<PieChartData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const { userInfoStaking } = props;
    const space: string = "\u00A0";

    useEffect(() => {
        readData();
    }, [
        userInfoStaking["tgBalance"],
        userInfoStaking["stakedBalance"],
        userInfoStaking["totalPendingExpiration"],
        userInfoStaking["totalAvailableToWithdraw"],
        userInfoStaking["lockedInVoting"],
    ]);

    const readData = (): void => {
        const total: number = getTotal();        
        const _data: PieChartData[] = [
            {
                type: t("staking.distribution.graph.balance"),
                value: total > 0
                    ? convertBigIntToNumber(userInfoStaking["tgBalance"]) / total * 100
                    : 0,
            },
            {
                type: t("staking.distribution.graph.processingUnstake"),
                value: total > 0
                    ? convertBigIntToNumber(userInfoStaking["totalPendingExpiration"]) / total * 100
                    : 0,
            },
            {
                type: t("staking.distribution.graph.readyWithdraw"),
                value: total > 0
                    ? convertBigIntToNumber(userInfoStaking["totalAvailableToWithdraw"]) / total * 100
                    : 0,
            },
            {
                type: t("staking.distribution.graph.staked"),
                value: total > 0
                    ? convertBigIntToNumber(userInfoStaking["stakedBalance"] - userInfoStaking["lockedInVoting"]) / total * 100
                    : 0,
            },
            {
                type: "Staked in voting",
                value: total > 0
                    ? convertBigIntToNumber(userInfoStaking["lockedInVoting"]) / total * 100
                    : 0,
            },
        ];
        // START TEST

        // const _data = [
        //     { type: "See code", value: 5 },
        //     { type: "Uncomment", value: 20 },
        //     { type: "And remove", value: 30 },
        //     { type: "Placeholder _data", value: 45 },
        // ];
        // END TEST
        setData(_data);
        setTotal(total);
    };

    const getTotal = (): number => {
        return convertBigIntToNumber(userInfoStaking["tgBalance"]) +
        convertBigIntToNumber(userInfoStaking["stakedBalance"] - userInfoStaking["lockedInVoting"]) +
        convertBigIntToNumber(userInfoStaking["totalPendingExpiration"]) +
        convertBigIntToNumber(userInfoStaking["totalAvailableToWithdraw"]) +
        convertBigIntToNumber(userInfoStaking["lockedInVoting"])
        
    };

    // Retrieve CSS color variables
    const colorBalance: string = getComputedStyle(
        document.querySelector(":root") as Element
    ).getPropertyValue("--brand-color-darker");
    const colorProcessing: string = getComputedStyle(
        document.querySelector(":root") as Element
    ).getPropertyValue("--brand-color-dark");
    const colorReady: string = getComputedStyle(
        document.querySelector(":root") as Element
    ).getPropertyValue("--brand-color-base");
    const colorStaked: string = getComputedStyle(
        document.querySelector(":root") as Element
    ).getPropertyValue("--brand-color-light");
    const colorStakedInVoting: string = getComputedStyle(
        document.querySelector(":root") as Element
    ).getPropertyValue("--brand-color-lighter");

    // Custom color palette for the pie chart
    const pieColorPalette: string[] = [
        colorBalance,
        colorProcessing,
        colorReady,
        colorStaked,
        colorStakedInVoting,
    ];

    return (
        <div>
            <div className="pie-chart-total">
                <div className="pie-chart-total-amount">
                    {total ? PrecisionNumbers({
                        amount: toBigIntPrecision(total),
                        token: settings.tokens.TG[0],
                        decimals: 2,
                        //numericLabelParams: {},
                        i18n: i18n                        
                    }) : "--"}
                    {space}
                    {t("staking.governanceToken")}
                </div>
                <div className="pie-chart-total-title">
                    {t("staking.distribution.graph.totalLabel")}
                </div>
            </div>
            <div className="pie-chart-container">
                {/* ResponsiveContainer ensures the chart fits the container */}
                <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                        >
                            {data.map((entry: PieChartData, index: number) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        pieColorPalette[
                                            index % pieColorPalette.length
                                        ]
                                    }
                                />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="dataContainer">
                <div className="dataLabels">
                    {data.map((item: PieChartData) => (
                        <div key={item.type} className="data-row">
                            <div className="data-bullet"></div>
                            <div>{item.type}: </div>
                            <div className="data-numbers">
                                {item.value.toFixed(2)}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PieChartComponent; 