import { useQuery } from "@tanstack/react-query";

import { useWalletContext } from "../context/Wallet";
import IERC20 from "../contracts/omoc/IERC20.json";
import IRegistry from "../contracts/omoc/IRegistry.json";
import omoc from "../settings/omoc/omoc.json";
import type { Address } from "../types/hooks";

const REGISTRY = import.meta.env.REACT_APP_CONTRACT_IREGISTRY as
    | Address
    | undefined;

export interface VotingCapacity {
    // MOC token total supply: what the VotingMachine measures quorum against
    supply: bigint;
    // In-favor votes required for quorum:
    // supply * MIN_PCT_FOR_QUORUM / PCT_PRECISION (20% mainnet, 14% testnet)
    quorum: bigint;
}

/**
 * MOC supply and the quorum threshold as they were at `blockNumber` (the
 * block a round's voting closed), or the current ones when it is undefined.
 * Read from the chain: they are not part of the indexed voting events.
 * Null when they can't be read (e.g. a node without that block's state).
 */
export function useVotingCapacity(
    blockNumber: number | undefined,
    enabled = true
) {
    const { publicClient } = useWalletContext();

    return useQuery({
        queryKey: ["votingCapacity", REGISTRY, blockNumber ?? "latest"],
        enabled: enabled && !!publicClient && !!REGISTRY,
        // Past blocks never change; the latest values are refreshed
        staleTime: blockNumber !== undefined ? Infinity : 60_000,
        retry: 1,
        queryFn: async (): Promise<VotingCapacity | null> => {
            const at =
                blockNumber !== undefined
                    ? { blockNumber: BigInt(blockNumber) }
                    : {};
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
                    ...at,
                });

            try {
                const constants = omoc.RegistryConstants;
                const [token, quorumPct, precision] = (await Promise.all([
                    read(REGISTRY!, IRegistry, "getAddress", [
                        constants.MOC_TOKEN,
                    ]),
                    read(REGISTRY!, IRegistry, "getUint", [
                        constants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_FOR_QUORUM,
                    ]),
                    read(REGISTRY!, IRegistry, "getUint", [
                        constants.MOC_VOTING_MACHINE_PCT_PRECISION,
                    ]),
                ])) as [Address, bigint, bigint];
                const supply = (await read(
                    token,
                    IERC20,
                    "totalSupply"
                )) as bigint;

                if (supply === 0n || precision === 0n) return null;
                return { supply, quorum: (supply * quorumPct) / precision };
            } catch (error) {
                console.warn("useVotingCapacity: cannot read", error);
                return null;
            }
        },
    });
}
