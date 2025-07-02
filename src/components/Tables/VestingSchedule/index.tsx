import React, { useContext } from "react";
import { Table } from "antd";
import BigNumber from "bignumber.js";

import { AuthenticateContext } from "../../../context/Auth";
import { useProjectTranslation } from "../../../helpers/translations";
import { formatTimestamp } from "../../../helpers/staking";

interface VestingParameters {
    percentages: (string | number)[];
    timeDeltas: (string | number)[];
}

interface VestingMachine {
    getParameters: VestingParameters;
    getTotal: string | number;
}

interface VestingFactory {
    getTGETimestamp: string | number;
}

interface UserBalanceData {
    vestingmachine?: VestingMachine;
    vestingfactory?: VestingFactory;
}

interface AuthContext {
    userBalanceData: UserBalanceData | null;
}

interface VestingDataItem {
    key: number;
    renderRow: React.ReactNode;
}

const precision = (contractDecimals: number): BigNumber =>
    new BigNumber(10).exponentiatedBy(contractDecimals);

const formatVisibleValue = (amount: string | number, decimals: number): string => {
    return BigNumber(amount)
        .div(precision(18))
        .toFormat(decimals, BigNumber.ROUND_UP, {
            decimalSeparator: ".",
            groupSeparator: ",",
        });
};

export default function VestingSchedule(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const auth = useContext(AuthenticateContext) as AuthContext;

    const vestingColumns = [
        {
            dataIndex: "renderRow",
        },
    ];
    const vestingData: VestingDataItem[] = [];

    if (!auth.userBalanceData?.vestingmachine || !auth.userBalanceData?.vestingfactory) {
        return <div>No vesting data available</div>;
    }

    const getParameters = auth.userBalanceData.vestingmachine.getParameters;
    const tgeTimestamp = auth.userBalanceData.vestingfactory.getTGETimestamp;
    const total = auth.userBalanceData.vestingmachine.getTotal;
    const percentMultiplier = 10000;

    const percentages = getParameters.percentages;
    const timeDeltas = getParameters.timeDeltas;
    const deltas = [...timeDeltas];
    if (timeDeltas && !new BigNumber(timeDeltas[0]).isZero()) {
        deltas.unshift(0);
    }

    if (new BigNumber(percentages[0]).lt(percentMultiplier)) {
        percentages.unshift(10000);
    }

    if (percentages && percentages.length > 0)
        percentages[percentages.length - 1] = 0;

    const percents = percentages.map((x: string | number) =>
        new BigNumber(percentMultiplier).minus(x)
    );

    let dates: (string | number)[] = [];
    if (deltas) {
        if (tgeTimestamp) {
            // Convert timestamp to date.
            dates = deltas.map((x: string | number) =>
                formatTimestamp(
                    new BigNumber(tgeTimestamp).plus(x).times(1000).toNumber()
                )
            );
        } else {
            dates = deltas.map((x: string | number) => Number(x) / 60 / 60 / 24);
        }
    }

    const tgeFormat = formatTimestamp(
        new BigNumber(tgeTimestamp).times(1000).toNumber()
    );

    auth.userBalanceData &&
        getParameters &&
        percents.forEach(function (percent: BigNumber, itemIndex: number) {
            let strTotal = "";
            if (total && !new BigNumber(total).isZero()) {
                strTotal = new BigNumber(percent)
                    .times(total)
                    .div(percentMultiplier)
                    .toString();
            }

            const date_release = new Date(dates[itemIndex]);
            const date_now = new Date();
            const timeDifference = date_release.getTime() - date_now.getTime();
            const dayLefts = Math.round(timeDifference / (1000 * 3600 * 24));

            if (!(tgeFormat === dates[itemIndex])) {
                vestingData.push({
                    key: itemIndex,
                    renderRow: (
                        <div className="renderRow">
                            <div className="releaseDate">
                                {new Date(dates[itemIndex]).toLocaleString(
                                    i18n.language
                                )}
                            </div>
                            <div className="daysToRelease">
                                {dayLefts < 0 ? 0 : dayLefts}
                            </div>
                            <div className="percentage">{`${((percent.toNumber() / percentMultiplier) * 100).toFixed(2)}%`}</div>
                            <div className="amount">
                                {formatVisibleValue(strTotal, 2)}
                            </div>
                            <div className="status">
                                {dayLefts > 0
                                    ? "Vested"
                                    : tgeFormat === dates[itemIndex]
                                      ? "TGE"
                                      : "Released"}
                            </div>
                        </div>
                    ),
                });
            }
        });

    return (
        <>
            <div className="renderHeader">
                <div className="releaseDate">
                    {t("vesting.vestingScheduleColumns.date")}
                </div>
                <div className="daysToRelease">
                    {t("vesting.vestingScheduleColumns.daysLeft")}
                </div>
                <div className="percentage">
                    {t("vesting.vestingScheduleColumns.percent")}
                </div>
                <div className="amount">
                    {t("vesting.vestingScheduleColumns.amount")}
                </div>
                <div className="status">
                    {t("vesting.vestingScheduleColumns.status")}
                </div>
            </div>
            <Table
                columns={vestingColumns}
                dataSource={vestingData}
                pagination={false}
                scroll={{ y: "auto" }}
            />
        </>
    );
}
