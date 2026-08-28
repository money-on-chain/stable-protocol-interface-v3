import "./Styles.scss";

import { Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useMemo } from "react";
import { formatUnits, parseUnits } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";
import type { RegisteredOracleInfo } from "../../../hooks/useRegisteredOracles";
import CardHeaderMetrics from "../../CardHeaderMetrics";
import CopyAddress from "../../CopyAddress";

// Not derived from any contract value — RBTC gas cost isn't an on-chain
// parameter. This is a conservative "you're basically out of gas to publish
// a price" floor, not a precise estimate of one publish tx's real cost.
const LOW_GAS_THRESHOLD = parseUnits("0.001", 18);

export default function RegisteredOracles(): React.ReactElement {
    const { i18n, t } = useProjectTranslation();
    const { registeredOracles, address } = useWalletContext();
    const sortedOracles = useMemo(
        () =>
            [...registeredOracles.data].sort((a, b) =>
                b.stake > a.stake ? 1 : b.stake < a.stake ? -1 : 0
            ),
        [registeredOracles.data]
    );
    const totalStake = registeredOracles.data.reduce(
        (total, oracle) => total + oracle.stake,
        0n
    );
    const formattedTotalStake = Number(
        formatUnits(totalStake, 18)
    ).toLocaleString(i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const columns: ColumnsType<RegisteredOracleInfo> = [
        {
            title: "#",
            key: "rank",
            width: 40,
            render: (_value, _record, index) => index + 1,
        },
        {
            title: t("oracles.registeredOracles.table.owner"),
            dataIndex: "owner",
            key: "owner",
            render: (owner: string) => <CopyAddress address={owner} />,
        },
        {
            title: t("oracles.registeredOracles.table.oracleAddress"),
            dataIndex: "oracleAddr",
            key: "oracleAddr",
            render: (oracleAddr: string) => (
                <CopyAddress address={oracleAddr} />
            ),
        },
        {
            title: t("oracles.registeredOracles.table.url"),
            dataIndex: "url",
            key: "url",
        },
        {
            title: t("oracles.registeredOracles.table.stake"),
            dataIndex: "stake",
            key: "stake",
            align: "right",
            render: (stake: bigint) =>
                Number(formatUnits(stake, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                }),
        },
        {
            title: t("oracles.registeredOracles.table.gas"),
            dataIndex: "gas",
            key: "gas",
            align: "right",
            render: (gas: bigint) => {
                const formattedGas = Number(
                    formatUnits(gas, 18)
                ).toLocaleString(undefined, { maximumFractionDigits: 6 });

                if (gas >= LOW_GAS_THRESHOLD) {
                    return <span>{formattedGas}</span>;
                }

                return (
                    <Tooltip
                        title={t(
                            "oracles.registeredOracles.table.lowGasWarning"
                        )}
                    >
                        <span className="registeredOracles__gas--low">
                            {formattedGas}
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            title: t("oracles.registeredOracles.table.subscribedPairs"),
            dataIndex: "subscribedPairs",
            key: "subscribedPairs",
            render: (pairs: string[]) =>
                pairs.length > 0 ? (
                    <div className="registeredOracles__pairs">
                        {pairs.map((pairName) => (
                            <span
                                className="registeredOracles__pair"
                                key={pairName}
                            >
                                {t(`oracles.coinpair.pairMask.${pairName}`, {
                                    defaultValue: pairName,
                                })}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="registeredOracles__noPairs">
                        {t("oracles.registeredOracles.table.noPairs")}
                    </span>
                ),
        },
    ];

    return (
        <div className="layout-card registeredOracles">
            <div className="registeredOracles__header">
                <div className="layout-card-title">
                    <h1>{t("oracles.registeredOracles.cardTitle")}</h1>
                </div>
                <CardHeaderMetrics
                    items={[
                        {
                            label: t(
                                "oracles.registeredOracles.totalStakeLabel"
                            ),
                            value: `${formattedTotalStake} MOC`,
                        },
                    ]}
                />
            </div>
            <Table<RegisteredOracleInfo>
                className="registeredOracles__table"
                rowKey="owner"
                columns={columns}
                dataSource={sortedOracles}
                loading={registeredOracles.isLoading}
                pagination={false}
                scroll={{ x: 960 }}
                rowClassName={(row) =>
                    address && row.owner.toLowerCase() === address.toLowerCase()
                        ? "registeredOracles__row--own"
                        : ""
                }
                locale={{
                    emptyText: t("oracles.registeredOracles.table.empty"),
                }}
            />
        </div>
    );
}
