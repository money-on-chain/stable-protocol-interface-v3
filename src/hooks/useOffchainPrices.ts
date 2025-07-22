import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { parseUnits } from 'viem'

import settings from "../settings/settings.json";
import mapPricesOffchain from "../settings/prices-offchain.json";


/**
 * Hook to fetch and parse prices from an off-chain API, based on provided settings and contract data.
 */
export function useOffchainPrices(
  refetchInterval = 20_000 // 20 seconds
) {
  const priceApi = import.meta.env.REACT_APP_PRICE_OFFCHAIN_API

  const enabled = typeof priceApi !== 'undefined'

  const {
    data: parsedPrices,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['offchainPrices'],
    enabled,
    refetchInterval,
    queryFn: async () => {
      
      const mapPrices = mapPricesOffchain.prices
      const coinpairs: string[] = []

      for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        coinpairs.push(mapPrices[ca].CA)
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
          coinpairs.push(mapPrices[ca].TP[tp])
        }
        coinpairs.push(mapPrices[ca].TF)
        coinpairs.push(mapPrices[ca].COINBASE)
      }

      try {
        const response = await axios.get(`${priceApi}api/offchain_prices/`, {
          params: { coinpairs: coinpairs.join() },
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.status === 200) {
          const parsedPrices: Record<string, any>[] = []

          for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            const caParse: Record<string, any> = {}
            const map = mapPrices[ca]

            caParse.CA = parseUnits(response.data.values[map.CA].toFixed(18), 18)

            caParse.TP = map.TP.map((tp: string) =>
              parseUnits(response.data.values[tp].toFixed(18), 18)
            )

            caParse.TF = parseUnits(response.data.values[map.TF].toFixed(18), 18)
            caParse.COINBASE = parseUnits(response.data.values[map.COINBASE].toFixed(18), 18)

            parsedPrices.push(caParse)
          }

          return parsedPrices
        }
        throw new Error('API returned non-200 status')
      } catch (err) {
        console.error('Error fetching off-chain prices:', err)
        throw err
      }
    },
  })
  
  return { parsedPrices, isLoading, isFetching, refetch, error }
}
