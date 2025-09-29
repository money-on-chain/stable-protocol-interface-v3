import { useMemo } from "react";

import type {
    DContracts,
    MultiCallErrorResult,
    MultiCallInput,
} from "../types/hooks";
import { useMultiCall } from "./useMulticall";

const onErrorProposal = (): MultiCallErrorResult => {
    console.warn("Proposal not exist");
    return { value: null, canOperate: true };
};

/**
 * Hook to get the voting power from VetoMachine for each TC token and balance.
 */
export function useUserVeto(
    contracts?: DContracts,
    userBalance?: Record<string | number, unknown>,
    contractStatusOmoc?: Record<string | number, unknown>,
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

                const userTCBalance =
                    (userBalance[ca] as { TC: { balance: bigint } })?.TC
                        ?.balance || 0n;
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
                });

                callRequest.push({
                    contract: CollateralToken,
                    functionName: "allowance",
                    args: [userAddress, contracts.VetoMachine.address],
                    resultType: "uint256",
                    keys: ["vetoMachine", "allowance", CollateralToken.address],
                });

                const votingMachineData = contractStatusOmoc.votingmachine as {
                    proposalsList: Record<string, unknown[]>;
                };
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
                                proposal as string,
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
