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

// Voting status of a MIP: where its latest attempt is, or how it ended.
export type MipVotingStatus =
    | LiveVotingStatus
    | "Expired"
    | "NotSelected"
    | "Unregistered"
    | "NoQuorum"
    // Rejected by votes against (or, where enabled, the collateral veto)
    | "Vetoed"
    | "Executed"
    | "ExecutionFailed";

/**
 * The MIP's voting status. The live contract state wins for the current
 * round (in pre-vote, in vote, vote ended, accepted). Otherwise the API's
 * outcome of its latest indexed attempt, where a pre-vote that is no longer
 * live has expired - the events don't carry the expiration. Undefined when
 * nothing is known (e.g. old mainnet attempts, before it emitted events).
 */
export function mipVotingStatus(
    entry: MipEntry,
    live: Record<string, LiveVotingStatus>
): MipVotingStatus | undefined {
    const current = mipLiveStatus(entry, live);
    if (current) return current;
    switch (entry.outcome) {
        case undefined:
        case null:
            return entry.executed ? "Executed" : undefined;
        case "PreVoting":
            return "Expired";
        default:
            return entry.outcome as MipVotingStatus;
    }
}

// Filter groups of voting statuses
export const VOTING_STATUS_GROUPS: Record<string, MipVotingStatus[]> = {
    inProgress: ["PreVoting", "Voting", "VotingEnded", "Accepted"],
    executed: ["Executed"],
    defeated: ["NoQuorum", "Vetoed", "ExecutionFailed"],
    notAdvanced: ["Expired", "NotSelected", "Unregistered"],
};

const STATUS_STYLE: Record<MipVotingStatus, string> = {
    PreVoting: "live",
    Voting: "live",
    VotingEnded: "live",
    Accepted: "live",
    Executed: "executed",
    NoQuorum: "defeated",
    Vetoed: "defeated",
    ExecutionFailed: "defeated",
    Expired: "inactive",
    NotSelected: "inactive",
    Unregistered: "inactive",
};

export function MipVotingBadge({
    status,
}: {
    status?: MipVotingStatus;
}): React.ReactElement | null {
    const { t } = useProjectTranslation();
    if (!status) return null;
    return (
        <span className={`mip-status mip-status--${STATUS_STYLE[status]}`}>
            {t(`voting.mips.onChain.status.${status}`)}
        </span>
    );
}

// An earlier attempt was executed while the latest one shows another status
// (e.g. the same changer submitted again later).
export function MipExecutedBadge({
    executed,
    status,
}: {
    executed?: boolean;
    status?: MipVotingStatus;
}): React.ReactElement | null {
    const { t } = useProjectTranslation();
    if (!executed || status === "Executed") return null;
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
                        id: "votingStatus",
                        label: t("voting.mips.columns.votingStatus"),
                        allLabel: t("common.dataTable.all"),
                        options: Object.keys(VOTING_STATUS_GROUPS).map(
                            (value) => ({
                                value,
                                label: t(`voting.mips.votingGroups.${value}`),
                            })
                        ),
                        matches: (entry, value) => {
                            // "Executed" also matches an earlier executed
                            // attempt
                            if (value === "executed" && entry.executed)
                                return true;
                            const status = mipVotingStatus(entry, live);
                            return (
                                !!status &&
                                VOTING_STATUS_GROUPS[value].includes(status)
                            );
                        },
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
                            <MipVotingBadge
                                status={mipVotingStatus(entry, live)}
                            />
                            <MipExecutedBadge
                                executed={entry.executed}
                                status={mipVotingStatus(entry, live)}
                            />
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
