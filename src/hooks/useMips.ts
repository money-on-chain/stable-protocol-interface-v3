import { useQuery } from "@tanstack/react-query";

import api from "../services/api";
import { API_OPERATIONS_BASE, apiOperationsUrl } from "../services/apiConfig";
import settings from "../settings";

// MIPs (Money on Chain Improvement Proposals) come from the proposal registry
// (money-on-chain/proposals-changers docs/proposals/proposals.json), served by
// the operations API's /omoc/voting/mips/ endpoints. The API only returns the
// MIPs with a changer on its own network (GOVERNANCE_NETWORK).
//
// Only roc and moc-v1 are governed by these MIPs; flipmoney has its own
// governance and never calls these endpoints.
export const MIPS_ENABLED_PROJECTS = ["roc", "moc-v1"];
export const mipsEnabled = MIPS_ENABLED_PROJECTS.includes(settings.project);

export type MipStatus = "Draft" | "Published" | "Withdrawn";

export interface MipChanger {
    network: string | null;
    name: string | null;
    address: string;
    // Address that submitted the changer for voting (first preVote sender);
    // null until submitted, missing from older API versions
    submitter?: string | null;
    // acceptedStep() transaction that executed it, from the registry
    executedTx?: string | null;
}

// Projects a MIP changes, as tagged in the registry
export const MIP_TAGS = ["doc", "usdrif", "oracles", "voting", "staking"];

export interface MipEntry {
    mip: string;
    title: string | null;
    // Missing from older API versions
    tags?: string[];
    status: MipStatus | null;
    date: string | null;
    summary: string | null;
    forumUrl: string | null;
    file: string;
    documentUrl: string;
    changers: MipChanger[];
    // Whether a changer was executed on this network, from the indexed events
    // (with executedAt) or the registry. Missing from older API versions.
    executed?: boolean;
    executedTx?: string | null;
    executedAt?: string | null;
    // Voting status of the latest indexed attempt (a VotingRecordStatus),
    // "Executed" from the registry alone, or null when unknown. See
    // mipVotingStatus for how the dapp combines it with the live state.
    outcome?: string | null;
    outcomeRound?: number | null;
}

export interface MipContent extends MipEntry {
    markdown: string;
    // Absolute urls of the document's own images, all under assetsBaseUrl:
    // the only images the document renderer loads.
    images: string[];
    assetsBaseUrl: string;
    fetchedAt: string;
}

// On-chain record of a changer in one voting round, from the indexed
// VotingMachine events. Mainnet only emits these events from MIP#263501 on,
// so older proposals have none.
export type VotingRecordStatus =
    | "PreVoting"
    | "Unregistered"
    | "NotSelected"
    | "Voting"
    | "Accepted"
    | "NoQuorum"
    | "Vetoed"
    | "Executed"
    | "ExecutionFailed";

interface VotingTx {
    hash: string | null;
    blockNumber: number | null;
    createdAt: string | null;
}

export interface VotingRecord {
    proposal: string;
    round: number;
    status: VotingRecordStatus;
    proposer: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    preVote: { votes: string; voters: number };
    // inFavor includes the support carried from pre-voting: the voting starts
    // with the winner's pre-vote votes as votes in favor.
    vote: { inFavor: string; against: string; total: string };
    voteStep: (VotingTx & { result: number | null }) | null;
    acceptedStep: (VotingTx & { success: boolean | null }) | null;
}

interface MipListResponse {
    results: MipEntry[];
    total: number;
}

interface ProposalDetailResponse {
    records: VotingRecord[];
}

/** "MIP#263101" -> "263101", the form used in routes and API paths. */
export function mipNumber(mip: string): string {
    return mip.replace(/^MIP#?/i, "");
}

function httpStatus(error: unknown): number | undefined {
    return (error as { response?: { status?: number } })?.response?.status;
}

export function useMipList() {
    return useQuery({
        queryKey: ["mips"],
        enabled: mipsEnabled && !!API_OPERATIONS_BASE,
        staleTime: 5 * 60_000,
        queryFn: async (): Promise<MipEntry[]> => {
            const url = apiOperationsUrl("omoc/voting/mips/");
            url.search = new URLSearchParams({ limit: "100" }).toString();
            const response = (await api<MipListResponse>(
                "get",
                url.toString()
            )) as MipListResponse;
            // The API already leaves drafts out; also drop them here in case
            // an older API version is deployed.
            return (response.results ?? []).filter(
                (entry) => entry.status !== "Draft"
            );
        },
    });
}

/** The MIP's entry and document; null when the API doesn't list it. */
export function useMip(mip: string | undefined) {
    return useQuery({
        queryKey: ["mip", mip],
        enabled: mipsEnabled && !!API_OPERATIONS_BASE && !!mip,
        staleTime: 5 * 60_000,
        retry: (count, error) => httpStatus(error) !== 404 && count < 2,
        queryFn: async (): Promise<MipContent | null> => {
            const url = apiOperationsUrl(
                `omoc/voting/mips/${encodeURIComponent(mip!)}/`
            );
            try {
                const content = (await api<MipContent>(
                    "get",
                    url.toString()
                )) as MipContent;
                // Drafts are not shown (the API returns 404 for them too)
                return content.status === "Draft" ? null : content;
            } catch (error) {
                if (httpStatus(error) === 404) return null;
                throw error;
            }
        },
    });
}

/**
 * The MIP a changer was submitted for, looked up by address, or null when the
 * changer is not in the registry (anyone with enough stake can submit one).
 * Unlike the MIP list it also finds drafts, since a draft's changer can
 * already be in the VotingMachine.
 */
export function useChangerMip(address: string | undefined) {
    const changer = address?.toLowerCase();
    return useQuery({
        queryKey: ["changerMip", changer],
        enabled:
            mipsEnabled &&
            !!API_OPERATIONS_BASE &&
            !!changer &&
            /^0x[0-9a-f]{40}$/.test(changer),
        staleTime: 5 * 60_000,
        retry: (count, error) => httpStatus(error) !== 404 && count < 2,
        queryFn: async (): Promise<MipEntry | null> => {
            const url = apiOperationsUrl(
                `omoc/voting/proposals/${changer}/content/`
            );
            try {
                return (await api<MipContent>(
                    "get",
                    url.toString()
                )) as MipContent;
            } catch (error) {
                if (httpStatus(error) === 404) return null;
                throw error;
            }
        },
    });
}

/** Indexed voting rounds of the given changers, newest first. */
export function useChangerVotingRecords(addresses: string[]) {
    const key = addresses.map((a) => a.toLowerCase()).sort();
    return useQuery({
        queryKey: ["changerVotingRecords", key],
        enabled: mipsEnabled && !!API_OPERATIONS_BASE && key.length > 0,
        refetchInterval: 60_000,
        queryFn: async (): Promise<VotingRecord[]> => {
            const records = await Promise.all(
                key.map(async (address) => {
                    const url = apiOperationsUrl(
                        `omoc/voting/proposals/${address}/`
                    );
                    try {
                        const response = (await api<ProposalDetailResponse>(
                            "get",
                            url.toString()
                        )) as ProposalDetailResponse;
                        return response.records ?? [];
                    } catch (error) {
                        // Not indexed: the changer never reached the
                        // VotingMachine, or it doesn't emit events yet.
                        if (httpStatus(error) === 404) return [];
                        throw error;
                    }
                })
            );
            return records.flat().sort((a, b) => b.round - a.round);
        },
    });
}
