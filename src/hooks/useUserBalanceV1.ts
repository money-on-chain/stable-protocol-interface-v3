import { useMemo } from "react";

import type { Address, MultiCallInput } from "../types/hooks";
import type { DContractsV1, UserBalanceV1Result } from "../types/hooks-v1";
import { useMultiCall } from "./useMulticall";

/**
 * React hook that wraps useMultiCall to fetch v1 ERC20 balances/allowances.
 *
 * RBTC native balance is NOT read here — use the existing, project-agnostic
 * `useBaseCoinBalance` hook (wraps wagmi's useBalance) alongside this one.
 * BPro/DOC are burned directly by the contract on redeem (bproToken.burn /
 * docToken.burn) — no ERC20 allowance needed for redeem, and mint is payable
 * (native value), so neither needs an allowance either.
 * MOC only needs an allowance because a user may opt to pay commission in MOC
 * instead of RBTC (MoCExchange checks balance+allowance via getMoCTokenBalance).
 */
export function useUserBalanceV1(
    contracts?: DContractsV1,
    userAddress?: Address,
    refetchInterval = 30_000
): UserBalanceV1Result {
    const callsRequests = useMemo((): MultiCallInput[] => {
        if (!contracts || !userAddress) return [];

        const { Moc, BProToken, DocToken, MoCToken } = contracts;

        return [
            {
                contract: BProToken,
                functionName: "balanceOf",
                args: [userAddress],
                resultType: "uint256",
                keys: ["BPro", "balance"],
            },
            {
                contract: DocToken,
                functionName: "balanceOf",
                args: [userAddress],
                resultType: "uint256",
                keys: ["DOC", "balance"],
            },
            {
                contract: MoCToken,
                functionName: "balanceOf",
                args: [userAddress],
                resultType: "uint256",
                keys: ["MOC", "balance"],
            },
            {
                contract: MoCToken,
                functionName: "allowance",
                args: [userAddress, Moc.address],
                resultType: "uint256",
                keys: ["MOC", "allowance"],
            },
        ];
    }, [contracts, userAddress]);

    const multicallState = useMultiCall(callsRequests, {
        refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: ["userBalanceV1", userAddress].join(":"),
    });

    return multicallState as unknown as UserBalanceV1Result;
}
