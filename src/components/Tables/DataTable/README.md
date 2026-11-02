# DataTable

`DataTable<T>` renders arbitrary records using React and native browser APIs, without external UI libraries. It has no knowledge of staking, transactions, or other domain fields. Consumers supply records, renderers, matching rules, and translated labels.

Pagination, search, filters, and height reservation are independent opt-in features. By default, all matching records are rendered without pagination.

## Files and styling

- `index.tsx`: public types, search/filter composition, rendering, local pagination, and measured height reservation.
- `FilterSelect.tsx`: internal themed single-select dropdown.
- `Styles.scss`: shared surfaces, typography, controls, pagination, and responsive layout.

Keep section-specific column layouts, status styling, links, and mobile row content in the consumer stylesheet. Use `className` and `headerClassName` as integration hooks. Shared styles use existing theme variables for fonts, text/link colors, surfaces, dividers, and card radii; they work in light and dark themes.

## Rendering modes

Choose one mode; TypeScript prevents passing both `columns` and `renderRow`.

### Custom row

Pass `renderRow(item)` to render one full-width cell per record, and optionally `header` for one header cell. Return content, not `tr` or `td` elements. The consumer owns its internal layout and responsive presentation.

Staking Activity uses this mode; see `../../Staking/LastStakeOperations.tsx`.

### Columns

Pass `columns: readonly DataTableColumn<T>[]` to render separate cells and actual column headers:

```ts
interface DataTableColumn<T> {
    id: string;
    header: React.ReactNode;
    render: (item: T) => React.ReactNode;
    getValue?: (item: T) => unknown;
    align?: "left" | "center" | "right";
    width?: React.CSSProperties["width"];
    className?: string;
}
```

Column IDs must be unique. `getValue` supplies a plain searchable value independently of JSX presentation. `align` applies to the header and cells; `width` applies to the header. `className` applies to both. An omitted `getValue` makes the column unavailable to automatic column search.

Custom-row mode does not expose individual column-header associations to assistive technology; include meaningful labels in custom content. Column mode uses `th scope="col"`.

## Base props

| Prop                                       | Required | Behavior / default                                                                                              |
| ------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------- |
| `items: readonly T[]`                      | Yes      | Loaded records, in display order; never mutated or sorted.                                                      |
| `rowKey(item): React.Key`                  | Yes      | Stable, unique record key.                                                                                      |
| `label: string`                            | Yes      | Accessible table name.                                                                                          |
| `emptyText: ReactNode`                     | Yes      | Content when the original dataset is empty.                                                                     |
| `columns` or `renderRow`                   | Yes      | Choose one rendering mode.                                                                                      |
| `header: ReactNode`                        | No       | Optional header in custom-row mode only.                                                                        |
| `headerClassName: string`                  | No       | Class on `thead`, including consumer-specific mobile visibility.                                                |
| `rowClassName(item): string`               | No       | Record-specific class on `tr`.                                                                                  |
| `loading: boolean`                         | No       | Defaults to `false`; replaces rows with a loading status and disables page controls.                            |
| `loadingText: ReactNode`                   | No       | Loading status content. Supply a translated message when using `loading`.                                       |
| `search: DataTableSearch<T>`               | No       | Enables expandable search.                                                                                      |
| `filters: readonly DataTableFilter<T>[]`   | No       | Enables configured single-select filters.                                                                       |
| `noResultsText: ReactNode`                 | No       | Zero-match message for a nonempty dataset; falls back to `emptyText`.                                           |
| `pagination: false \| DataTablePagination` | No       | Omitted or `false`: no slicing and no pagination footer.                                                        |
| `preserveHeight: boolean`                  | No       | Defaults to `false`; retains measured results height.                                                           |
| `resetKey: string`                         | No       | Dataset identity, such as a wallet. Changes reset the page/height baseline, retaining search and filter values. |
| `className: string`                        | No       | Additional root class.                                                                                          |
| `testId: string`                           | No       | Root `data-testid`.                                                                                             |

## Optional pagination

```ts
interface DataTablePagination {
    pageSize?: number;
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
```

Only provide these labels when enabling pagination. `pageSize` defaults to 8. Finite values are floored and clamped to at least 1; non-finite values fall back to 8. Changing the page size returns to page one.

`showOnSinglePage` defaults to `false`. When enabled, the range remains visible for a single page while page controls are hidden with their space reserved. With pagination enabled, `preserveHeight` also reserves the footer on a single page. Neither option creates a footer when pagination is disabled.

Ranges and page counts refer to matching records. Zero matches call `range(0, 0, 0)`. Desktop shows bounded page numbers with ellipses; at widths up to 760 px it shows a compact page summary. Previous/next labels are accessible names for arrow-only controls.

