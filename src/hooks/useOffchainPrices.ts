import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { parseUnits } from "viem";

import mapPricesOffchain from "../settings/prices-offchain.json";
import settings from "../settings";
import type { ParsedPrices } from "../types/hooks";

/**
 * Hook to fetch and parse prices from an off-chain API, based on provided settings and contract data.
 */
export function useOffchainPrices(
    refetchInterval = 20_000 // 20 seconds
) {
    const priceApi = import.meta.env.REACT_APP_PRICE_OFFCHAIN_API as
        | string
        | undefined;

    const enabled = typeof priceApi !== "undefined";

    const {
        data: parsedPrices,
        isLoading,
        isFetching,
        error,
        refetch,
    } = useQuery({
        queryKey: ["offchainPrices"],
        enabled,
        refetchInterval,
        queryFn: async () => {

            // Voting project does not use this hook
            if (import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "voting") 
                return [];
            
            const mapPrices = mapPricesOffchain.prices;
            const coinpairs: string[] = [];

            for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                coinpairs.push(mapPrices[ca].CA);
                for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                    coinpairs.push(mapPrices[ca].TP[tp]);
                }
                coinpairs.push(mapPrices[ca].TF);
                coinpairs.push(mapPrices[ca].COINBASE);
            }

            try {
                const response = await axios.get(
                    `${priceApi}api/offchain_prices/`,
                    {
                        params: { coinpairs: coinpairs.join() },
                        timeout: 10000,
                        headers: { "Content-Type": "application/json" },
                    }
                );

                if (response.status === 200) {
                    const parsedPrices: ParsedPrices[] = [];
                    const raw = response.data as unknown;
                    if (
                        typeof raw !== "object" ||
                        raw === null ||
                        typeof (raw as Record<string, unknown>).values !==
                            "object" ||
                        (raw as Record<string, unknown>).values === null
                    ) {
                        throw new Error(
                            "Offchain prices API returned unexpected shape"
                        );
                    }
                    const responseData = raw as {
                        values: Record<string, unknown>;
                    };

                    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                        const caParse: ParsedPrices = {
                            CA: [0n, true],
                            TP: [],
                            TF: [0n, true],
                            COINBASE: [0n, true],
                        };
                        const map = mapPrices[ca];

                        const toPrice = (key: string): bigint => {
                            const v = responseData.values[key];
                            const n =
                                typeof v === "number" && isFinite(v) && v >= 0
                                    ? v
                                    : 0;
                            return parseUnits(n.toFixed(18), 18);
                        };

                        caParse.CA = [toPrice(map.CA), true];
                        caParse.TP = map.TP.map((tp: string) => [
                            toPrice(tp),
                            true,
                        ]);
                        caParse.TF = [toPrice(map.TF), true];
                        caParse.COINBASE = [toPrice(map.COINBASE), true];

                        parsedPrices.push(caParse);
                    }

                    return parsedPrices;
                }
                throw new Error("API returned non-200 status");
            } catch (err) {
                console.error("Error fetching off-chain prices:", err);
                throw err;
            }
        },
    });

    return { parsedPrices, isLoading, isFetching, refetch, error };
}
