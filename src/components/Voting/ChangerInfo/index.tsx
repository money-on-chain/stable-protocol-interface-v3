import "./Styles.scss";

import React from "react";
import { Link } from "react-router-dom";

import { useProjectTranslation } from "../../../helpers/translations";
import { mipNumber, mipsEnabled, useChangerMip } from "../../../hooks/useMips";
import { MipTags } from "../ProposalsHistory";

const EXPLORER_URL = String(
    import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL ||
        "https://rootstock.blockscout.com"
).replace(/\/$/, "");

interface ChangerProps {
    // ChangeContract address in the VotingMachine
    address: string;
}

// Live voting views (pre-voting cards and the voting stage) show a proposal
// through these two parts, placed where its title and its links go. When the
// changer is in the proposal registry they show its MIP: number (linked to
// its page), title, tags, summary and forum topic. Otherwise - anyone with
// enough stake can submit a changer - just the changer address, as before.
// Both read the same cached lookup.

export function ChangerTitle({
    address,
    testId,
}: ChangerProps & { testId?: string }): React.ReactElement {
    const { data: mip } = useChangerMip(address);
    return (
        <>
            <div className="title" data-testid={testId}>
                {mip ? (mip.title ?? mip.mip) : address}
            </div>
            {mip && (
                <div className="changer-mip">
                    <div className="changer-mip__meta">
                        <Link
                            className="changer-mip__mip"
                            to={`/voting/mip/${mipNumber(mip.mip)}`}
                        >
                            {mip.mip}
                        </Link>
                        <MipTags tags={mip.tags} />
                    </div>
                    {mip.summary && (
                        <p className="changer-mip__summary">{mip.summary}</p>
                    )}
                </div>
            )}
        </>
    );
}

export function ChangerLinks({ address }: ChangerProps): React.ReactElement {
    const { t } = useProjectTranslation();
    const { data: mip } = useChangerMip(address);
    return (
        <>
            {/* The MIP's forum topic. Projects without MIPs keep the forum
                search by address. */}
            {mip?.forumUrl ? (
                <div className="externalLink">
                    <a
                        className="forumLink"
                        href={mip.forumUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t("voting.mips.forum")}
                        <div className="icon-external-link"></div>
                    </a>
                </div>
            ) : (
                !mipsEnabled && (
                    <div className="externalLink">
                        <a
                            className="forumLink"
                            href={`https://forum.moneyonchain.com/search?q=${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t("voting.info.searchForum")}
                            <div className="icon-external-link"></div>
                        </a>
                    </div>
                )
            )}

            <div className="externalLink">
                <a
                    className="forumLink"
                    href={`${EXPLORER_URL}/address/${address}?tab=contract`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {t("voting.info.changeContract")} {address}
                    <span className="icon-external-link"></span>
                </a>
            </div>
        </>
    );
}