Staking supplies translated pagination labels explicitly. A consumer displaying an unpaginated list requires none:

```tsx
<DataTable
    items={records}
    rowKey={getRecordKey}
    renderRow={renderRecord}
    label={tableLabel}
    emptyText={emptyMessage}
    pagination={false}
/>
```

## Search scope

```ts
interface DataTableSearch<T> {
    label: string;
    placeholder?: string;
    fields?: readonly (keyof T | ((item: T) => unknown))[];
    columnIds?: readonly string[];
    caseSensitive?: boolean;
    matches?: (item: T, query: string) => boolean;
}
```

Matching precedence:

1. `matches`: custom predicate overrides automatic matching. It receives the trimmed query and controls normalization and matching semantics.
2. `fields`: search one or more record properties or accessor results. Fields combine with **OR**.
3. Column mode: search `getValue` results for `columnIds`, or all columns with `getValue` when `columnIds` is omitted. Columns combine with **OR**.

Examples of search configuration:

```tsx
// One field.
search={{ label: searchLabel, fields: ["transactionHash"] }}

// Multiple fields, including an accessor for a nested or formatted value.
search={{ label: searchLabel, fields: ["name", "symbol", getFormattedAmount] }}

// Selected columns in column mode.
search={{ label: searchLabel, columnIds: ["name", "amount"] }}

// All declared searchable columns in column mode.
search={{ label: searchLabel }}

// Domain-specific matching.
search={{ label: searchLabel, matches: matchesRecord }}
```

Examples illustrate alternative configurations, not literal record data. Supply property keys and accessors appropriate to your record type.

Automatic matching uses case-insensitive substring matching by default; set `caseSensitive: true` to change it. Supported searchable values are strings, numbers, bigints, and booleans. Null/undefined values and objects are ignored. Return a formatted string from an accessor for dates, nested structures, arrays, or localized values.

“All columns” means every declared searchable column, not a serialization of the complete record or its rendered DOM. This avoids unintentionally searching hidden/internal fields. In custom-row mode, declare `fields` or `matches`; without them there are no searchable values. Empty `fields` or `columnIds` arrays likewise provide no searchable values.

Staking currently searches only the complete transaction hash, independently of its shortened displayed form. Other consumers can select any desired scope without changing DataTable.

## Filters and composition

```ts
interface DataTableFilter<T> {
    id: string;
    label: string;
    allLabel: string;
    options: readonly { value: string; label: string }[];
    matches: (item: T, value: string) => boolean;
}
```

IDs must be unique and stable within a table. Option values must be unique; reserve the empty string for the built-in All option. Predicates should be pure. Cleared or removed options are ignored.

Search and active filters combine with **AND**, before pagination. Original record order is preserved. Changes to search or filter selections return to page one. Search/filter state is internal and retained when `resetKey` changes; remount with a React `key` when all internal state must be cleared.

## Interaction and stable layout

Search opens on hover or click; clicking focuses the input. An empty or whitespace-only search closes when pointer/focus leaves its area. Nonempty searches remain open. Escape clears the query, closes the input, and restores button focus. Expansion takes 160 ms and respects reduced-motion preferences. Controls reserve expansion space on desktop and a separate search row on mobile.

Filter menus support arrows, Home/End, Enter/Space, Escape, Tab, and pointer selection. Selection/Escape restores trigger focus. Outside pointer interaction or focus leaving dismisses the menu. Menus render inside the component, not in a portal; avoid clipping ancestors or account for dropdown overflow.

`preserveHeight` retains the largest measured table height for the current width and dataset identity on both desktop and mobile. It reserves actual observed space, not an invented number of blank rows. Fewer results leave space below the table. Width or `resetKey` changes reset the baseline. Measurements are skipped while loading. Without browser `ResizeObserver`, the initial measurement still runs but subsequent content/width changes are not observed.

## Data loading and current boundaries

Pagination, filtering, and search are local operations over `items`. The component never fetches data and cannot search records that have not been loaded.

For a parent-managed infinite list, leave pagination disabled and let the parent append records and manage its loading trigger. DataTable currently has no built-in infinite-scroll observer, server-side pagination, controlled search/filter/page state, sorting, expandable rows, row selection, or configurable scrolling. These are separate capabilities; do not emulate them using arbitrary page sizes or domain logic inside the table.

Provide actionable elements inside cell renderers rather than making entire rows clickable. Keep user-facing strings in project translations. Synchronize project locale sources with their active runtime copies whenever translated strings change.

## Verification

Run `npm run typecheck` and lint changed TypeScript files. Review unpaginated rendering, both row modes, search scopes, combined filters, zero matches, page-size changes, keyboard focus, height reservation, and responsive appearance in the running dapp when changing this component.
