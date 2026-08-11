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

interface OperationAssetMovement {
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

// UI-only data. Replace this constant with the API result passed through the
// `operations` prop once the lending operations endpoint is available.
const MOCK_OPERATIONS: LendingOperation[] = [
    {
        id: "mock-1",
        category: "borrowing",
        type: "borrow",
        timestamp: "2026-08-05T17:42:00Z",
        status: "confirmed",
        tpTicker: "USDRIF",
        collateralTicker: "RIF",
        movements: [{ amount: "1,250.00", ticker: "USDRIF", direction: "in" }],
        transactionHash: "0x72d719a74316e27eb54af26095d12469713830aaec506f931b6067ff12d00421",
    },
    {
        id: "mock-2",
        category: "borrowing",
        type: "deposit-collateral",
        timestamp: "2026-08-05T17:40:00Z",
        status: "confirmed",
        tpTicker: "USDRIF",
        collateralTicker: "RIF",
        movements: [{ amount: "15,000.00", ticker: "RIF", direction: "in" }],
        transactionHash: "0xe51fe79afd1991990b226baf0a16653007549f0a2a0c21f50ffef5ec95a31802",
    },
    {
        id: "mock-3",
        category: "lending",
        type: "deposit",
        timestamp: "2026-08-04T14:18:00Z",
        status: "confirmed",
        tpTicker: "USDRIF",
        movements: [{ amount: "2,500.00", ticker: "USDRIF", direction: "in" }],
        transactionHash: "0x326a839706f01cf632af1ebf473cce12724f12735ca26e9d579dee537048ba28",
    },
    {
        id: "mock-4",
        category: "borrowing",
        type: "repay",
        timestamp: "2026-08-03T21:05:00Z",
        status: "pending",
        tpTicker: "USDRIF",
        collateralTicker: "DOC",
        movements: [{ amount: "320.00", ticker: "USDRIF", direction: "out" }],
        transactionHash: "0x0564bf933d38f8d5e05830c33f4f9d6c926e23023f76a95a35351343635f8746",
    },
    {
        id: "mock-5",
        category: "borrowing",
        type: "repay-with-collateral",
        timestamp: "2026-08-02T10:27:00Z",
        status: "confirmed",
        tpTicker: "USDRIF",
        collateralTicker: "RIF",
        movements: [
            { amount: "4,850.00", ticker: "RIF", direction: "out" },
            { amount: "400.00", ticker: "USDRIF", direction: "out" },
        ],
        transactionHash: "0x118bb25a494dc15a57f3ca2ba2768a886185d82299937d151b89b6e0abcccd37",
    },
    {
        id: "mock-6",
        category: "lending",
        type: "withdraw",
        timestamp: "2026-07-30T19:51:00Z",
        status: "failed",
        tpTicker: "USDRIF",
        movements: [{ amount: "750.00", ticker: "USDRIF", direction: "out" }],
        transactionHash: "0xd938cb8f839dd53ba9210f25ea78498c6e8f6928e638881e267e24993dcd2e45",
    },
    {
        id: "mock-7",
        category: "borrowing",
        type: "withdraw-collateral",
        timestamp: "2026-07-28T12:14:00Z",
        status: "confirmed",
        tpTicker: "USDRIF",
        collateralTicker: "DOC",
        movements: [{ amount: "600.00", ticker: "DOC", direction: "out" }],
        transactionHash: "0xa5ce36ff050ceecbb9f8568c97a07ebf244a660460f3a0dbf02bf2623942668b",
    },
    {
        id: "mock-8",
        category: "borrowing",
        type: "liquidation",
        timestamp: "2026-07-25T08:33:00Z",
        status: "confirmed",
        tpTicker: "USDRIF",
        collateralTicker: "RIF",
        movements: [
            { amount: "8,920.00", ticker: "RIF", direction: "out" },
            { amount: "710.00", ticker: "USDRIF", direction: "out" },
        ],
        transactionHash: "0xc30f32747f389eb314502687e9562420b466008279138a2199bf52d12cb4bb05",
    },
];

function truncateHash(hash: string): string {
    return hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : "--";
}

export default function OperationsTable({
    loading = false,
    operations = MOCK_OPERATIONS,
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
