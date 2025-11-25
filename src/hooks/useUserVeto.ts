import { useMemo } from "react";

import type {
    DContracts,
    MultiCallErrorResult,
    MultiCallInput,
} from "../types/hooks";
import type { ContractStatusOmoc, UserBalance } from "../types/status";
import { useMultiCall } from "./useMulticall";

// Track when we last logged errors to prevent spam
const lastProposalErrorLog = 0;
let lastVotingPowerErrorLog = 0;
const ERROR_LOG_THROTTLE = 30_000; // Log at most once every 30 seconds

const onErrorProposal = (): MultiCallErrorResult => {
    /*const now = Date.now();
    if (now - lastProposalErrorLog > ERROR_LOG_THROTTLE) {
        console.warn("Proposal not exist");
        lastProposalErrorLog = now;
    }*/
    return { value: null };
};

const onErrorVotingPower = (): MultiCallErrorResult => {
    const now = Date.now();
    if (now - lastVotingPowerErrorLog > ERROR_LOG_THROTTLE) {
        console.warn(
            "Voting Power on 0n!!. Cannot get voting power!!. Probably problem with TC price provider"
        );
        lastVotingPowerErrorLog = now;
    }
    return { value: 0n };
};

/**
 * Hook to get the voting power from VetoMachine for each TC token and balance.
 */
export function useUserVeto(
    contracts?: DContracts,
    userBalance?: UserBalance,
    contractStatusOmoc?: ContractStatusOmoc,
    userAddress?: string,
    refetchInterval = 30_000
) {
    const callsRequests = useMemo(() => {
        if (!contracts) return [];
        if (!userBalance) return [];
        if (!contractStatusOmoc) return [];

        const callRequest: MultiCallInput[] = [];

        if (contracts.VetoMachine && contracts.VetoMachine.address !== "0x") {
            const collateralTokens = contracts.CollateralToken;
            if (!Array.isArray(collateralTokens)) return callRequest;

            for (let ca = 0; ca < collateralTokens.length; ca++) {
                const CollateralToken = collateralTokens[ca];
                if (!CollateralToken) continue;

                const userTCBalance = userBalance[ca]?.TC?.balance || 0n;
                callRequest.push({
                    contract: contracts.VetoMachine,
                    functionName: "getVotingPower",
                    args: [CollateralToken.address, userTCBalance],
                    resultType: "uint256",
                    keys: [
                        "vetoMachine",
                        "getVotingPower",
                        CollateralToken.address,
                    ],
                    onError: onErrorVotingPower,
                });

                callRequest.push({
                    contract: CollateralToken,
                    functionName: "allowance",
                    args: [userAddress, contracts.VetoMachine.address],
                    resultType: "uint256",
                    keys: ["vetoMachine", "allowance", CollateralToken.address],
                });

                const votingMachineData = contractStatusOmoc.votingmachine;
                if (votingMachineData?.proposalsList) {
                    for (const key in votingMachineData.proposalsList) {
                        const proposal = votingMachineData.proposalsList[key];
                        callRequest.push({
                            contract: contracts.VetoMachine,
                            functionName: "getUserLockedAmount",
                            args: [
                                proposal,
                                userAddress,
                                CollateralToken.address,
                            ],
                            resultType: "uint256",
                            keys: [
                                "vetoMachine",
                                "getUserLockedAmount",
                                userAddress || "",
                                CollateralToken.address,
                                proposal,
                            ],
                            onError: onErrorProposal,
                        });
                    }
                }
            }
        }

        return callRequest;
    }, [contracts, userBalance, contractStatusOmoc, userAddress]);

    const multicallState = useMultiCall(callsRequests, {
        refetchInterval: refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: `userVeto:${userAddress || "no-address"}`,
    });

    return multicallState;
}
