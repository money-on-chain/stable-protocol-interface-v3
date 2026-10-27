import { useQuery } from "@tanstack/react-query";

import { useWalletContext } from "../context/Wallet";
import IRegistry from "../contracts/omoc/IRegistry.json";
import VotingMachine from "../contracts/omoc/VotingMachine.json";
import omoc from "../settings/omoc/omoc.json";
import type { Address } from "../types/hooks";

const REGISTRY = import.meta.env.REACT_APP_CONTRACT_IREGISTRY as
    | Address
    | undefined;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface AcceptedStepPriority {
    // Account that submitted the proposal (preVote msg.sender): the wallet,
    // or the VestingMachine when it was submitted in vesting mode
    proposer: Address;
    // Unix seconds until which only the proposer may run acceptedStep()
    deadline: bigint;
}

/**
 * MIP#263501: during a window after a proposal is accepted, only the account
 * that submitted it may run acceptedStep(). Mirrors the VotingMachine guard:
 * the window applies only while acceptedTimestamp, the registry time delta
 * and the proposer are all non-zero.
 * Null when there is no window (or the VotingMachine is not upgraded yet, so
 * the getters revert): anyone may execute.
 */
export function useAcceptedStepPriority(
    winnerProposal: string | undefined,
    enabled = true
) {
    const { publicClient, contractsAddress } = useWalletContext();
    const votingMachine = contractsAddress?.VotingMachine?.address;

    return useQuery({
        queryKey: ["acceptedStepPriority", votingMachine, winnerProposal ?? ""],
        enabled:
            enabled &&
            !!publicClient &&
            !!REGISTRY &&
            !!votingMachine &&
            !!winnerProposal &&
            winnerProposal !== ZERO_ADDRESS,
        refetchInterval: 30_000,
        retry: 1,
        queryFn: async (): Promise<AcceptedStepPriority | null> => {
            const read = (
                address: Address,
                abi: { abi: unknown[] },
                functionName: string,
                args: unknown[] = []
            ) =>
                publicClient!.readContract({
                    address,
                    abi: abi.abi,
                    functionName,
                    args,
                });

            try {
                const [proposer, acceptedTimestamp, timeDelta] =
                    (await Promise.all([
                        read(
                            votingMachine!,
                            VotingMachine,
                            "proposalProposer",
                            [winnerProposal]
                        ),
                        read(
                            votingMachine!,
                            VotingMachine,
                            "proposalAcceptedTimestamp",
                            [winnerProposal]
                        ),
                        read(REGISTRY!, IRegistry, "getUint", [
                            omoc.RegistryConstants
                                .MOC_VOTING_MACHINE_ACCEPTED_STEP_PRIORITY_TIME_DELTA,
                        ]),
                    ])) as [Address, bigint, bigint];

                if (
                    acceptedTimestamp === 0n ||
                    timeDelta === 0n ||
                    proposer.toLowerCase() === ZERO_ADDRESS
                ) {
                    return null;
                }
                return { proposer, deadline: acceptedTimestamp + timeDelta };
            } catch (error) {
                // Pre-MIP#263501 VotingMachine: no proposer getters
                console.warn("useAcceptedStepPriority: cannot read", error);
                return null;
            }
        },
    });
}
