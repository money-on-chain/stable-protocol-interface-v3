import { useMemo } from "react";

import type { DContracts, MultiCallInput } from "../types/hooks";
import type { UseIncentiveV2Result } from "../types/status";
import { useMultiCall } from "./useMulticall";

/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useIncentiveV2(
    contracts?: DContracts,
    userAddress?: string,
    refetchInterval = 30_000
): UseIncentiveV2Result {
    const callsRequests = useMemo(() => {
        if (!contracts) return [];
        if (!userAddress) return [];

        const callRequest: MultiCallInput[] = [];

        // Incentive V2
        if (contracts.IncentiveV2 && contracts.TG) {
            callRequest.push({
                contract: contracts.TG,
                functionName: "balanceOf",
                args: [contracts.IncentiveV2.address],
                resultType: "uint256",
                keys: ["incentiveV2", "contractBalance"],
            });

            callRequest.push({
                contract: contracts.IncentiveV2,
                functionName: "get_balance",
                args: [userAddress],
                resultType: "uint256",
                keys: ["incentiveV2", "userBalance"],
            });
        }

        return callRequest;
    }, [contracts, userAddress]);

    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
        refetchInterval: refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: ["userIncentiveV2", userAddress].join(":"),
    });

    return multicallState as unknown as UseIncentiveV2Result;
}
