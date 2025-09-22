import { useMemo } from "react";

import VestingMachine from "../contracts/omoc/VestingMachine.json";
import type {
    Address,
    CallRequest,
    ContractInfo,
    DContracts,
    MultiCallInput,
} from "../types/hooks";
import { useMultiCall } from "./useMulticall";

/** Extract ABI from JSON without `any` */
const VestingMachineABI = VestingMachine.abi as readonly unknown[];

/**
 * React hook that wraps useMultiCall to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useUserVesting(
    contracts?: DContracts | null,
    userAddress?: Address,
    userVestingAddress?: Address,
    refetchInterval = 30_000
) {
    // Build the call list in a type-safe way
    const callsRequests: CallRequest[] = useMemo(() => {
        // Early exits: no calls until we have everything needed
        if (!contracts) return [];
        if (!userAddress) return [];
        if (!userVestingAddress) return [];

        // Narrow contracts we need once (TypeScript understands they're defined below)
        const hasAll =
            !!contracts.VestingFactory &&
            !!contracts.TG &&
            !!contracts.StakingMachine &&
            !!contracts.DelayMachine;
        if (!hasAll) return [];

        const vestingMachine: ContractInfo = {
            address: userVestingAddress,
            abi: VestingMachineABI,
            name: "VestingMachine",
            type: "",
        };

        const c = contracts; // shorthand after narrowing

        /** Strongly-typed array instead of `any[]` */
        const callRequest: CallRequest[] = [];

        // ---- VestingFactory ----
        callRequest.push({
            contract: c.VestingFactory!,
            functionName: "isTGEConfigured",
            args: [],
            resultType: "bool",
            keys: ["vestingfactory", "isTGEConfigured"],
        });

        callRequest.push({
            contract: c.VestingFactory!,
            functionName: "getTGETimestamp",
            args: [],
            resultType: "uint256",
            keys: ["vestingfactory", "getTGETimestamp"],
        });

        // ---- VestingMachine ----
        callRequest.push({
            contract: vestingMachine,
            functionName: "getParameters",
            args: [],
            resultType: [
                { type: "uint256[]", name: "percentages" },
                { type: "uint256[]", name: "timeDeltas" },
            ],
            keys: ["vestingmachine", "getParameters"],
        });

        callRequest.push({
            contract: vestingMachine,
            functionName: "getHolder",
            args: [],
            resultType: "address",
            keys: ["vestingmachine", "getHolder"],
        });

        callRequest.push({
            contract: vestingMachine,
            functionName: "getLocked",
            args: [],
            resultType: "uint256",
            keys: ["vestingmachine", "getLocked"],
        });

        callRequest.push({
            contract: vestingMachine,
            functionName: "getAvailable",
            args: [],
            resultType: "uint256",
            keys: ["vestingmachine", "getAvailable"],
        });

        callRequest.push({
            contract: vestingMachine,
            functionName: "isVerified",
            args: [],
            resultType: "bool",
            keys: ["vestingmachine", "isVerified"],
        });

        callRequest.push({
            contract: vestingMachine,
            functionName: "getTotal",
            args: [],
            resultType: "uint256",
            keys: ["vestingmachine", "getTotal"],
        });

        // ---- TG (ERC20) ----
        callRequest.push({
            contract: c.TG!,
            functionName: "balanceOf",
            args: [vestingMachine.address],
            resultType: "uint256",
            keys: ["vestingmachine", "tgBalance"],
        });

        callRequest.push({
            contract: c.TG!,
            functionName: "allowance",
            args: [userAddress, vestingMachine.address],
            resultType: "uint256",
            keys: ["vestingmachine", "tgAllowance"],
        });

        // ---- StakingMachine ----
        callRequest.push({
            contract: c.StakingMachine!,
            functionName: "getBalance",
            args: [vestingMachine.address],
            resultType: "uint256",
            keys: ["vestingmachine", "staking", "balance"],
        });

        callRequest.push({
            contract: c.TG!,
            functionName: "allowance",
            args: [vestingMachine.address, c.StakingMachine!.address],
            resultType: "uint256",
            keys: ["vestingmachine", "staking", "allowance"],
        });

        callRequest.push({
            contract: c.StakingMachine!,
            functionName: "getBalance",
            args: [vestingMachine.address],
            resultType: "uint256",
            keys: ["vestingmachine", "staking", "getBalance"],
        });

        callRequest.push({
            contract: c.StakingMachine!,
            functionName: "getLockedBalance",
            args: [vestingMachine.address],
            resultType: "uint256",
            keys: ["vestingmachine", "staking", "getLockedBalance"],
        });

        callRequest.push({
            contract: c.StakingMachine!,
            functionName: "getLockingInfo",
            args: [vestingMachine.address],
            resultType: [
                { type: "uint256", name: "amount" },
                { type: "uint256", name: "untilTimestamp" },
            ],
            keys: ["vestingmachine", "staking", "getLockingInfo"],
        });

        // ---- DelayMachine ----
        callRequest.push({
            contract: c.DelayMachine!,
            functionName: "getTransactions",
            args: [vestingMachine.address],
            resultType: [
                { type: "uint256[]", name: "ids" },
                { type: "uint256[]", name: "amounts" },
                { type: "uint256[]", name: "expirations" },
            ],
            keys: ["vestingmachine", "delay", "getTransactions"],
        });

        callRequest.push({
            contract: c.DelayMachine!,
            functionName: "getBalance",
            args: [vestingMachine.address],
            resultType: "uint256",
            keys: ["vestingmachine", "delay", "getBalance"],
        });

        callRequest.push({
            contract: c.TG!,
            functionName: "allowance",
            args: [vestingMachine.address, c.DelayMachine!.address],
            resultType: "uint256",
            keys: ["vestingmachine", "delay", "allowance"],
        });

        return callRequest;
    }, [contracts, userAddress, userVestingAddress]);

    // Pass callsRequests into your multicall hook
    // Returning whatever your useMultiCall returns; it's already typed on its side.
    const multicallState = useMultiCall(callsRequests as MultiCallInput[], {
        refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: ["userVesting", userAddress, userVestingAddress].join(":"),
    });

    return multicallState;
}
