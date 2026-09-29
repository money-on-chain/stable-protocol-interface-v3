import "./LastStakeOperations.scss";

import { Table } from "antd";
import React from "react";

import { useWalletContext } from "../../context/Wallet";
import type {
    StakingActivity,
    StakingActivityType,
} from "../../helpers/stakingActivity";
import { useProjectTranslation } from "../../helpers/translations";
import { useStakingActivity } from "../../hooks/useStakingActivity";
import settings from "../../settings";
import { PrecisionNumbers } from "../PrecisionNumbers";

type StatusKind =
    | "confirmed"
    | "pending"
    | "available"
    | "withdrawn"
    | "restaked";

function truncateHash(hash: string): string {
    return hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : "--";
}

export default function LastStakeOperations(): React.ReactElement {
    const { i18n, t } = useProjectTranslation();
    const { address, isConnected, vestingAddress } = useWalletContext();
    // Vesting holders stake through their vesting contract, so that's the
    // address the staking events are emitted for.
    const stakerAddress = isConnected ? (vestingAddress ?? address) : undefined;
    const { activity, isError, isLoading } = useStakingActivity(stakerAddress);
    const explorerUrl = String(
        import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL || ""
    ).replace(/\/$/, "");
    const token = settings.tokens.TG[0];

    const formatDate = (timestamp: string): string =>
        new Intl.DateTimeFormat(i18n.language, {
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(timestamp));

    const renderType = (type: StakingActivityType): React.ReactNode => (
        <span className="staking-activity__operation">
            {t(`staking.history.types.${type}`)}
        </span>
    );

    const renderAmount = (operation: StakingActivity): React.ReactNode => (
        <span className="staking-activity__amount">
            {PrecisionNumbers({
                amount: operation.amount,
                token: token,
                decimals: Number(t("staking.display_decimals")),
                i18n: i18n,
                compact: true,
            })}{" "}
            {token.name}
        </span>
    );

    const renderStatus = (operation: StakingActivity): React.ReactNode => {
        const kind: StatusKind = operation.unstakeState ?? "confirmed";
        return (
            <span
                className={`staking-activity__status staking-activity__status--${kind}`}
            >
                {kind === "pending" && operation.unlockTimestamp
                    ? t("staking.history.status.pending", {
                          date: formatDate(operation.unlockTimestamp),
                      })
                    : t(`staking.history.status.${kind}`)}
            </span>
        );
    };

    const renderTransaction = (operation: StakingActivity): React.ReactNode => {
        const content = (
            <>
                {truncateHash(operation.transactionHash)}
                <span aria-hidden="true">↗</span>
            </>
        );

        return explorerUrl ? (
            <a
                className="staking-activity__transaction"
                href={`${explorerUrl}/tx/${operation.transactionHash}`}
                rel="noreferrer"
                target="_blank"
            >
                {content}
            </a>
        ) : (
            <span className="staking-activity__transaction">{content}</span>
        );
    };

    const columns = [
        {
            title: t("staking.history.columns.date"),
            key: "timestamp",
            width: "22%",
            render: (_value: unknown, operation: StakingActivity) => (
                <span className="staking-activity__date">
                    {formatDate(operation.timestamp)}
                </span>
            ),
        },
        {
            title: t("staking.history.columns.operation"),
            key: "type",
            width: "14%",
            render: (_value: unknown, operation: StakingActivity) =>
                renderType(operation.type),
        },
        {
            title: t("staking.history.columns.amount"),
            key: "amount",
            width: "20%",
            render: (_value: unknown, operation: StakingActivity) =>
                renderAmount(operation),
        },
        {
            title: t("staking.history.columns.status"),
            key: "status",
            width: "26%",
            render: (_value: unknown, operation: StakingActivity) =>
                renderStatus(operation),
        },
        {
            title: t("staking.history.columns.transaction"),
            key: "transactionHash",
            width: "18%",
            render: (_value: unknown, operation: StakingActivity) =>
                renderTransaction(operation),
        },
    ];

    const emptyText = isError
        ? t("staking.history.error")
        : t("staking.history.empty");

    return (
        <section
            id="stakingActivityCard"
            className="layout-card staking-activity"
            data-testid="staking-activity"
        >
            <div className="layout-card-title">
                <h1>{t("staking.history.title")}</h1>
                <p>{t("staking.history.description")}</p>
            </div>

            <div className="staking-activity__desktop">
                <Table<StakingActivity>
                    className="vertical-middle"
                    columns={columns}
                    data-testid="staking-activity-table"
                    dataSource={activity}
                    loading={isLoading}
                    locale={{ emptyText }}
                    pagination={{
                        hideOnSinglePage: true,
                        pageSize: 8,
                        position: ["bottomRight"],
                        showSizeChanger: false,
                    }}
                    rowKey="id"
                    tableLayout="fixed"
                />
            </div>

            <div className="staking-activity__mobile">
                {activity.map((operation) => (
                    <article
                        className="staking-activity__mobile-row"
                        key={operation.id}
                    >
                        <div className="staking-activity__mobile-heading">
                            {renderType(operation.type)}
                            {renderStatus(operation)}
                        </div>
                        <div className="staking-activity__mobile-details">
                            <div className="staking-activity__mobile-field">
                                <span className="staking-activity__mobile-label">
                                    {t("staking.history.columns.amount")}
                                </span>
                                {renderAmount(operation)}
                            </div>
                            <div className="staking-activity__mobile-field staking-activity__mobile-field--right">
                                <span className="staking-activity__mobile-label">
                                    {t("staking.history.columns.date")}
                                </span>
                                <span className="staking-activity__date">
                                    {formatDate(operation.timestamp)}
                                </span>
                            </div>
                            <div className="staking-activity__mobile-field">
                                <span className="staking-activity__mobile-label">
                                    {t("staking.history.columns.transaction")}
                                </span>
                                {renderTransaction(operation)}
                            </div>
                        </div>
                    </article>
                ))}
                {!isLoading && activity.length === 0 ? (
                    <div className="staking-activity__empty">{emptyText}</div>
                ) : null}
            </div>
        </section>
    );
}
