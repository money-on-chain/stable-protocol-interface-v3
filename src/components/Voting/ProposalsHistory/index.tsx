import "./Styles.scss";

import React from "react";
import { Link } from "react-router-dom";

import { useProjectTranslation } from "../../../helpers/translations";
import {
    type LiveVotingStatus,
    useLiveVoting,
} from "../../../hooks/useLiveVoting";
import {
    MIP_TAGS,
    type MipEntry,
    mipNumber,
    type MipStatus,
    useMipList,
} from "../../../hooks/useMips";
import DataTable from "../../Tables/DataTable";

// Drafts are not shown (see useMips)
const STATUSES: MipStatus[] = ["Published", "Withdrawn"];

export function MipStatusBadge({
    status,
}: {
    status: MipStatus | null;
}): React.ReactElement | null {
    const { t } = useProjectTranslation();
    if (!status) return null;
    return (
        <span className={`mip-status mip-status--${status.toLowerCase()}`}>
            {t(`voting.mips.status.${status}`)}
        </span>
    );
}

/** The MIP's live status in the VotingMachine (useLiveVoting), if any. */
export function mipLiveStatus(
    entry: MipEntry,
    live: Record<string, LiveVotingStatus>
): LiveVotingStatus | undefined {
    for (const changer of entry.changers) {
        const status = live[changer.address.toLowerCase()];
        if (status) return status;
    }
    return undefined;
}

export function MipLiveBadge({
    status,
}: {
    status?: LiveVotingStatus;
}): React.ReactElement | null {
    const { t } = useProjectTranslation();
    if (!status) return null;
    return (
        <span className={`mip-status mip-status--live`}>
            {t(`voting.mips.onChain.status.${status}`)}
        </span>
    );
}

export function MipExecutedBadge({
    executed,
}: {
    executed?: boolean;
}): React.ReactElement | null {
    const { t } = useProjectTranslation();
    if (!executed) return null;
    return (
        <span className="mip-status mip-status--executed">
            {t("voting.mips.executed")}
        </span>
    );
}

export function MipTags({
    tags,
}: {
    tags?: string[];
}): React.ReactElement | null {
    const { t } = useProjectTranslation();
    if (!tags?.length) return null;
    return (
        <span className="mip-tags">
            {tags.map((tag) => (
                <span key={tag} className="mip-tag">
                    {t(`voting.mips.tags.${tag}`, { defaultValue: tag })}
                </span>
            ))}
        </span>
    );
}

export function useFormatMipDate(): (date: string | null) => string {
    const { i18n } = useProjectTranslation();
    return (date) =>
        date
            ? new Intl.DateTimeFormat(i18n.language, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
              }).format(new Date(`${date}T00:00:00Z`))
            : "";
}

export default function ProposalsHistory(): React.ReactElement {
    const { t } = useProjectTranslation();
    const { data, isError, isLoading } = useMipList();
    const live = useLiveVoting();
    const formatDate = useFormatMipDate();

    return (
        <section
            className="layout-card mips-history"
            data-testid="mips-history"
        >
            <div className="layout-card-title">
                <h1>{t("voting.mips.title")}</h1>
                <p>{t("voting.mips.description")}</p>
            </div>

            <DataTable<MipEntry>
                items={data ?? []}
                rowKey={(entry) => entry.mip}
                label={t("voting.mips.title")}
                emptyText={
                    isError ? t("voting.mips.error") : t("voting.mips.empty")
                }
                noResultsText={t("common.dataTable.noResults")}
                loading={isLoading}
                loadingText={t("common.dataTable.loading")}
                search={{
                    label: t("common.dataTable.search"),
                    placeholder: t("voting.mips.searchPlaceholder"),
                    fields: ["mip", "title", "summary"],
                }}
                filters={[
                    {
                        id: "status",
                        label: t("voting.mips.columns.status"),
                        allLabel: t("common.dataTable.all"),
                        options: STATUSES.map((value) => ({
                            value,
                            label: t(`voting.mips.status.${value}`),
                        })),
                        matches: (entry, value) => entry.status === value,
                    },
                    {
                        id: "execution",
                        label: t("voting.mips.columns.execution"),
                        allLabel: t("common.dataTable.all"),
                        options: [
                            {
                                value: "executed",
                                label: t("voting.mips.executed"),
                            },
                            {
                                value: "notExecuted",
                                label: t("voting.mips.notExecuted"),
                            },
                        ],
                        matches: (entry, value) =>
                            !!entry.executed === (value === "executed"),
                    },
                    {
                        id: "tag",
                        label: t("voting.mips.columns.tag"),
                        allLabel: t("common.dataTable.all"),
                        options: MIP_TAGS.map((value) => ({
                            value,
                            label: t(`voting.mips.tags.${value}`),
                        })),
                        matches: (entry, value) =>
                            !!entry.tags?.includes(value),
                    },
                ]}
                pagination={{
                    pageSize: 6,
                    labels: {
                        navigation: t("common.dataTable.pagination"),
                        previous: t("common.dataTable.previous"),
                        next: t("common.dataTable.next"),
                        page: (page) => t("common.dataTable.page", { page }),
                        range: (first, last, total) =>
                            t("common.dataTable.range", { first, last, total }),
                        summary: (page, total) =>
                            t("common.dataTable.summary", { page, total }),
                    },
                }}
                preserveHeight
                headerClassName="mips-history__table-header"
                testId="mips-history-table"
                renderRow={(entry) => (
                    <Link
                        className="mips-history__row"
                        to={`/voting/mip/${mipNumber(entry.mip)}`}
                    >
                        <div className="mips-history__heading">
                            <span className="mips-history__mip">
                                {entry.mip}
                            </span>
                            <MipStatusBadge status={entry.status} />
                            <MipExecutedBadge executed={entry.executed} />
                            <MipLiveBadge status={mipLiveStatus(entry, live)} />
                            {entry.date && (
                                <span className="mips-history__date">
                                    {formatDate(entry.date)}
                                </span>
                            )}
                            <MipTags tags={entry.tags} />
                        </div>
                        <span className="mips-history__title">
                            {entry.title ?? entry.mip}
                        </span>
                        {entry.summary && (
                            <p className="mips-history__summary">
                                {entry.summary}
                            </p>
                        )}
                    </Link>
                )}
            />
        </section>
    );
}
