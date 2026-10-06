import "./Styles.scss";

import { Skeleton } from "antd";
import React from "react";
import { Link, useParams } from "react-router-dom";

import BalanceBar from "../../../components/Voting/BalanceBar";
import MipDocument from "../../../components/Voting/MipDocument";
import {
    MipExecutedBadge,
    mipLiveStatus,
    MipStatusBadge,
    MipTags,
    MipVotingBadge,
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

function ExplorerLink({
    kind,
    value,
}: {
    kind: "address" | "tx";
    value: string;
}): React.ReactElement {
    const text = <span className="mip-page__hash">{value}</span>;
    return explorerUrl ? (
        <a
            className="mip-page__explorer-link"
            href={`${explorerUrl}/${kind}/${value}`}
            target="_blank"
            rel="noopener noreferrer"
        >
            {text}
            <span className="icon-external-link" aria-hidden="true" />
        </a>
    ) : (
        text
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
                        <span>
                            {t("voting.mips.onChain.round", {
                                round: record.round,
                            })}
                        </span>
                        <span
                            className={`mip-page__record-status mip-page__record-status--${displayStatus(record)}`}
                        >
                            {t(
                                `voting.mips.onChain.status.${displayStatus(record)}`
                            )}
                        </span>
                    </div>
                    <VotesBar record={record} />
                    {closingTx(record) && (
                        <ExplorerLink kind="tx" value={closingTx(record)!} />
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
                <div className="mip-page__meta">
                    <span className="mips-history__mip">{mip.mip}</span>
                    <MipStatusBadge status={mip.status} />
                    <MipVotingBadge status={votingStatus} />
                    <MipExecutedBadge
                        executed={mip.executed}
                        status={votingStatus}
                    />
                    {mip.date && (
                        <span className="mip-page__muted">
                            {formatDate(mip.date)}
                        </span>
                    )}
                    <MipTags tags={mip.tags} />
                </div>
                <h1>{mip.title ?? mip.mip}</h1>
                {mip.summary && (
                    <p className="mip-page__summary">{mip.summary}</p>
                )}
                {(liveStatus === "PreVoting" || liveStatus === "Voting") && (
                    <Link className="mip-page__go-vote" to="/voting">
                        {t("voting.mips.goToVote")} →
                    </Link>
                )}
                {mip.executed && mip.executedTx && (
                    <div className="mip-page__execution">
                        <span className="mip-page__muted">
                            {mip.executedAt
                                ? t("voting.mips.executedOn", {
                                      date: formatDate(
                                          mip.executedAt.slice(0, 10)
                                      ),
                                  })
                                : t("voting.mips.executedTx")}
                        </span>
                        <ExplorerLink kind="tx" value={mip.executedTx} />
                    </div>
                )}
                <div className="mip-page__links">
                    {mip.forumUrl && (
                        <a
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
                    <a
                        href={mip.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t("voting.mips.source")}
                        <span
                            className="icon-external-link"
                            aria-hidden="true"
                        />
                    </a>
                </div>
            </section>

            <section className="layout-card mip-page__changers">
                <div className="layout-card-title">
                    <h1>{t("voting.mips.changers.title")}</h1>
                    <p>{t("voting.mips.changers.description")}</p>
                </div>
                <ul className="mip-page__changer-list">
                    {mip.changers.map((changer) => (
                        <li key={changer.address}>
                            <span className="mip-page__changer-name">
                                {changer.name}
                            </span>
                            <ExplorerLink
                                kind="address"
                                value={changer.address}
                            />
                            {changer.submitter !== undefined && (
                                <span className="mip-page__submitter">
                                    <span className="mip-page__muted">
                                        {t("voting.mips.changers.submitter")}
                                    </span>
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
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
                <h2 className="mip-page__subtitle">
                    {t("voting.mips.onChain.title")}
                </h2>
                <VotingRecords mip={mip} />
            </section>

            <section className="layout-card mip-page__document">
                <MipDocument markdown={mip.markdown} images={mip.images} />
            </section>
        </div>
    );
}
