import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";

// Where a proposal is in pre-voting (see Proposals.tsx):
// - open: still accepting pre-votes until its expiration;
// - selected: expired as the round's winner, waiting for preVoteStep() to
//   start the vote;
// - expired: expired without winning. It can't receive pre-votes anymore and
//   no function removes it this round: its slot is reused by the next
//   proposal submitted.
export type PreVoteStatusKind = "open" | "selected" | "expired";

export default function PreVoteStatus({
    status,
    date,
}: {
    status: PreVoteStatusKind;
    // Formatted expiration
    date: string;
}): React.ReactElement {
    const { t } = useProjectTranslation();
    return (
        <p className={`preVoteStatus preVoteStatus--${status}`}>
            <span className="preVoteStatus__badge">
                {t(`voting.preVoteStatus.${status}.label`)}
            </span>
            <span>{t(`voting.preVoteStatus.${status}.text`, { date })}</span>
        </p>
    );
}
