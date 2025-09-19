// src/hooks/userReadContracts.ts
import type { PublicClient } from 'viem'
import { readContract } from 'viem/actions'

import { runMulticallSync } from '../backend/runMulticallSync'
import CollateralAsset from '../contracts/CollateralAsset.json'
import CollateralToken from '../contracts/CollateralToken.json'
import FeeToken from '../contracts/FeeToken.json'
import IPriceProvider from '../contracts/IPriceProvider.json'
import MocCACoinbase from '../contracts/MocCACoinbase.json'
import MocCARC20 from '../contracts/MocCARC20.json'
import MocMultiCollateralGuard from '../contracts/MocMultiCollateralGuard.json'
import MocQueue from '../contracts/MocQueue.json'
import MocVendors from '../contracts/MocVendors.json'
import DelayMachine from '../contracts/omoc/DelayMachine.json'
import IERC20 from '../contracts/omoc/IERC20.json'
import IncentiveV2 from '../contracts/omoc/IncentiveV2.json'
import IRegistry from '../contracts/omoc/IRegistry.json'
import StakingMachine from '../contracts/omoc/StakingMachine.json'
import Supporters from '../contracts/omoc/Supporters.json'
import VestingFactory from '../contracts/omoc/VestingFactory.json'
import VestingMachine from '../contracts/omoc/VestingMachine.json'
import VetoMachine from '../contracts/omoc/VetoMachine.json'
import VotingMachine from '../contracts/omoc/VotingMachine.json'
import TokenMigrator from '../contracts/TokenMigrator.json'
import TokenPegged from '../contracts/TokenPegged.json'
import omoc from '../settings/omoc/omoc.json'
import settings from '../settings/settings.json'
import type {
  Address,
  CallRequest,
  ContractInfo,
  DContracts,
  TokensSettings,
} from './types'

// Reuse ABI as readonly unknown[] (no `any`)
const ABI_IPriceProvider = IPriceProvider.abi as readonly unknown[]
const ABI_MocMultiCollateralGuard = MocMultiCollateralGuard.abi as readonly unknown[]
const ABI_MocCARC20 = MocCARC20.abi as readonly unknown[]
const ABI_MocCACoinbase = MocCACoinbase.abi as readonly unknown[]
const ABI_CollateralAsset = CollateralAsset.abi as readonly unknown[]
const ABI_CollateralToken = CollateralToken.abi as readonly unknown[]
const ABI_MocVendors = MocVendors.abi as readonly unknown[]
const ABI_MocQueue = MocQueue.abi as readonly unknown[]
const ABI_FeeToken = FeeToken.abi as readonly unknown[]
const ABI_IERC20 = IERC20.abi as readonly unknown[]
const ABI_IncentiveV2 = IncentiveV2.abi as readonly unknown[]
const ABI_StakingMachine = StakingMachine.abi as readonly unknown[]
const ABI_DelayMachine = DelayMachine.abi as readonly unknown[]
const ABI_Supporters = Supporters.abi as readonly unknown[]
const ABI_VestingFactory = VestingFactory.abi as readonly unknown[]
const ABI_VestingMachine = VestingMachine.abi as readonly unknown[]
const ABI_VetoMachine = VetoMachine.abi as readonly unknown[]
const ABI_VotingMachine = VotingMachine.abi as readonly unknown[]
const ABI_TokenMigrator = TokenMigrator.abi as readonly unknown[]
const ABI_TokenPegged = TokenPegged.abi as readonly unknown[]

/** onError handler used by some multicall entries */
const onErrorTP = () => ({ value: null, canOperate: true })

/** Local call shape (allows optional onError) */
type CallRequestWithOnError = CallRequest & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (..._args: any[]) => unknown
}

/** Multicall response shapes we consume */
type RegistryAddressesData = {
  MOC_STAKING_MACHINE: Address
  SUPPORTERS_ADDR: Address
  MOC_DELAY_MACHINE: Address
  MOC_VESTING_MACHINE: Address
  MOC_VOTING_MACHINE: Address
  MOC_VETO_MACHINE: Address
  MOC_PRICE_PROVIDER_REGISTRY: Address
  ORACLE_MANAGER_ADDR: Address
  MOC_TOKEN: Address
}

