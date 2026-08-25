import "./Styles.scss";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import React from "react";
import { formatUnits } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";
import type { RegisteredOracleInfo } from "../../../hooks/useRegisteredOracles";
import CopyAddress from "../../CopyAddress";

export default function RegisteredOracles(): React.ReactElement {
    const { t } = useProjectTranslation();
    const { registeredOracles, address } = useWalletContext();

    const columns: ColumnsType<RegisteredOracleInfo> = [
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
            render: (stake: bigint) =>
                Number(formatUnits(stake, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                }),
        },
        {
            title: t("oracles.registeredOracles.table.subscribedPairs"),
            dataIndex: "subscribedPairs",
            key: "subscribedPairs",
            render: (pairs: string[]) =>
                pairs.length > 0 ? (
                    <div className="registeredOracles__pairs">
                        {pairs.map((pairName) => (
                            <Tag key={pairName}>
                                {t(`oracles.coinpair.pairMask.${pairName}`, {
                                    defaultValue: pairName,
                                })}
                            </Tag>
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
            <div className="layout-card-title">
                <h1>{t("oracles.registeredOracles.cardTitle")}</h1>
            </div>
            <Table<RegisteredOracleInfo>
                rowKey="owner"
                columns={columns}
                dataSource={registeredOracles.data}
                loading={registeredOracles.isLoading}
                pagination={false}
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
