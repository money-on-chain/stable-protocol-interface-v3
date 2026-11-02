import React, { useCallback, useEffect, useState } from "react";

import { bigIntToInputValue } from "../../helpers/currencies";
import { toBigIntPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings";
import DistributionPieChart from "../Charts/DistributionPieChart";
import { PrecisionNumbers } from "../PrecisionNumbers";

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
    return Number(bigIntToInputValue(amount, "TG", 2));
};

const PieChartComponent: React.FC<PieChartComponentProps> = (props) => {
    const { t, i18n } = useProjectTranslation();
    const [data, setData] = useState<PieChartData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const { userInfoStaking } = props;
    const space: string = "\u00A0";

    // Extract properties to avoid complex expressions in dependency array
    const tgBalance = userInfoStaking.tgBalance;
    const stakedBalance = userInfoStaking.stakedBalance;
    const totalPendingExpiration = userInfoStaking.totalPendingExpiration;
    const totalAvailableToWithdraw = userInfoStaking.totalAvailableToWithdraw;
    const lockedInVoting = userInfoStaking.lockedInVoting;

    const getTotal = useCallback((): number => {
        return (
            convertBigIntToNumber(tgBalance) +
            convertBigIntToNumber(stakedBalance - lockedInVoting) +
            convertBigIntToNumber(totalPendingExpiration) +
            convertBigIntToNumber(totalAvailableToWithdraw) +
            convertBigIntToNumber(lockedInVoting)
        );
    }, [
        tgBalance,
        stakedBalance,
        totalPendingExpiration,
        totalAvailableToWithdraw,
        lockedInVoting,
    ]);

    const readData = useCallback((): void => {
        const total: number = getTotal();
        const _data: PieChartData[] = [
            {
                type: t("staking.distribution.graph.balance"),
                value:
                    total > 0
                        ? (convertBigIntToNumber(tgBalance) / total) * 100
                        : 0,
            },
            {
                type: t("staking.distribution.graph.processingUnstake"),
                value:
                    total > 0
                        ? (convertBigIntToNumber(totalPendingExpiration) /
                              total) *
                          100
                        : 0,
            },
            {
                type: t("staking.distribution.graph.readyWithdraw"),
                value:
                    total > 0
                        ? (convertBigIntToNumber(totalAvailableToWithdraw) /
                              total) *
                          100
                        : 0,
            },
            {
                type: t("staking.distribution.graph.staked"),
                value:
                    total > 0
                        ? (convertBigIntToNumber(
                              stakedBalance - lockedInVoting
                          ) /
                              total) *
                          100
                        : 0,
            },
            {
                type: "Staked in voting",
                value:
                    total > 0
                        ? (convertBigIntToNumber(lockedInVoting) / total) * 100
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
    }, [
        t,
        getTotal,
        tgBalance,
        totalPendingExpiration,
        totalAvailableToWithdraw,
        stakedBalance,
        lockedInVoting,
    ]);

    useEffect(() => {
        readData();
    }, [readData]);

    // CSS references follow theme changes without reading computed colors.
    const pieColorPalette = [
        "var(--brand-color-darker)",
        "var(--brand-color-dark)",
        "var(--brand-color-base)",
        "var(--brand-color-light)",
        "var(--brand-color-lighter)",
    ];

    return (
        <div>
            <div className="pie-chart-total">
                <div className="pie-chart-total-amount">
                    {total
                        ? PrecisionNumbers({
                              amount: toBigIntPrecision(total),
                              token: settings.tokens.TG[0],
                              decimals: 2,
                              i18n: i18n,
                              compact: true,
                          })
                        : "--"}
                    {space}
                    {t("staking.governanceToken")}
                </div>
                <div className="pie-chart-total-title">
                    {t("staking.distribution.graph.totalLabel")}
                </div>
            </div>
            <div className="pie-chart-container">
                <DistributionPieChart
                    slices={data.map((item, index) => ({
                        id: String(index),
                        label: item.type,
                        value: item.value,
                        color: pieColorPalette[index],
                    }))}
                    size={202}
                    borderWidth={1}
                    borderColor="var(--color-txt-primary)"
                    showLegend={false}
                    valueFormatter={(value) => `${value.toFixed(2)}%`}
                    className="staking-distribution-chart"
                />
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
