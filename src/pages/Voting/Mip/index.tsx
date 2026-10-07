import "./Styles.scss";

import { Skeleton } from "antd";
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import BalanceBar from "../../../components/Voting/BalanceBar";
import MipDocument from "../../../components/Voting/MipDocument";
import {
    mipLiveStatus,
    type MipVotingStatus,
    mipVotingStatus,
    useFormatMipDate,
} from "../../../components/Voting/ProposalsHistory";
import VotingCapacityBar from "../../../components/Voting/VotingCapacityBar";
import { divPrecision } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { useLiveVoting } from "../../../hooks/useLiveVoting";
import {
    type MipContent,
    useChangerVotingRecords,
    useMip,
    type VotingRecord,
} from "../../../hooks/useMips";
import { useVotingCapacity } from "../../../hooks/useVotingCapacity";

const explorerUrl = String(
    import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL || ""
).replace(/\/$/, "");

export function ProposalDocument({
    mip,
}: {
    mip: MipContent;
}): React.ReactElement {
    const { t } = useProjectTranslation();
    const [expanded, setExpanded] = useState(false);

    return (
        <section className="layout-card mip-page__document">
            <div
                className={`mip-page__document-frame${expanded ? " mip-page__document-frame--expanded" : ""}`}
            >
                <button
                    className="mip-page__document-preview"
                    type="button"
                    aria-expanded={expanded}
                    aria-controls="mip-document-content"
                    onClick={() => setExpanded((value) => !value)}
                >
                    <span
                        className="mip-page__document-icon"
                        aria-hidden="true"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
                            <path d="M14 3v5h5M8 12h8M8 16h6" />
                        </svg>
                    </span>
                    <span className="mip-page__document-caption">
                        <span
                            id="mip-document-title"
                            className="mip-page__document-preview-title"
                        >
                            {t("voting.mips.documentLabel")}
                        </span>
                        <span className="mip-page__document-caption-meta">
                            {t("voting.mips.documentDescription")}
                        </span>
                    </span>
                    <span className="mip-page__document-action">
                        {t(
                            expanded
                                ? "voting.mips.collapseDetail"
                                : "voting.mips.expandDetail"
                        )}
                        <span
                            className={`mip-page__document-chevron${expanded ? " mip-page__document-chevron--expanded" : ""}`}
                            aria-hidden="true"
                        />
                    </span>
                </button>
                <div id="mip-document-content" hidden={!expanded}>
                    {expanded && <ScrollableDocument mip={mip} />}
                </div>
            </div>
        </section>
    );
}

