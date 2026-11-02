import { useQuery } from "@tanstack/react-query";
import type { usePublicClient } from "wagmi";

/**
 * Polls the chain's own current block timestamp. Any UI gate that mirrors an
 * on-chain time check (e.g. "is this scheduled action due yet?") must
 * compare against this, not the browser's Date.now() — a chain's own clock
 * can drift arbitrarily far from the real wall clock (a forked/test chain
 * that isn't mined continuously, or in principle a live chain that stalls
 * block production), and the on-chain guard itself only ever checks
 * block.timestamp.
 */
export function useChainTime(
    publicClient: ReturnType<typeof usePublicClient> | undefined,
    refetchInterval = 30_000
): bigint | undefined {
    const { data } = useQuery({
        queryKey: ["chainTime", publicClient?.chain?.id],
        enabled: !!publicClient,
        refetchInterval,
        queryFn: async () => {
            const block = await publicClient!.getBlock();
            return block.timestamp;
        },
    });

    return data;
}
