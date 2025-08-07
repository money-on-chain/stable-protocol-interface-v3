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
  keys: (string | number)[]
  transform?: (result: any) => any
  onError?: () => { value: any; canOperate: boolean }
}

export interface UseStorageResult<T> {
  data: T | undefined
  isLoading: boolean
  isFetching: boolean
  refetch: () => Promise<{ data: T }>
  error: Error | null
}

/**
 * Assigns a value into a nested object structure given a path of keys.
 */
function assignNestedValue(obj: any, path: (string | number)[], value: any) {
  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (current[key] == null) {
      current[key] = typeof path[i + 1] === 'number' ? [] : {}
    }
    current = current[key]
  }
  current[path[path.length - 1]] = value
}


function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || typeof source !== 'object' || target == null || source == null) {
    return source
  }

  const merged = Array.isArray(target) ? [...target] : { ...target }

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        typeof merged[key] === 'object' &&
        merged[key] !== null
      ) {
        merged[key] = deepMerge(merged[key], source[key])
      } else {
        merged[key] = source[key]
      }
    }
  }

  return merged
}

/**
 * Custom hook to simulate multicall behavior using wagmi's useReadContracts.
 * It supports deeply nested storage mapping, error fallbacks, and custom value transforms.
 */
export function useMultiCall(
  calls: MultiCallInput[] = [],
  options: {
    batchSize?: number,
    refetchInterval?: number,
    enabled?: boolean,
    externalData?: Record<string | number, any>,
    scopeKey?: string | undefined
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

  // Step 2: Perform the multicall using wagmi
  const {
    data: results,
    isLoading,
    isFetching,
    refetch,
    error,
    queryKey
  } = useReadContracts({
    batchSize: options.batchSize ?? 50,
    contracts: contracts as any,
    scopeKey: options.scopeKey ?? undefined,
    query: {
      refetchInterval: options.refetchInterval ?? 30_000,
      enabled: options.enabled ?? true,
    },
  })

  // Step 3: Structure result into a nested dictionary, with optional transforms
  let storage: Record<string | number, any> | undefined = {}
  let canOperate = true
  results?.forEach((item, i) => {
    const {
      resultType,
      keys,
      transform,
      onError,
    } = calls[i]

    let value

    if (item.status === 'success') {
      value = item.result
      if (transform) {
        try {
          value = transform(value)
        } catch (e) {
          console.warn(`Transform failed for keys [${keys.join('.')}]`, e)
        }
      }
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
        console.warn(`Multicall failed for keys [${keys.join('.')}] at index ${i}`)
      }
    }

    assignNestedValue(storage, keys, value)    
  })

  if (results && results.length > 0) {
    storage['canOperate'] = canOperate
  } else {
    storage = undefined
  }

  // merge with external data
  if (storage && options.externalData) {
    //storage = { ...storage, ...options.externalData }
    storage = deepMerge(storage, options.externalData)    
  }

  return {
    data: storage,
    isLoading,
    isFetching,
    refetch,
    error,
    queryKey
  }
}
