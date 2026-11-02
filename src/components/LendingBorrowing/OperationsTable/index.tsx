import "./Styles.scss";

import { Table } from "antd";
import React, { useMemo, useState } from "react";

import { useProjectTranslation } from "../../../helpers/translations";

export type LendingOperationCategory = "lending" | "borrowing";

export type LendingOperationType =
    | "deposit"
    | "withdraw"
    | "borrow"
    | "repay"
    | "repay-with-collateral"
    | "deposit-collateral"
    | "withdraw-collateral"
    | "liquidation";

export type LendingOperationStatus = "pending" | "confirmed" | "failed";

export interface OperationAssetMovement {
    amount: string;
    direction: "in" | "out";
    ticker: string;
}

export interface LendingOperation {
    category: LendingOperationCategory;
    collateralTicker?: string;
    id: string;
    movements: OperationAssetMovement[];
    status: LendingOperationStatus;
    timestamp: string;
    transactionHash: string;
    tpTicker: string;
    type: LendingOperationType;
}

interface OperationsTableProps {
    loading?: boolean;
    operations?: LendingOperation[];
}

type OperationFilter = "all" | LendingOperationCategory;

const DEFAULT_FILTER_LABELS: Record<OperationFilter, string> = {
    all: "All",
    lending: "Lending",
    borrowing: "Borrowing",
};

const DEFAULT_STATUS_LABELS: Record<LendingOperationStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    failed: "Failed",
};

const DEFAULT_TYPE_LABELS: Record<LendingOperationType, string> = {
    deposit: "Deposit",
    withdraw: "Withdraw",
    borrow: "Borrow",
    repay: "Repay",
    "repay-with-collateral": "Repay with collateral",
    "deposit-collateral": "Deposit collateral",
    "withdraw-collateral": "Withdraw collateral",
    liquidation: "Liquidation",
};

function truncateHash(hash: string): string {
    return hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : "--";
}

