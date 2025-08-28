import React, { useContext } from "react";
import { Table } from "antd";

import { useProjectTranslation } from "../../../helpers/translations";
import { formatTimestamp } from "../../../helpers/staking";
import { useWalletContext } from "../../../context/Wallet";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import settings from "../../../settings/settings.json";



interface VestingDataItem {
    key: number;
    renderRow: React.ReactNode;
}


export default function VestingSchedule(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { userVesting } = useWalletContext()

    const vestingColumns = [
        {
            dataIndex: "renderRow",
        },
    ];
    const vestingData: VestingDataItem[] = [];

    if (!userVesting.data?.vestingmachine || !userVesting.data?.vestingfactory) {
        return <div>No vesting data available</div>;
    }

    const getParameters = userVesting.data.vestingmachine.getParameters;
    const tgeTimestamp = userVesting.data.vestingfactory.getTGETimestamp;
    const total = userVesting.data.vestingmachine.getTotal;
    const percentMultiplier = 10000n;

    const [percentages, timeDeltas] = getParameters;

    const deltas = [...timeDeltas];
    if (timeDeltas && timeDeltas[0] !== 0n) {
        deltas.unshift(0n);
    }

    if (percentages[0] < percentMultiplier) {
        percentages.unshift(percentMultiplier);
    }

    if (percentages && percentages.length > 0)
        percentages[percentages.length - 1] = 0n;

    const percents = percentages.map((x: bigint) =>
        percentMultiplier - x
    );

    let dates: (string | number)[] = [];
    if (deltas) {
        if (tgeTimestamp) {
            // Convert timestamp to date.
            dates = deltas.map((x: bigint) =>
                formatTimestamp(
                    Number(tgeTimestamp) + Number(x) * 1000
                )
            );
        } else {
            dates = deltas.map((x: string | number) => Number(x) / 60 / 60 / 24);
        }
    }

    const tgeFormat = formatTimestamp(
        Number(tgeTimestamp) * 1000
    );

    userVesting.data &&
        getParameters &&
        percents.forEach(function (percent: bigint, itemIndex: number) {
            let strTotal: bigint | undefined = undefined;
            if (total && total !== 0n) {
                strTotal = percent * total / percentMultiplier
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
                            <div className="percentage">{`${((Number(percent) / Number(percentMultiplier)) * 100).toFixed(2)}%`}</div>
                            <div className="amount">
                                {PrecisionNumbers({
                                            amount: strTotal || 0n,
                                            token: settings.tokens.TG[0],
                                            decimals: Number(t(
                                                "staking.display_decimals"
                                            )),                                            
                                            i18n: i18n,
                                        })}
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