type MocAddressesData = {
  feeToken: Address
  feeTokenPriceProvider: Address
  acToken?: Address
  tcToken: Address
  maxAbsoluteOpProvider: Address
  maxOpDiffProvider: Address
  mocQueue: Address
  mocVendors: Address
  tpTokens: Address[] // we aggregate from keys ['tpTokens', i]
}

/**
 * Read all protocol contracts/addresses based on settings + registry.
 * Returns a typed bag (DContracts) consumable by your hooks/UI.
 */
const readContracts = async (publicClient: PublicClient): Promise<DContracts> => {
  // Settings slice used here (avoid `any`)
  const s = (settings as { tokens?: unknown }).tokens as TokensSettings | undefined
  if (!s) return {}

  const contracts: DContracts = {
    Moc: [],
    CA: [],
    CollateralToken: [],
    MocVendors: [],
    MocQueue: [],
    FeeToken: [],
    PP_FeeToken: [],
    FC_MAX_ABSOLUTE_OP_PROVIDER: [],
    FC_MAX_OP_DIFFERENCE_PROVIDER: [],
    TP: [],
    PP_CA: [],
    PP_TP: {},
  }

  // ---- Price Providers (CA/USD) from env (comma-separated) ----
  const ppcaRaw = import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_CA
  if (ppcaRaw) {
    const ppca = ppcaRaw.split(',')
    for (let ca = 0; ca < s.CA.length; ca++) {
      console.log(`Price Provider Pair ${s.CA[ca].name}/USD Contract... address: `, ppca[ca])
      const pp: ContractInfo = {
        address: ppca[ca] as Address,
        abi: ABI_IPriceProvider,
        name: 'PP',
        type: '',
      }
      contracts.PP_CA!.push(pp)
    }
  }

  // ---- Price Provider for COINBASE (single) ----
  if (import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE) {
    console.log(
      `Price Provider ${s.COINBASE.name} Contract... address: `,
      import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE,
    )
    contracts.PP_COINBASE = {
      address: import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE as Address,
      abi: ABI_IPriceProvider,
      name: 'PP_COINBASE',
      type: '',
    }
  }

  // ---- MultiCollateral Guard (discover buckets) ----
  if (import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD) {
    console.log(
      'MocMultiCollateralGuard Contract... address: ',
      import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD,
    )
    contracts.MocMultiCollateralGuard = {
      address: import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD as Address,
      abi: ABI_MocMultiCollateralGuard,
      name: 'MocMultiCollateralGuard',
      type: '',
    }

    // Iterate buckets (CA list)
    for (let ca = 0; ca < s.CA.length; ca++) {
      const bucketAddr = (await readContract(publicClient, {
        address: contracts.MocMultiCollateralGuard.address,
        abi: ABI_MocMultiCollateralGuard,
        functionName: 'buckets',
        args: [ca],
      })) as Address

      const caType = s.CA[ca]?.type
      const isCoinbase = caType === 'coinbase'
      const mocAbi = isCoinbase ? ABI_MocCACoinbase : ABI_MocCARC20

      console.log('Moc Contract... address: ', bucketAddr)

      // `contractMocType` is used later by mocAddresses
      const moc: ContractInfo & { contractMocType?: string } = {
        address: bucketAddr,
        abi: mocAbi,
        name: 'Moc',
        type: caType,
        contractMocType: caType,
      }
      contracts.Moc!.push(moc)

      // Read per-bucket contracts/addresses
      const mocAddr = await mocAddresses(publicClient, moc)

      if (!isCoinbase && mocAddr.data.acToken) {
        if (!contracts.CA!.some(caItem => caItem.address.toLowerCase() === mocAddr.data.acToken!.toLowerCase())) {
          console.log(`${s.CA[ca].name} Token Contract... address: `, mocAddr.data.acToken)
          contracts.CA!.push({
            address: mocAddr.data.acToken,
            abi: ABI_CollateralAsset,
            name: 'CollateralAsset',
            type: '',
          })
        }
      }

      // TP list (via pegContainer/peggedTokenIndex)
      const tpAddresses: Address[] = []
      for (let tp = 0; tp < s.TP.length; tp++) {
        const tpAddress = (await readContract(publicClient, {
          address: moc.address,
          abi: mocAbi,
          functionName: 'tpTokens',
          args: [tp],
        })) as Address | undefined
        if (!tpAddress || tpAddress === '0x0000000000000000000000000000000000000000') continue

        // index: [index, enabled]
        const tpIndex = (await readContract(publicClient, {
          address: moc.address,
          abi: mocAbi,
          functionName: 'peggedTokenIndex',
          args: [tpAddress],
        })) as readonly [bigint, boolean] | undefined
        if (!tpIndex) continue

        // pegContainer(index) -> [price, priceProvider]
        const tpItem = (await readContract(publicClient, {
          address: moc.address,
          abi: mocAbi,
          functionName: 'pegContainer',
          args: [tpIndex[0]],
        })) as readonly [unknown, Address] | undefined

        if (!tpItem) continue
        if (!tpAddresses.includes(tpAddress)) tpAddresses.push(tpAddress)

        console.log(
          `Reading Price Provider Pair ${s.TP[tp].name}/${s.CA[ca].name} Contract... address: `,
          tpItem[1],
        )

        if (!contracts.PP_TP![ca]) contracts.PP_TP![ca] = []
        contracts.PP_TP![ca].push({
          address: tpItem[1],
          abi: ABI_IPriceProvider,
          name: 'PP',
          type: '',
        })
      }

      console.log('Collateral Token Contract... address: ', mocAddr.data.tcToken)
      contracts.CollateralToken!.push({
        address: mocAddr.data.tcToken,
        abi: ABI_CollateralToken,
        name: 'CollateralToken',
        type: '',
      })

      console.log('Moc Vendors Contract... address: ', mocAddr.data.mocVendors)
      contracts.MocVendors!.push({
        address: mocAddr.data.mocVendors,
        abi: ABI_MocVendors,
        name: 'MocVendors',
        type: '',
      })

      console.log('MocQueue Contract... address: ', mocAddr.data.mocQueue)
      contracts.MocQueue!.push({
        address: mocAddr.data.mocQueue,
        abi: ABI_MocQueue,
        name: 'MocQueue',
        type: '',
      })

      console.log('FeeToken Contract... address: ', mocAddr.data.feeToken)
      contracts.FeeToken!.push({
        address: mocAddr.data.feeToken,
        abi: ABI_FeeToken,
        name: 'FeeToken',
        type: '',
      })

      console.log('Fee Token PP Contract... address: ', mocAddr.data.feeTokenPriceProvider)
      contracts.PP_FeeToken!.push({
        address: mocAddr.data.feeTokenPriceProvider,
        abi: ABI_IPriceProvider,
        name: 'PP',
        type: '',
      })

      console.log('FC_MAX_ABSOLUTE_OP_PROVIDER Contract... address: ', mocAddr.data.maxAbsoluteOpProvider)
      contracts.FC_MAX_ABSOLUTE_OP_PROVIDER!.push({
        address: mocAddr.data.maxAbsoluteOpProvider,
        abi: ABI_IPriceProvider,
        name: 'FC_MAX_ABSOLUTE_OP_PROVIDER',
        type: '',
      })

      console.log('FC_MAX_OP_DIFFERENCE_PROVIDER Contract... address: ', mocAddr.data.maxOpDiffProvider)
      contracts.FC_MAX_OP_DIFFERENCE_PROVIDER!.push({
        address: mocAddr.data.maxOpDiffProvider,
        abi: ABI_IPriceProvider,
        name: 'FC_MAX_OP_DIFFERENCE_PROVIDER',
        type: '',
      })

      // After iterating CA buckets, export TP token contracts
      // (once per bucket iteration, but we can export after loop — kept here for clarity)
      for (let tp = 0; tp < s.TP.length; tp++) {
        const tpAddr = tpAddresses[tp]
        if (!tpAddr) continue
        console.log(`${s.TP[tp].name} Token Contract... address: `, tpAddr)
        contracts.TP!.push({
          address: tpAddr,
          abi: ABI_TokenPegged,
          name: 'TP',
          type: '',
        })
      }
    }
  }

  // Single collateral (voting project) convenience
  if (import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === 'voting') {
    const tcAddress = import.meta.env.REACT_APP_CONTRACT_TC as Address | undefined
    if (tcAddress) {
      console.log('Collateral Token Contract... address: ', tcAddress)
      contracts.CollateralToken!.push({
        address: tcAddress,
        abi: ABI_CollateralToken,
        name: 'CollateralToken',
        type: '',
      })
    }
  }

  // ---- Registry-based contracts ----
  if (import.meta.env.REACT_APP_CONTRACT_IREGISTRY) {
    console.log('IRegistry Contract... address: ', import.meta.env.REACT_APP_CONTRACT_IREGISTRY)
    contracts.IRegistry = {
      address: import.meta.env.REACT_APP_CONTRACT_IREGISTRY as Address,
      abi: IRegistry.abi as readonly unknown[],
      name: 'IRegistry',
      type: '',
    }

    const registryAddr = await registryAddresses(publicClient, contracts.IRegistry)

    console.log('StakingMachine Contract... address: ', registryAddr.data.MOC_STAKING_MACHINE)
    contracts.StakingMachine = {
      address: registryAddr.data.MOC_STAKING_MACHINE,
      abi: ABI_StakingMachine,
      name: 'StakingMachine',
      type: '',
    }

    console.log('Delay Machine Contract... address: ', registryAddr.data.MOC_DELAY_MACHINE)
    contracts.DelayMachine = {
      address: registryAddr.data.MOC_DELAY_MACHINE,
      abi: ABI_DelayMachine,
      name: 'DelayMachine',
      type: '',
    }

    console.log('Supporters Contract... address: ', registryAddr.data.SUPPORTERS_ADDR)
    contracts.Supporters = {
      address: registryAddr.data.SUPPORTERS_ADDR,
      abi: ABI_Supporters,
      name: 'Supporters',
      type: '',
    }

    console.log('Vesting Factory Contract... address: ', registryAddr.data.MOC_VESTING_MACHINE)
    contracts.VestingFactory = {
      address: registryAddr.data.MOC_VESTING_MACHINE,
      abi: ABI_VestingFactory,
      name: 'VestingFactory',
      type: '',
    }

    console.log('Voting Machine Contract... address: ', registryAddr.data.MOC_VOTING_MACHINE)
    contracts.VotingMachine = {
      address: registryAddr.data.MOC_VOTING_MACHINE,
      abi: ABI_VotingMachine,
      name: 'VotingMachine',
      type: '',
    }

    console.log('Veto Machine Contract... address: ', registryAddr.data.MOC_VETO_MACHINE)
    contracts.VetoMachine = {
      address: registryAddr.data.MOC_VETO_MACHINE,
      abi: ABI_VetoMachine,
      name: 'VetoMachine',
      type: '',
    }

    console.log('Token Govern Contract... address: ', registryAddr.data.MOC_TOKEN)
    contracts.TG = {
      address: registryAddr.data.MOC_TOKEN,
      abi: ABI_IERC20,
      name: 'TG',
      type: '',
    }

    // Placeholder VestingMachine (address filled when user selects a vesting)
    contracts.VestingMachine = {
      address: '0x0000000000000000000000000000000000000000',
      abi: ABI_VestingMachine,
      name: 'VestingMachine',
      type: '',
    }
  }

  // ---- Incentive V2 ----
  if (import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2) {
    console.log('Incentive V2 Contract... address: ', import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2)
    contracts.IncentiveV2 = {
      address: import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2 as Address,
      abi: ABI_IncentiveV2,
      name: 'IncentiveV2',
      type: '',
    }
  }

  // ---- Token migrator & legacy TP ----
  if (import.meta.env.REACT_APP_CONTRACT_LEGACY_TP) {
    contracts.tp_legacy = {
      address: import.meta.env.REACT_APP_CONTRACT_LEGACY_TP as Address,
      abi: ABI_TokenPegged,
      name: 'tp_legacy',
      type: '',
    }

    if (!import.meta.env.REACT_APP_CONTRACT_TOKEN_MIGRATOR) {
      console.log('Error: Please set token migrator address!')
    } else {
      contracts.token_migrator = {
        address: import.meta.env.REACT_APP_CONTRACT_TOKEN_MIGRATOR as Address,
        abi: ABI_TokenMigrator,
        name: 'tokenMigrator',
        type: '',
      }
    }
  }

  return contracts
}

