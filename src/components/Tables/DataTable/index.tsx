import "./Styles.scss";

import React, { useState } from "react";

export interface DataTableProps<T> {
    items: readonly T[];
    rowKey: (item: T) => React.Key;
    /** Arbitrary content rendered in the single cell spanning each row. */
    renderRow: (item: T) => React.ReactNode;
    header?: React.ReactNode;
    /** Allows each implementation to style or hide its header independently. */
    headerClassName?: string;
    label: string;
    emptyText: React.ReactNode;
    loading?: boolean;
    loadingText: string;
    paginationLabel: string;
    previousLabel: string;
    nextLabel: string;
    pageLabel: (page: number) => string;
    rangeLabel: (first: number, last: number, total: number) => string;
    pageSummaryLabel: (page: number, totalPages: number) => string;
    pageSize?: number;
    /** Change when switching wallet or filters to return to page one. */
    resetKey?: string;
    className?: string;
    testId?: string;
}

/** Native table with a full-width cell per row and shared responsive pagination. */
export default function DataTable<T>({
    items,
    rowKey,
    renderRow,
    header,
    headerClassName,
    label,
    emptyText,
    loading = false,
    loadingText,
    paginationLabel,
    previousLabel,
    nextLabel,
    pageLabel,
    rangeLabel,
    pageSummaryLabel,
    pageSize = 8,
    resetKey,
    className = "",
    testId,
}: DataTableProps<T>): React.ReactElement {
    const size = Number.isFinite(pageSize)
        ? Math.max(1, Math.floor(pageSize))
        : 8;
    const [selection, setSelection] = useState({ page: 1, resetKey });
    const totalPages = Math.max(1, Math.ceil(items.length / size));
    const page =
        selection.resetKey === resetKey
            ? Math.min(selection.page, totalPages)
            : 1;
    const selectPage = (value: number) =>
        setSelection({ page: value, resetKey });
    // Keep pagination bounded even for long histories.
    const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
        .filter((value) => value >= 1 && value <= totalPages)
        .sort((a, b) => a - b);

    return (
        <div
            className={`data-table ${className}`}
            data-testid={testId}
            aria-busy={loading}
        >
            <table aria-label={label}>
                {header ? (
                    <thead className={headerClassName}>
                        <tr>
                            <th scope="col">{header}</th>
                        </tr>
                    </thead>
                ) : null}
                <tbody>
                    {loading ? (
                        <tr>
                            <td className="data-table__message">
                                <span role="status">{loadingText}</span>
                            </td>
                        </tr>
                    ) : items.length === 0 ? (
                        <tr>
                            <td className="data-table__message">{emptyText}</td>
                        </tr>
                    ) : (
                        items
                            .slice((page - 1) * size, page * size)
                            .map((item) => (
                                <tr key={rowKey(item)}>
                                    <td>{renderRow(item)}</td>
                                </tr>
                            ))
                    )}
                </tbody>
            </table>
            {totalPages > 1 ? (
                <nav
                    className="data-table__pagination"
                    aria-label={paginationLabel}
                >
                    <span className="data-table__range">
                        {rangeLabel(
                            (page - 1) * size + 1,
                            Math.min(page * size, items.length),
                            items.length
                        )}
                    </span>
                    <button
                        className="data-table__direction"
                        type="button"
                        aria-label={previousLabel}
                        disabled={loading || page === 1}
                        onClick={() => selectPage(page - 1)}
                    >
                        <svg
                            aria-hidden="true"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m14 6-6 6 6 6" />
                        </svg>
                    </button>
                    <div className="data-table__pages">
                        {pages.map((value, index) => (
                            <React.Fragment key={value}>
                                {index > 0 && value - pages[index - 1] > 1 ? (
                                    <span aria-hidden="true">…</span>
                                ) : null}
                                <button
                                    type="button"
                                    aria-label={pageLabel(value)}
                                    aria-current={
                                        page === value ? "page" : undefined
                                    }
                                    disabled={loading}
                                    onClick={() => selectPage(value)}
                                >
                                    {value}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    <span className="data-table__summary">
                        {pageSummaryLabel(page, totalPages)}
                    </span>
                    <button
                        className="data-table__direction"
                        type="button"
                        aria-label={nextLabel}
                        disabled={loading || page === totalPages}
                        onClick={() => selectPage(page + 1)}
                    >
                        <svg
                            aria-hidden="true"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m10 6 6 6-6 6" />
                        </svg>
                    </button>
                </nav>
            ) : null}
        </div>
    );
}