function ScrollableDocument({ mip }: { mip: MipContent }): React.ReactElement {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ top: false, bottom: false });

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        const updateEdges = () => {
            setEdges({
                top: element.scrollTop > 1,
                bottom:
                    element.scrollHeight -
                        element.clientHeight -
                        element.scrollTop >
                    1,
            });
        };
        element.scrollTop = 0;
        updateEdges();
        element.addEventListener("scroll", updateEdges, { passive: true });
        const observer = new ResizeObserver(updateEdges);
        observer.observe(element);
        if (element.firstElementChild) {
            observer.observe(element.firstElementChild);
        }
        return () => {
            element.removeEventListener("scroll", updateEdges);
            observer.disconnect();
        };
    }, [mip.markdown]);

    return (
        <div className="mip-page__document-viewport">
            <div
                ref={scrollRef}
                className="mip-page__document-scroll"
                role="region"
                aria-labelledby="mip-document-title"
                tabIndex={0}
            >
                <MipDocument markdown={mip.markdown} images={mip.images} />
            </div>
            {edges.top && (
                <div
                    className="mip-page__document-fade mip-page__document-fade--top"
                    aria-hidden="true"
                />
            )}
            {edges.bottom && (
                <div
                    className="mip-page__document-fade mip-page__document-fade--bottom"
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

const VOTING_STAGE: Record<MipVotingStatus, number> = {
    PreVoting: 0,
    Expired: 0,
    NotSelected: 0,
    Unregistered: 0,
    Voting: 1,
    VotingEnded: 1,
    Accepted: 2,
    NoQuorum: 2,
    Vetoed: 2,
    Executed: 3,
    ExecutionFailed: 3,
};

function VotingOutcomeIcon({
    status,
}: {
    status: string;
}): React.ReactElement | null {
    const completed = status === "Executed" || status === "Accepted";
    const stopped = [
        "Expired",
        "NotSelected",
        "Unregistered",
        "NoQuorum",
        "Vetoed",
        "ExecutionFailed",
    ].includes(status);
    if (!completed && !stopped) return null;
    return (
        <span
            className={completed ? "icon-stage-complete" : "icon-stage-stopped"}
            aria-hidden="true"
        />
    );
}

export function ProposalProgress({
    status,
}: {
    status: MipVotingStatus;
}): React.ReactElement {
    const { t } = useProjectTranslation();
    const current = VOTING_STAGE[status];
    const stopped = [
        "Expired",
        "NotSelected",
        "Unregistered",
        "NoQuorum",
        "Vetoed",
        "ExecutionFailed",
    ].includes(status);
    const stages = ["preVoting", "voting", "decision", "execution"];

    return (
        <div className="mip-page__progress-card">
            <div className="mip-page__progress-heading">
                <h2 className="mip-page__mini-title">
                    {t("voting.mips.latestRound")}
                </h2>
                <p className="mip-page__mini-value mip-page__progress-result">
                    {t(`voting.mips.onChain.status.${status}`)}
                    <VotingOutcomeIcon status={status} />
                </p>
                <p className="mip-page__mini-description">
                    {t(`voting.mips.presentation.round.${status}`)}
                </p>
            </div>
            <ol
                className="mip-page__progress"
                aria-label={t("voting.mips.progress.label")}
            >
                {stages.map((stage, index) => (
                    <li
                        key={stage}
                        className={`mip-page__progress-step${index < current || (index === current && status === "Executed") ? " mip-page__progress-step--complete" : ""}${stopped && index > current ? " mip-page__progress-step--unreached" : ""}${index === current ? ` mip-page__progress-step--current${stopped ? " mip-page__progress-step--stopped" : ""}` : ""}`}
                        aria-current={index === current ? "step" : undefined}
                    >
                        <span
                            className="mip-page__progress-marker"
                            aria-hidden="true"
                        >
                            {index < current ||
                            (index === current && status === "Executed") ? (
                                <span className="icon-stage-complete" />
                            ) : (
                                index + 1
                            )}
                        </span>
                        <span className="mip-page__progress-stage">
                            {t(`voting.mips.progress.${stage}`)}
                        </span>
                        {index === current && (
                            <span className="mip-page__progress-caption">
                                {t(
                                    stopped || status === "Executed"
                                        ? "voting.mips.progress.final"
                                        : "voting.mips.progress.current"
                                )}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
}

function ExplorerLink({
    kind,
    value,
}: {
    kind: "address" | "tx";
    value: string;
}): React.ReactElement {
    const { t } = useProjectTranslation();
    return (
        <span
            className={`mip-page__explorer-link mip-page__explorer-link--${kind}`}
        >
            <span className="mip-page__hash">{value}</span>
            {explorerUrl && (
                <a
                    className="mip-page__explorer-action"
                    href={`${explorerUrl}/${kind}/${value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t("voting.mips.openExplorer")} ${value}`}
                    title={t("voting.mips.openExplorer")}
                >
                    <span className="icon-external-link" aria-hidden="true" />
                </a>
            )}
        </span>
    );
}

// In favor vs against of a round over the MOC supply, with the quorum
// threshold, as they were when the round's voting closed (the current values
// while it is still open). Falls back to in favor vs against alone when those
// can't be read from the chain. Rounds that never reached voting show no bar.
function VotesBar({
    record,
}: {
    record: VotingRecord;
}): React.ReactElement | null {
    const { t } = useProjectTranslation();
    const inFavor = BigInt(record.vote.inFavor || "0");
    const against = BigInt(record.vote.against || "0");
    const total = inFavor + against;
    const closedAt = record.voteStep?.blockNumber ?? undefined;
    const { data: capacity, isLoading } = useVotingCapacity(
        closedAt,
        total > 0n
    );
    if (total === 0n) return null;
    if (isLoading) return <Skeleton active paragraph={{ rows: 1 }} />;
    return (
        <div className="mip-page__record-votes">
            {capacity ? (
                <VotingCapacityBar
                    inFavor={inFavor}
                    against={against}
                    supply={capacity.supply}
                    quorum={capacity.quorum}
                />
            ) : (
                <BalanceBar
                    infavorVotes={inFavor}
                    againstVotes={against}
                    infavor={divPrecision(inFavor * 100n, total)}
                    against={divPrecision(against * 100n, total)}
                    infavorLabel={t("voting.mips.onChain.inFavor")}
                    againstLabel={t("voting.mips.onChain.against")}
                />
            )}
        </div>
    );
}

function VotingRecords({ mip }: { mip: MipContent }): React.ReactElement {
    const { t } = useProjectTranslation();
    const { data: records, isLoading } = useChangerVotingRecords(
        mip.changers.map((changer) => changer.address)
    );

    const live = useLiveVoting();

    const closingTx = (record: VotingRecord) =>
        record.acceptedStep?.hash ?? record.voteStep?.hash ?? null;

    // The indexed status of an open round, refined with the live contract
    // state: a pre-vote no longer live has expired, a vote may have ended.
    const displayStatus = (record: VotingRecord): string => {
        const current = live[record.proposal.toLowerCase()];
        if (record.status === "PreVoting") return current ?? "Expired";
        if (record.status === "Voting") return current ?? "Voting";
        return record.status;
    };

    if (isLoading) return <Skeleton active paragraph={{ rows: 1 }} />;
    if (!records?.length) {
        return (
            <p className="mip-page__muted">{t("voting.mips.onChain.none")}</p>
        );
    }
    return (
        <ul className="mip-page__records">
            {records.map((record) => (
                <li key={`${record.proposal}-${record.round}`}>
                    <div className="mip-page__record-heading">
                        <h3 className="mip-page__record-round">
                            {t("voting.mips.onChain.round", {
                                round: record.round,
                            })}
                        </h3>
                        <span
                            className={`mip-page__record-status mip-page__record-status--${displayStatus(record)}`}
                        >
                            {t(
                                `voting.mips.onChain.status.${displayStatus(record)}`
                            )}
                            <VotingOutcomeIcon status={displayStatus(record)} />
                        </span>
                    </div>
                    <VotesBar record={record} />
                    {closingTx(record) && (
                        <div className="mip-page__record-transaction">
                            <span className="mip-page__muted">
                                {t("voting.mips.onChain.transaction")}
                            </span>
                            <ExplorerLink
                                kind="tx"
                                value={closingTx(record)!}
                            />
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}

export default function SectionVotingMip(): React.ReactElement {
    const { t } = useProjectTranslation();
    const { mip: mipParam } = useParams();
    const { data: mip, isError, isLoading } = useMip(mipParam);
    const formatDate = useFormatMipDate();
    const live = useLiveVoting();
    const liveStatus = mip ? mipLiveStatus(mip, live) : undefined;
    const votingStatus = mip ? mipVotingStatus(mip, live) : undefined;

    const back = (
        <Link className="mip-page__back" to="/voting">
            ← {t("voting.mips.back")}
        </Link>
    );

    if (isLoading) {
        return (
            <div className="section-container mip-page">
                {back}
                <div className="layout-card">
                    <Skeleton active />
                </div>
            </div>
        );
    }

    if (!mip) {
        return (
            <div className="section-container mip-page">
                {back}
                <div className="layout-card">
                    <p className="mip-page__muted">
                        {isError
                            ? t("voting.mips.error")
                            : t("voting.mips.notFound")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="section-container mip-page">
            {back}

            <section className="layout-card mip-page__header">
                <div className="mip-page__story">
                    <p className="mip-page__section-label">
                        {t("voting.mips.detail")}
                    </p>
                    <h1 className="mip-page__number">{mip.mip}</h1>
                    {mip.title && (
                        <h2 className="mip-page__proposal-title">
                            {mip.title}
                        </h2>
                    )}
                    {mip.summary && (
                        <p className="mip-page__summary">{mip.summary}</p>
                    )}
                    {(liveStatus === "PreVoting" ||
                        liveStatus === "Voting") && (
                        <div className="mip-page__links">
                            <Link className="mip-page__go-vote" to="/voting">
                                {t("voting.mips.goToVote")} →
                            </Link>
                        </div>
                    )}
                </div>
                <div className="mip-page__metadata">
                    {(mip.date || mip.forumUrl) && (
                        <div className="mip-page__metadata-group">
                            <h2 className="mip-page__mini-title">
                                {t(
                                    mip.date
                                        ? "voting.mips.date"
                                        : "voting.mips.forum"
                                )}
                            </h2>
                            {mip.date && (
                                <time
                                    className="mip-page__mini-value"
                                    dateTime={mip.date}
                                >
                                    {formatDate(mip.date)}
                                </time>
                            )}
                            {mip.forumUrl && (
                                <a
                                    className="mip-page__forum"
                                    href={mip.forumUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t("voting.mips.forum")}
                                    <span
                                        className="icon-external-link"
                                        aria-hidden="true"
                                    />
                                </a>
                            )}
                        </div>
                    )}
                    {mip.status && (
                        <div className="mip-page__metadata-group">
                            <h2 className="mip-page__mini-title">
                                {t("voting.mips.presentation.publicationTitle")}
                            </h2>
                            <p className="mip-page__mini-value">
                                {t(
                                    `voting.mips.presentation.documentState.${mip.status}`
                                )}
                            </p>
                            <p className="mip-page__mini-description">
                                {t(
                                    `voting.mips.presentation.publication.${mip.status}`
                                )}
                            </p>
                        </div>
                    )}
                    {!!mip.tags?.length && (
                        <div className="mip-page__metadata-group">
                            <h2 className="mip-page__mini-title">
                                {t("voting.mips.presentation.areasTitle")}
                            </h2>
                            <p className="mip-page__mini-value">
                                {mip.tags
                                    .map((tag) =>
                                        t(`voting.mips.tags.${tag}`, {
                                            defaultValue: tag,
                                        })
                                    )
                                    .join(" · ")}
                            </p>
                        </div>
                    )}
                    {votingStatus && <ProposalProgress status={votingStatus} />}
                    {mip.executed && (
                        <div className="mip-page__execution">
                            <h2 className="mip-page__mini-title">
                                {t("voting.mips.presentation.executionTitle")}
                            </h2>
                            <p className="mip-page__mini-value">
                                {mip.executedAt
                                    ? t(
                                          "voting.mips.presentation.executionOn",
                                          {
                                              date: formatDate(
                                                  mip.executedAt.slice(0, 10)
                                              ),
                                          }
                                      )
                                    : t(
                                          "voting.mips.presentation.executionConfirmed"
                                      )}
                            </p>
                            {votingStatus !== "Executed" && (
                                <p className="mip-page__mini-description">
                                    {t(
                                        "voting.mips.presentation.separateExecution"
                                    )}
                                </p>
                            )}
                            {mip.executedTx && (
                                <ExplorerLink
                                    kind="tx"
                                    value={mip.executedTx}
                                />
                            )}
                        </div>
                    )}
                </div>
            </section>

            <section className="layout-card mip-page__changers">
                <div className="layout-card-title">
                    <h2>{t("voting.mips.changers.title")}</h2>
                    <p>{t("voting.mips.changers.description")}</p>
                </div>
                <ul className="mip-page__changer-list">
                    {mip.changers.map((changer) => (
                        <li key={changer.address}>
                            <div className="mip-page__contract-identity">
                                <h3 className="mip-page__mini-title">
                                    {t("voting.mips.changers.contractName")}
                                </h3>
                                <span className="mip-page__changer-name">
                                    {changer.name ?? changer.address}
                                </span>
                            </div>
                            <div className="mip-page__contract-address">
                                <h3 className="mip-page__mini-title">
                                    {t("voting.mips.changers.address")}
                                </h3>
                                <ExplorerLink
                                    kind="address"
                                    value={changer.address}
                                />
                            </div>
                            {changer.submitter !== undefined && (
                                <div className="mip-page__submitter">
                                    <h3 className="mip-page__mini-title">
                                        {t("voting.mips.changers.submitter")}
                                    </h3>
                                    {changer.submitter ? (
                                        <ExplorerLink
                                            kind="address"
                                            value={changer.submitter}
                                        />
                                    ) : (
                                        <span className="mip-page__muted">
                                            {t(
                                                "voting.mips.changers.notSubmitted"
                                            )}
                                        </span>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
                <h2 className="mip-page__subtitle">
                    {t("voting.mips.onChain.title")}
                </h2>
                <VotingRecords mip={mip} />
            </section>

            <ProposalDocument key={mip.mip} mip={mip} />
        </div>
    );
}