const registryAddresses = async (
  publicClient: PublicClient,
  contractRegistry: ContractInfo,
): Promise<{ data: RegistryAddressesData }> => {
  const callRequest: CallRequest[] = [
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.MOC_STAKING_MACHINE], resultType: 'address', keys: ['MOC_STAKING_MACHINE'] },
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.SUPPORTERS_ADDR], resultType: 'address', keys: ['SUPPORTERS_ADDR'] },
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.MOC_DELAY_MACHINE], resultType: 'address', keys: ['MOC_DELAY_MACHINE'] },
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.MOC_VESTING_MACHINE], resultType: 'address', keys: ['MOC_VESTING_MACHINE'] },
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.MOC_VOTING_MACHINE], resultType: 'address', keys: ['MOC_VOTING_MACHINE'] },
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.MOC_VETO_MACHINE], resultType: 'address', keys: ['MOC_VETO_MACHINE'] },
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.MOC_PRICE_PROVIDER_REGISTRY], resultType: 'address', keys: ['MOC_PRICE_PROVIDER_REGISTRY'] },
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.ORACLE_MANAGER_ADDR], resultType: 'address', keys: ['ORACLE_MANAGER_ADDR'] },
    { contract: contractRegistry, functionName: 'getAddress', args: [omoc.RegistryConstants.MOC_TOKEN], resultType: 'address', keys: ['MOC_TOKEN'] },
  ]

  return await runMulticallSync(publicClient, callRequest)
}

