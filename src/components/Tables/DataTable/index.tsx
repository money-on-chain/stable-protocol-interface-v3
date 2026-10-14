import "./Styles.scss";

import React, {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import FilterSelect from "./FilterSelect";

export interface DataTableColumn<T> {
    id: string;
    header: React.ReactNode;
    render: (item: T) => React.ReactNode;
    /** Plain searchable value, separate from rendered JSX. */
    getValue?: (item: T) => unknown;
    align?: "left" | "center" | "right";
    width?: React.CSSProperties["width"];
    className?: string;
}

/** Search one/many declared fields, all searchable columns, or a custom predicate. */
export interface DataTableSearch<T> {
    label: string;
    placeholder?: string;
    fields?: readonly (keyof T | ((item: T) => unknown))[];
    columnIds?: readonly string[];
    caseSensitive?: boolean;
    /** Overrides field/column matching when provided. */
    matches?: (item: T, query: string) => boolean;
}

export interface DataTablePagination {
    pageSize?: number;
    /** Keep the range visible on a single page. Defaults to false. */
    showOnSinglePage?: boolean;
    labels: {
        navigation: string;
        previous: string;
        next: string;
        page: (page: number) => string;
        range: (first: number, last: number, total: number) => string;
        summary: (page: number, totalPages: number) => string;
    };
}

/** Single-select filter. IDs and option values must be unique; reserve "" for All. */
export interface DataTableFilter<T> {
    id: string;
    label: string;
    allLabel: string;
    options: readonly { value: string; label: string }[];
    matches: (item: T, value: string) => boolean;
}

/** Search and filters compose with AND, before pagination. */
export function filterTableItems<T>(
    items: readonly T[],
    search: DataTableSearch<T> | undefined,
    query: string,
    filters: readonly DataTableFilter<T>[],
    values: Record<string, string>,
    columns: readonly DataTableColumn<T>[] = []
): readonly T[] {
    const trimmedQuery = query.trim();
    const matchesSearch = (item: T) => {
        if (!search || !trimmedQuery) return true;
        if (search.matches) return search.matches(item, trimmedQuery);
        const values = search.fields
            ? search.fields.map((field) =>
                  typeof field === "function" ? field(item) : item[field]
              )
            : columns
                  .filter(
                      (column) =>
                          !search.columnIds ||
                          search.columnIds.includes(column.id)
                  )
                  .map((column) => column.getValue?.(item));
        const needle = search.caseSensitive
            ? trimmedQuery
            : trimmedQuery.toLocaleLowerCase();
        return values.some((value) => {
            if (value === null || value === undefined) return false;
            if (
                !["string", "number", "bigint", "boolean"].includes(
                    typeof value
                )
            )
                return false;
            const text =
                typeof value === "string"
                    ? value
                    : typeof value === "number" ||
                        typeof value === "bigint" ||
                        typeof value === "boolean"
                      ? String(value)
                      : "";
            return (
                search.caseSensitive ? text : text.toLocaleLowerCase()
            ).includes(needle);
        });
    };
    return items.filter(
        (item) =>
            matchesSearch(item) &&
            filters.every((filter) => {
                const value = values[filter.id];
                return (
                    !value ||
                    !filter.options.some((option) => option.value === value) ||
                    filter.matches(item, value)
                );
            })
    );
}

export interface DataTableBaseProps<T> {
    items: readonly T[];
    search?: DataTableSearch<T>;
    filters?: readonly DataTableFilter<T>[];
    /** Shown for zero matches in a nonempty dataset; defaults to emptyText. */
    noResultsText?: React.ReactNode;
    rowKey: (item: T) => React.Key;
    /** Header content for custom-row mode. */
    header?: React.ReactNode;
    /** Allows each implementation to style or hide its header independently. */
    headerClassName?: string;
    label: string;
    emptyText: React.ReactNode;
    loading?: boolean;
    loadingText?: React.ReactNode;
    /** Omit or pass false to render every matching item without pagination. */
    pagination?: false | DataTablePagination;
    rowClassName?: (item: T) => string;
    /** Reserve the measured results height and footer across filtering and pages. */
    preserveHeight?: boolean;
    /** Dataset identity: resets pagination/height, but retains search and filters. */
    resetKey?: string;
    className?: string;
    testId?: string;
}

/** Choose either column cells or one custom cell per row. */
export type DataTableProps<T> = DataTableBaseProps<T> &
    (
        | {
              columns: readonly DataTableColumn<T>[];
              renderRow?: never;
              header?: never;
          }
        | { columns?: never; renderRow: (item: T) => React.ReactNode }
    );

/**
 * Client-side table with one full-width cell per record and optional search/filters.
 * Consumers own row layouts, domain matching, and translations. See ./README.md.
 */
export default function DataTable<T>({
    items,
    search,
    filters = [],
    noResultsText,
    rowKey,
    renderRow,
    header,
    headerClassName,
    label,
    emptyText,
    loading = false,
    loadingText,
    pagination = false,
    columns,
    rowClassName,
    preserveHeight = false,
    resetKey,
    className = "",
    testId,
}: DataTableProps<T>): React.ReactElement {
    const controlsId = useId();
    const [query, setQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const searchInput = useRef<HTMLInputElement>(null);
    const searchButton = useRef<HTMLButtonElement>(null);
    const focusSearchOnOpen = useRef(false);
    useEffect(() => {
        if (searchOpen && focusSearchOnOpen.current) {
            searchInput.current?.focus();
            focusSearchOnOpen.current = false;
        }
    }, [searchOpen]);
    const [filterValues, setFilterValues] = useState<Record<string, string>>(
        {}
    );
    const filteredItems = filterTableItems(
        items,
        search,
        query,
        filters,
        filterValues,
        columns
    );
    const pageSize = pagination
        ? (pagination.pageSize ?? 8)
        : Math.max(1, filteredItems.length);
    const size = Number.isFinite(pageSize)
        ? Math.max(1, Math.floor(pageSize))
        : 8;
    const [selection, setSelection] = useState({ page: 1, resetKey, size });
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / size));
    const page =
        selection.resetKey === resetKey && selection.size === size
            ? pagination
                ? Math.min(selection.page, totalPages)
                : 1
            : 1;
    const visibleItems = pagination
        ? filteredItems.slice((page - 1) * size, page * size)
        : filteredItems;
    const selectPage = (value: number) =>
        setSelection({ page: value, resetKey, size });
    const tableRef = useRef<HTMLTableElement>(null);
    const [reservedSize, setReservedSize] = useState({
        key: resetKey,
        width: 0,
        height: 0,
    });
    useLayoutEffect(() => {
        if (!preserveHeight || !tableRef.current) return;
        const table = tableRef.current;
        const measure = () => {
            const { width, height } = table.getBoundingClientRect();
            if (!width || loading) return;
            setReservedSize((current) => {
                const sameLayout =
                    current.key === resetKey &&
                    Math.abs(current.width - width) < 1;
                const nextHeight = sameLayout
                    ? Math.max(current.height, height)
                    : height;
                if (sameLayout && current.height === nextHeight) return current;
                return { key: resetKey, width, height: nextHeight };
            });
        };
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(table);
        return () => observer.disconnect();
    }, [preserveHeight, resetKey, loading]);
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
            {search || filters.length > 0 ? (
                <div
                    className={`data-table__controls${!search ? " data-table__controls--filters-only" : ""}`}
                >
                    <div className="data-table__filters">
                        {filters.map((filter) => (
                            <FilterSelect
                                key={filter.id}
                                id={`${controlsId}-${filter.id}`}
                                label={filter.label}
                                value={filterValues[filter.id] ?? ""}
                                options={[
                                    { value: "", label: filter.allLabel },
                                    ...filter.options,
                                ]}
                                onChange={(value) => {
                                    setFilterValues((current) => ({
                                        ...current,
                                        [filter.id]: value,
                                    }));
                                    selectPage(1);
                                }}
                            />
                        ))}
                    </div>
                    {search ? (
                        <div
                            className={`data-table__search${searchOpen ? " data-table__search--open" : ""}`}
                            onMouseEnter={() => setSearchOpen(true)}
                            onMouseLeave={() => {
                                if (!query.trim()) setSearchOpen(false);
                            }}
                            onBlur={(event) => {
                                if (
                                    !query.trim() &&
                                    !event.currentTarget.contains(
                                        event.relatedTarget
                                    )
                                )
                                    setSearchOpen(false);
                            }}
                        >
                            <button
                                ref={searchButton}
                                type="button"
                                aria-label={search.label}
                                aria-expanded={searchOpen}
                                aria-controls={`${controlsId}-search`}
                                onClick={() => {
                                    focusSearchOnOpen.current = !searchOpen;
                                    setSearchOpen(true);
                                    searchInput.current?.focus();
                                }}
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
                                >
                                    <circle cx="10.5" cy="10.5" r="6.5" />
                                    <path d="m16 16 4 4" />
                                </svg>
                                <span>{search.label}</span>
                            </button>
                            {searchOpen ? (
                                <input
                                    ref={searchInput}
                                    id={`${controlsId}-search`}
                                    aria-label={search.label}
                                    type="search"
                                    value={query}
                                    placeholder={search.placeholder}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        selectPage(1);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Escape") {
                                            event.preventDefault();
                                            setQuery("");
                                            selectPage(1);
                                            setSearchOpen(false);
                                            searchButton.current?.focus();
                                        }
                                    }}
                                />
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
            <div
                className="data-table__results"
                style={{
                    minHeight:
                        preserveHeight && reservedSize.key === resetKey
                            ? reservedSize.height
                            : undefined,
                }}
            >
                <table ref={tableRef} aria-label={label}>
                    {header || columns?.length ? (
                        <thead className={headerClassName}>
                            <tr>
                                {columns ? (
                                    columns.map((column) => (
                                        <th
                                            key={column.id}
                                            scope="col"
                                            className={column.className}
                                            style={{
                                                textAlign: column.align,
                                                width: column.width,
                                            }}
                                        >
                                            {column.header}
                                        </th>
                                    ))
                                ) : (
                                    <th scope="col">{header}</th>
                                )}
                            </tr>
                        </thead>
                    ) : null}
                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={Math.max(1, columns?.length ?? 1)}
                                    className="data-table__message"
                                >
                                    <span role="status">{loadingText}</span>
                                </td>
                            </tr>
                        ) : filteredItems.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={Math.max(1, columns?.length ?? 1)}
                                    className="data-table__message"
                                >
                                    {items.length === 0
                                        ? emptyText
                                        : (noResultsText ?? emptyText)}
                                </td>
                            </tr>
                        ) : (
                            visibleItems.map((item) => (
                                <tr
                                    key={rowKey(item)}
                                    className={rowClassName?.(item)}
                                >
                                    {columns ? (
                                        columns.map((column) => (
                                            <td
                                                key={column.id}
                                                className={column.className}
                                                style={{
                                                    textAlign: column.align,
                                                }}
                                            >
                                                {column.render(item)}
                                            </td>
                                        ))
                                    ) : (
                                        <td>{renderRow(item)}</td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {pagination &&
            (preserveHeight ||
                pagination.showOnSinglePage ||
                totalPages > 1) ? (
                <nav
                    className={`data-table__pagination${totalPages === 1 ? " data-table__pagination--single" : ""}`}
                    aria-label={pagination.labels.navigation}
                >
                    <span className="data-table__range">
                        {pagination.labels.range(
                            filteredItems.length === 0
                                ? 0
                                : (page - 1) * size + 1,
                            Math.min(page * size, filteredItems.length),
                            filteredItems.length
                        )}
                    </span>
                    <button
                        className="data-table__direction"
                        type="button"
                        aria-label={pagination.labels.previous}
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
                                    aria-label={pagination.labels.page(value)}
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
                        {pagination.labels.summary(page, totalPages)}
                    </span>
                    <button
                        className="data-table__direction"
                        type="button"
                        aria-label={pagination.labels.next}
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
