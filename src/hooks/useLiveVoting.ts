import { useMemo } from "react";

import { useWalletContext } from "../context/Wallet";

// Where a changer currently is in the VotingMachine. Same names as the
// indexed records' statuses, so the same labels apply.
// VotingEnded: still in the Voting state but past its expiration, waiting
// for someone to call voteStep() and record the result.
export type LiveVotingStatus =
    | "PreVoting"
    | "Voting"
    | "VotingEnded"
    | "Accepted";

type ProposalEntry = [string, bigint, bigint, bigint];

/**
 * Lowercase changer -> its live status, from the VotingMachine state the
 * dapp already polls (getState, getVotingData, getProposalByIndex). Works on
 * every network, including mainnet's VotingMachine that emits no events.
 * Empty until the contract status is loaded.
 */
export function useLiveVoting(): Record<string, LiveVotingStatus> {
    const { contractStatusOmoc } = useWalletContext();

    return useMemo(() => {
        const vm = contractStatusOmoc.data?.votingmachine;
        const live: Record<string, LiveVotingStatus> = {};
        if (!vm) return live;

        const state = Number(vm.getState ?? 0n);
        if (state === 1 || state === 2) {
            // Voting, or accepted and waiting for acceptedStep()
            const winner = vm.getVotingData?.[0];
            const expiration = BigInt(vm.getVotingData?.[3] ?? 0n);
            const now = BigInt(Math.floor(Date.now() / 1000));
            if (winner && !/^0x0{40}$/i.test(winner)) {
                live[winner.toLowerCase()] =
                    state === 2
                        ? "Accepted"
                        : expiration > now
                          ? "Voting"
                          : "VotingEnded";
            }
            return live;
        }

        // Pre-voting: the current round's candidates that haven't expired
        const round = BigInt(vm.getVotingRound ?? 0);
        const now = BigInt(Math.floor(Date.now() / 1000));
        const proposals = (vm.getProposalByIndex ?? {}) as Record<
            number,
            ProposalEntry | undefined
        >;
        for (const entry of Object.values(proposals)) {
            if (!entry) continue;
            const [address, proposalRound, , expiration] = entry;
            if (
                address &&
                BigInt(proposalRound) === round &&
                BigInt(expiration) > now
            ) {
                live[address.toLowerCase()] = "PreVoting";
            }
        }
        return live;
    }, [contractStatusOmoc.data]);
}
