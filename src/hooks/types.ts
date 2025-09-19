// src/types.ts

export type Address = `0x${string}`

export type ContractInfo = {
  address: Address
  abi: readonly unknown[]
  name?: string
  type?: string
}

/** Bag of contracts discovered at runtime */
export type DContracts = {
  // Core used across hooks
  VestingFactory?: ContractInfo
  TG?: ContractInfo
  StakingMachine?: ContractInfo
  DelayMachine?: ContractInfo
  VotingMachine?: ContractInfo
  VetoMachine?: ContractInfo
  IncentiveV2?: ContractInfo
  IRegistry?: ContractInfo
  MocMultiCollateralGuard?: ContractInfo

  // Arrays
  Moc?: ContractInfo[]
  CA?: ContractInfo[]
  CollateralToken?: ContractInfo[]
  MocVendors?: ContractInfo[]
  MocQueue?: ContractInfo[]
  FeeToken?: ContractInfo[]
  PP_FeeToken?: ContractInfo[]
  FC_MAX_ABSOLUTE_OP_PROVIDER?: ContractInfo[]
  FC_MAX_OP_DIFFERENCE_PROVIDER?: ContractInfo[]
  TP?: ContractInfo[]
  PP_CA?: ContractInfo[]
  // Pair matrix (CA x TP) of price providers
  PP_TP?: Record<number, ContractInfo[]>

  // Extras
  PP_COINBASE?: ContractInfo
  tp_legacy?: ContractInfo
  token_migrator?: ContractInfo
  VestingMachine?: ContractInfo

  [k: string]: ContractInfo | ContractInfo[] | Record<number, ContractInfo[]> | undefined
}

export type PrimitiveSol =
  | 'bool'
  | 'address'
  | 'uint256'
  | 'int256'
  | 'bytes32'
  | 'string'

export type TupleField = { type: string; name?: string }
export type ResultType = PrimitiveSol | readonly TupleField[]

export type CallRequest = {
  contract: ContractInfo
  functionName: string
  args: readonly unknown[]
  resultType: ResultType
  keys: readonly (string | number)[]
}

/** Minimal slice of settings used in userReadContracts */
export type TokensSettings = {
  CA: readonly { name: string; type?: string }[]
  TP: readonly { name: string }[]
  COINBASE: { name: string }
}
