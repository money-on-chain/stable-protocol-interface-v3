//import { readContracts, type PublicClient } from 'viem'
//import { readContracts } from 'viem/actions'
import type { PublicClient } from 'viem'

type ResultType = 'uint256' | 'int256' | 'address' | 'bool'

type SyncMulticallInput = {
  contract: { address: `0x${string}`; abi: any }
  functionName: string
  args?: any[]
  resultType?: ResultType
  keys: (string | number)[]
  transform?: (result: any) => any
  onError?: () => { value: any; canOperate: boolean }
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

/**
 * Runs a synchronous-style multicall using viem, returning nested storage.
 */
export async function runMulticallSync(
  publicClient: PublicClient,
  calls: SyncMulticallInput[]
): Promise<{ data: Record<string | number, any> | undefined; canOperate: boolean }> {
  const contracts = calls.map(({ contract, functionName, args }) => ({
    address: contract.address,
    abi: contract.abi,
    functionName,
    args,
  }))
  
  const results = await publicClient.multicall({
    contracts,
    allowFailure: true
  })

  let storage: Record<string | number, any> | undefined = {}
  let canOperate = true

  results.forEach((item, i) => {
    const { resultType, keys, transform, onError } = calls[i]
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
        console.warn(`Multicall failed for keys [${keys.join('.')}]`)
      }
    }

    assignNestedValue(storage, keys, value)
  })

  if (results && results.length > 0) {
    storage['canOperate'] = canOperate
  } else {
    storage = undefined
  }
  
  return { data: storage, canOperate }
}
