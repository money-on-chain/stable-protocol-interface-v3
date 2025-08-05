import React, { useContext } from "react";
import { Table } from "antd";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../../helpers/translations";
import { formatTimestamp } from "../../../helpers/staking";
import { useWalletContext } from "../../../context/Wallet";


interface VestingDataItem {
    key: number;
    renderRow: React.ReactNode;
}

const precision = (contractDecimals: number): bigint =>
    10n ** BigInt(contractDecimals);

const formatVisibleValue = (amount: string | number, decimals: number): string => {
    return (BigInt(amount) / precision(18)).toString()
        .toFormat(decimals, BigNumber.ROUND_UP, {
            decimalSeparator: ".",
            groupSeparator: ",",
        });
};

export default function VestingSchedule(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { userBalance } = useWalletContext()

    const vestingColumns = [
        {
            dataIndex: "renderRow",
        },
    ];
    const vestingData: VestingDataItem[] = [];

    if (!userBalance.data?.vestingmachine || !userBalance.data?.vestingfactory) {
        return <div>No vesting data available</div>;
    }

    const getParameters = userBalance.data.vestingmachine.getParameters;
    const tgeTimestamp = userBalance.data.vestingfactory.getTGETimestamp;
    const total = userBalance.data.vestingmachine.getTotal;
    const percentMultiplier = 10000;

    const percentages = getParameters.percentages;
    const timeDeltas = getParameters.timeDeltas;
    const deltas = [...timeDeltas];
    if (timeDeltas && timeDeltas[0] !== 0) {
        deltas.unshift(0);
    }

    if (percentages[0] < percentMultiplier) {
        percentages.unshift(10000);
    }

    if (percentages && percentages.length > 0)
        percentages[percentages.length - 1] = 0;

    const percents = percentages.map((x: string | number) =>
        percentMultiplier - x
    );

    let dates: (string | number)[] = [];
    if (deltas) {
        if (tgeTimestamp) {
            // Convert timestamp to date.
            dates = deltas.map((x: string | number) =>
                formatTimestamp(
                    tgeTimestamp + x * 1000
                )
            );
        } else {
            dates = deltas.map((x: string | number) => Number(x) / 60 / 60 / 24);
        }
    }

    const tgeFormat = formatTimestamp(
        tgeTimestamp * 1000
    );

    userBalance.data &&
        getParameters &&
        percents.forEach(function (percent: bigint, itemIndex: number) {
            let strTotal = "";
            if (total && total !== 0) {
                strTotal = (percent * total / percentMultiplier).toString()
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
