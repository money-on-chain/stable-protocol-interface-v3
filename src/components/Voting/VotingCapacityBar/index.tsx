import "./Styles.scss";

import React from "react";

import { TokenSettings } from "../../../helpers/currencies";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface VotingCapacityBarProps {
    inFavor: bigint;
    against: bigint;
    // MOC total supply: the bar's full width, and what quorum is measured
    // against
    supply: bigint;
    // In-favor votes needed for quorum
    quorum: bigint;
}

/** Share of `part` in `whole` as a percentage with two decimals, 0-100. */
function percent(part: bigint, whole: bigint): number {
    if (whole <= 0n || part <= 0n) return 0;
    return Math.min(100, Number((part * 10000n) / whole) / 100);
}

// In favor and against votes over the MOC total supply, with the quorum
// threshold marked. Quorum counts in-favor votes only, so the in-favor
// segment starts at the left edge and is read against the marker.
export default function VotingCapacityBar({
    inFavor,
    against,
    supply,
    quorum,
}: VotingCapacityBarProps): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const token = TokenSettings("TG");

    const notVoted =
        supply > inFavor + against ? supply - inFavor - against : 0n;
    const inFavorPct = percent(inFavor, supply);
    const againstPct = Math.min(percent(against, supply), 100 - inFavorPct);
    const votedPct = percent(inFavor + against, supply);
    const quorumPct = percent(quorum, supply);
    const quorumReached = inFavor >= quorum;
    const formatPct = (value: number) =>
        new Intl.NumberFormat(i18n.language, {
            maximumFractionDigits: 2,
        }).format(value);
    const amount = (value: bigint) => (
        <>
            {PrecisionNumbers({
                amount: value,
                token,
                decimals: 2,
                i18n,
                compact: true,
            })}{" "}
            {token.name}
        </>
    );

    const legend: [string, bigint, string][] = [
        ["infavor", inFavor, t("voting.mips.onChain.inFavor")],
        ["against", against, t("voting.mips.onChain.against")],
        ["notvoted", notVoted, t("voting.mips.onChain.capacity.notVoted")],
    ];

    return (
        <div className="capacity-bar">
            <div className="capacity-bar__summary">
                <span>
                    {t("voting.mips.onChain.capacity.participation", {
                        pct: formatPct(votedPct),
                    })}{" "}
                    <span className="capacity-bar__muted">
                        ({amount(inFavor + against)} / {amount(supply)})
                    </span>
                </span>
                <span
                    className={`capacity-bar__quorum-status capacity-bar__quorum-status--${
                        quorumReached ? "reached" : "missed"
                    }`}
                >
                    {quorumReached
                        ? t("voting.mips.onChain.capacity.quorumReached")
                        : t("voting.mips.onChain.capacity.quorumNotReached")}
                </span>
            </div>

            <div
                className="capacity-bar__track"
                role="img"
                aria-label={t("voting.mips.onChain.capacity.aria", {
                    inFavor: formatPct(inFavorPct),
                    against: formatPct(againstPct),
                    quorum: formatPct(quorumPct),
                })}
            >
                <div
                    className="capacity-bar__segment capacity-bar__segment--infavor"
                    style={{ width: `${inFavorPct}%` }}
                />
                <div
                    className="capacity-bar__segment capacity-bar__segment--against"
                    style={{ width: `${againstPct}%` }}
                />
                {quorum > 0n && (
                    <div
                        className="capacity-bar__quorum"
                        style={{ left: `${quorumPct}%` }}
                    />
                )}
            </div>
            {quorum > 0n && (
                <div className="capacity-bar__quorum-label-row">
                    <span
                        className="capacity-bar__quorum-label"
                        style={{
                            left: `${quorumPct}%`,
                            // Keep the label inside the bar near its edges
                            transform:
                                quorumPct < 12
                                    ? "none"
                                    : quorumPct > 88
                                      ? "translateX(-100%)"
                                      : undefined,
                        }}
                    >
                        {t("voting.mips.onChain.capacity.quorum", {
                            pct: formatPct(quorumPct),
                        })}
                    </span>
                </div>
            )}

            <ul className="capacity-bar__legend">
                {legend.map(([kind, value, label]) => (
                    <li key={kind}>
                        <span
                            className={`capacity-bar__dot capacity-bar__dot--${kind}`}
                            aria-hidden="true"
                        />
                        <span>{label}</span>
                        <span className="capacity-bar__muted">
                            {amount(value)} ({formatPct(percent(value, supply))}
                            %)
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