export default function OperationsTable({
    loading = false,
    operations = [],
}: OperationsTableProps): React.ReactElement {
    const { i18n, t } = useProjectTranslation();
    const [filter, setFilter] = useState<OperationFilter>("all");
    const explorerUrl = String(import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL || "").replace(/\/$/, "");

    const filteredOperations = useMemo(
        () => (filter === "all" ? operations : operations.filter((operation) => operation.category === filter)),
        [filter, operations]
    );

    const formatDate = (timestamp: string): string =>
        new Intl.DateTimeFormat(i18n.language, {
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(timestamp));

    const renderMarket = (operation: LendingOperation): React.ReactNode => (
        <div className="lb-operations-table__market">
            <span>{operation.tpTicker}</span>
            {operation.collateralTicker ? (
                <span className="lb-operations-table__market-collateral">/ {operation.collateralTicker}</span>
            ) : null}
        </div>
    );

    const renderMovements = (operation: LendingOperation): React.ReactNode => (
        <div className="lb-operations-table__movements">
            {operation.movements.map((movement, index) => (
                <span
                    className={`lb-operations-table__movement lb-operations-table__movement--${movement.direction}`}
                    key={`${operation.id}-${movement.ticker}-${index}`}
                >
                    {movement.direction === "in" ? "+" : "−"}
                    {movement.amount} {movement.ticker}
                </span>
            ))}
        </div>
    );

    const renderStatus = (status: LendingOperationStatus): React.ReactNode => (
        <span className={`lb-operations-table__status lb-operations-table__status--${status}`}>
            <span className="lb-operations-table__status-icon" aria-hidden="true" />
            {t(`lendingBorrowing.operations.status.${status}`, {
                defaultValue: DEFAULT_STATUS_LABELS[status],
            })}
        </span>
    );

    const renderTransaction = (operation: LendingOperation): React.ReactNode => {
        const content = (
            <>
                {truncateHash(operation.transactionHash)}
                <span aria-hidden="true">↗</span>
            </>
        );

        return explorerUrl ? (
            <a
                className="lb-operations-table__transaction"
                href={`${explorerUrl}/tx/${operation.transactionHash}`}
                rel="noreferrer"
                target="_blank"
            >
                {content}
            </a>
        ) : (
            <span className="lb-operations-table__transaction">{content}</span>
        );
    };

    const columns = [
        {
            title: t("lendingBorrowing.operations.columns.date", { defaultValue: "Date" }),
            dataIndex: "timestamp",
            key: "timestamp",
            width: "18%",
            render: (_value: string, operation: LendingOperation) => (
                <span className="lb-operations-table__date">{formatDate(operation.timestamp)}</span>
            ),
        },
        {
            title: t("lendingBorrowing.operations.columns.operation", { defaultValue: "Operation" }),
            dataIndex: "type",
            key: "type",
            width: "22%",
            render: (_value: LendingOperationType, operation: LendingOperation) => (
                <div className="lb-operations-table__operation">
                    <span>
                        {t(`lendingBorrowing.operations.types.${operation.type}`, {
                            defaultValue: DEFAULT_TYPE_LABELS[operation.type],
                        })}
                    </span>
                    <span className="lb-operations-table__category">
                        {t(`lendingBorrowing.operations.filters.${operation.category}`, {
                            defaultValue: DEFAULT_FILTER_LABELS[operation.category],
                        })}
                    </span>
                </div>
            ),
        },
        {
            title: t("lendingBorrowing.operations.columns.market", { defaultValue: "Market" }),
            key: "market",
            width: "13%",
            render: (_value: unknown, operation: LendingOperation) => renderMarket(operation),
        },
        {
            title: t("lendingBorrowing.operations.columns.movement", { defaultValue: "Movement" }),
            key: "movement",
            width: "18%",
            render: (_value: unknown, operation: LendingOperation) => renderMovements(operation),
        },
        {
            title: t("lendingBorrowing.operations.columns.status", { defaultValue: "Status" }),
            dataIndex: "status",
            key: "status",
            width: "15%",
            render: (status: LendingOperationStatus) => renderStatus(status),
        },
        {
            title: t("lendingBorrowing.operations.columns.transaction", { defaultValue: "Transaction" }),
            key: "transactionHash",
            width: "14%",
            render: (_value: unknown, operation: LendingOperation) => renderTransaction(operation),
        },
    ];

    return (
        <section className="layout-card lb-operations-table">
            <div className="lb-operations-table__header">
                <div className="layout-card-title">
                    <h1>{t("lendingBorrowing.operations.title", { defaultValue: "Activity" })}</h1>
                    <p>
                        {t("lendingBorrowing.operations.description", {
                            defaultValue: "Your latest lending and borrowing transactions.",
                        })}
                    </p>
                </div>
                <div
                    aria-label={t("lendingBorrowing.operations.filterLabel", { defaultValue: "Filter activity" })}
                    className="lb-operations-table__filters"
                    role="group"
                >
                    {(["all", "lending", "borrowing"] as OperationFilter[]).map((value) => (
                        <button
                            aria-pressed={filter === value}
                            className={
                                filter === value
                                    ? "lb-operations-table__filter lb-operations-table__filter--active"
                                    : "lb-operations-table__filter"
                            }
                            key={value}
                            onClick={() => setFilter(value)}
                            type="button"
                        >
                            {t(`lendingBorrowing.operations.filters.${value}`, {
                                defaultValue: DEFAULT_FILTER_LABELS[value],
                            })}
                        </button>
                    ))}
                </div>
            </div>

            <div className="lb-operations-table__desktop">
                <Table<LendingOperation>
                    className="vertical-middle"
                    columns={columns}
                    data-testid="lending-borrowing-operations-table"
                    dataSource={filteredOperations}
                    loading={loading}
                    locale={{
                        emptyText: t("lendingBorrowing.operations.empty", {
                            defaultValue: "No transactions to display.",
                        }),
                    }}
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

            <div className="lb-operations-table__mobile">
                {filteredOperations.map((operation) => (
                    <article className="lb-operations-table__mobile-row" key={operation.id}>
                        <div className="lb-operations-table__mobile-heading">
                            <div className="lb-operations-table__operation">
                                <span>
                                    {t(`lendingBorrowing.operations.types.${operation.type}`, {
                                        defaultValue: DEFAULT_TYPE_LABELS[operation.type],
                                    })}
                                </span>
                                <span className="lb-operations-table__category">
                                    {t(`lendingBorrowing.operations.filters.${operation.category}`, {
                                        defaultValue: DEFAULT_FILTER_LABELS[operation.category],
                                    })}
                                </span>
                            </div>
                            {renderStatus(operation.status)}
                        </div>
                        <div className="lb-operations-table__mobile-details">
                            <div className="lb-operations-table__mobile-field">
                                <span className="lb-operations-table__mobile-label">
                                    {t("lendingBorrowing.operations.columns.market", { defaultValue: "Market" })}
                                </span>
                                {renderMarket(operation)}
                            </div>
                            <div className="lb-operations-table__mobile-field lb-operations-table__mobile-field--right">
                                <span className="lb-operations-table__mobile-label">
                                    {t("lendingBorrowing.operations.columns.movement", {
                                        defaultValue: "Movement",
                                    })}
                                </span>
                                {renderMovements(operation)}
                            </div>
                            <div className="lb-operations-table__mobile-field">
                                <span className="lb-operations-table__mobile-label">
                                    {t("lendingBorrowing.operations.columns.date", { defaultValue: "Date" })}
                                </span>
                                <span className="lb-operations-table__date">{formatDate(operation.timestamp)}</span>
                            </div>
                            <div className="lb-operations-table__mobile-field lb-operations-table__mobile-field--right">
                                <span className="lb-operations-table__mobile-label">
                                    {t("lendingBorrowing.operations.columns.transaction", {
                                        defaultValue: "Transaction",
                                    })}
                                </span>
                                {renderTransaction(operation)}
                            </div>
                        </div>
                    </article>
                ))}
                {!loading && filteredOperations.length === 0 ? (
                    <div className="lb-operations-table__empty">
                        {t("lendingBorrowing.operations.empty", { defaultValue: "No transactions to display." })}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