const mocAddresses = async (
  publicClient: PublicClient,
  contractMoc: ContractInfo & { contractMocType?: string },
): Promise<{ data: MocAddressesData }> => {
  const calls: CallRequestWithOnError[] = [
    { contract: contractMoc, functionName: 'feeToken', args: [], resultType: 'address', keys: ['feeToken'] },
    { contract: contractMoc, functionName: 'feeTokenPriceProvider', args: [], resultType: 'address', keys: ['feeTokenPriceProvider'] },
  ]

  if (contractMoc.contractMocType !== 'coinbase') {
    calls.push({ contract: contractMoc, functionName: 'acToken', args: [], resultType: 'address', keys: ['acToken'] })
  }

  calls.push(
    { contract: contractMoc, functionName: 'tcToken', args: [], resultType: 'address', keys: ['tcToken'] },
    { contract: contractMoc, functionName: 'maxAbsoluteOpProvider', args: [], resultType: 'address', keys: ['maxAbsoluteOpProvider'] },
    { contract: contractMoc, functionName: 'maxOpDiffProvider', args: [], resultType: 'address', keys: ['maxOpDiffProvider'] },
    { contract: contractMoc, functionName: 'mocQueue', args: [], resultType: 'address', keys: ['mocQueue'] },
    { contract: contractMoc, functionName: 'mocVendors', args: [], resultType: 'address', keys: ['mocVendors'] },
  )

  // tpTokens[i]
  for (let i = 0; i < (settings as { tokens?: unknown }).tokens!['TP'].length; i++) {
    calls.push({
      contract: contractMoc,
      functionName: 'tpTokens',
      args: [i],
      resultType: 'address',
      keys: ['tpTokens', i],
      onError: onErrorTP,
    })
  }

  const res = await runMulticallSync(publicClient, calls)
  // Normalize tpTokens array if your multicall flattens keys
  const tpTokens: Address[] = []
  for (let i = 0; i < (settings as { tokens?: unknown }).tokens!['TP'].length; i++) {
    const key = ['tpTokens', i].join(',')
    // Depending on runMulticallSync shape, adapt. Assuming res.data[key] holds Address.
    // If your implementation uses nested objects, adjust this extraction accordingly.
    // @ts-expect-error – adapt to your aggregator's shape
    const addr: Address | undefined = res.data?.tpTokens?.[i] ?? res.data?.[key]
    if (addr) tpTokens.push(addr)
  }
  return { data: { ...res.data, tpTokens } as MocAddressesData }
}

export { readContracts }
