import { useMemo } from "react";
import { useMultiCall } from "./useMulticall";

const onErrorProposal = () => {
    console.warn("Proposal not exist");
    return { value: null, canOperate: true };
};

/**
 * Hook to get the voting power from VetoMachine for each TC token and balance.
 */
export function useUserVeto(
    contracts?: any,
    userBalance?: any,
    contractStatusOmoc?: any,
    userAddress?: string,
    refetchInterval = 30_000
) {
    const callsRequests = useMemo(() => {
        if (!contracts) return [];
        if (!userBalance) return [];
        if (!contractStatusOmoc) return [];

        const callRequest = [];

        if (contracts.VetoMachine.address) {
            for (let ca = 0; ca < contracts.CollateralToken.length; ca++) {
                const CollateralToken = contracts.CollateralToken[ca];
                const userTCBalance = userBalance[ca].TC.balance || 0n;
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

                for (const key in contractStatusOmoc.votingmachine
                    .getProposalByIndex) {
                    const [proposal, , ,] =
                        contractStatusOmoc.votingmachine.getProposalByIndex[
                            key
                        ];
                    callRequest.push({
                        contract: contracts.VetoMachine,
                        functionName: "getUserLockedAmount",
                        args: [proposal, userAddress, CollateralToken.address],
                        resultType: "uint256",
                        keys: [
                            "vetoMachine",
                            "getUserLockedAmount",
                            userAddress,
                            proposal,
                            CollateralToken.address,
                        ],
                        onError: onErrorProposal,
                    });
                }
            }
        }

        return callRequest;
    }, [contracts, userBalance, contractStatusOmoc, userAddress]);

    const multicallState = useMultiCall(callsRequests, {
        refetchInterval: refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: [
            "userVeto",
            userBalance,
            contractStatusOmoc,
            userAddress,
        ].join(":"),
    });

    return multicallState;
}
