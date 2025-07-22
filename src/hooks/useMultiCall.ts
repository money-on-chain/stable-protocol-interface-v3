import { useReadContracts } from 'wagmi'

type ContractInput =
  | { address: `0x${string}`; abi: any }
  | string // for getBalance

type ResultType = 'uint256' | 'int256' | 'address' | 'bool'

type MultiCallInput = {
  contract: ContractInput
  functionName: string
  args?: any[]
  resultType?: ResultType
  keyName: string | number
  keyIndex?: string | number
  keySubIndex?: string | number
  onError?: () => { value: any; canOperate: boolean }
}

/**
 * Custom hook to simulate MultiCall behavior using wagmi's useReadContracts.
 * It supports hierarchical key mapping, default error fallback values,
 * and both automatic and manual refetching.
 */
export function useMultiCall(
  calls: MultiCallInput[] = [],
  options: {
    refetchInterval?: number
    enabled?: boolean
  } = {}
) {
  // Step 1: Convert call definitions into wagmi-compatible format
  const contracts = calls.map(({ contract, functionName, args }) => {
    const isGetBalance = functionName === 'getBalance'
    const isAddressOnly = typeof contract === 'string'

    if (isGetBalance && isAddressOnly) {
      return {
        address: contract,
        abi: [],
        functionName: 'getBalance',
        type: 'getBalance' as const,
      }
    }

    if (
      typeof contract === 'object' &&
      'address' in contract &&
      'abi' in contract
    ) {
      return {
        address: contract.address,
        abi: contract.abi,
        functionName,
        args,
      }
    }

    throw new Error(`Invalid contract input for function "${functionName}"`)
  })

  // Step 2: Perform the multicall using wagmi hook
  const {
    data: results,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useReadContracts({
    contracts,
    query: {
      refetchInterval: options.refetchInterval ?? 30_000,
      enabled: options.enabled ?? true,
    },
  })

  // Step 3: Structure result into a nested dictionary, handling failures
  const storage: Record<string | number, any> = {}
  let canOperate = true

  results?.forEach((item, i) => {
    const {
      resultType,
      keyName,
      keyIndex,
      keySubIndex,
      onError,
    } = calls[i]

    let value

    if (item.status === 'success') {
      value = item.result
    } else {
      if (onError) {
        const fallback = onError()
        value = fallback.value
        canOperate = fallback.canOperate
      } else {
        switch (resultType) {
          case 'uint256':
          case 'int256':
            value = '0'
            break
          case 'address':
            value = '0x'
            break
          case 'bool':
            value = false
            break
          default:
            value = null
        }
        canOperate = false
        console.warn(`Multicall failed for key [${keyName}] at index ${i}`)
      }
    }

    // Assign value into nested storage structure
    if (keyIndex != null && keySubIndex != null) {
      storage[keyName] ??= {}
      storage[keyName][keyIndex] ??= {}
      storage[keyName][keyIndex][keySubIndex] = value
    } else if (keyIndex != null) {
      storage[keyName] ??= {}
      storage[keyName][keyIndex] = value
    } else {
      storage[keyName] = value
    }
  })

  storage['canOperate'] = canOperate

  return {
    storage,
    isLoading,
    isFetching,
    refetch,
    error,
  }
}
