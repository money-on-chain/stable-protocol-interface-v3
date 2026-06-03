import type { UseStorageResult } from "./hooks";

export type TokenBalance = {
    allowance?: bigint;
    balance: bigint;
};

export type UserBalance = {
    [key: number]: {
        FeeToken: TokenBalance;
        TC: TokenBalance;
    };
    CA: TokenBalance[];
    TP: TokenBalance[][];
    tpLegacy?: TokenBalance;
    // Custom tokens keyed by pair name (e.g. "MOC/USD")
    CUSTOM?: Record<string, TokenBalance>;
};
export type UserBalanceResult = Omit<UseStorageResult<unknown>, "data"> & {
    data: UserBalance;
};

export type OracleValue = {
    0: bigint; // valor
    1: boolean; // válido o no
};

export type OracleArray = [bigint, boolean]; // Example: PP_FeeToken, PP_COINBASE

export type PegContainer = [bigint, string]; // value + address

export type TpEma = [bigint, bigint]; // value + ema

export type ProtocolStatusEntry = {
    PP_CA: OracleValue;
    PP_FeeToken: OracleArray;
    PP_TP: Record<number, OracleValue>; // index → value/oracle
    feeToken: string;
    feeTokenPct: bigint;
    getACBalance: bigint;
    getCglb: bigint;
    getCtargemaCA: bigint;
    getLckAC: bigint;
    getPTCac: bigint;
    getRealTCAvailableToRedeem: bigint;
    getRealTPAvailableToMint: bigint[];
    getTCAvailableToRedeem: bigint;
    getTPAvailableToMint: bigint[];
    getTotalACavailable: bigint;
    getCtargemaTP: bigint[];
    liqThrld: bigint;
    liquidated: boolean;
    maxQACToMintTP: bigint;
    maxQACToRedeemTP: bigint;
    mintTCandTPExecCost: bigint;
    nACcb: bigint;
    nTCcb: bigint;
    paused: boolean;
    pegContainer: PegContainer[];
    protThrld: bigint;
    redeemTCandTPExecCost: bigint;
    swapTCforTPExecCost: bigint;
    swapTPforTCExecCost: bigint;
    swapTPforTPExecCost: bigint;
    tcMintExecCost: bigint;
    tcMintFee: bigint;
    tcRedeemExecCost: bigint;
    tcRedeemFee: bigint;
    swapTPforTPFee: bigint;
    swapTCforTPFee: bigint;
    swapTPforTCFee: bigint;
    tpCtarg: bigint[];
    tpEma: TpEma[];
    tpMintExecCost: bigint;
    tpMintFees: bigint[];
    tpRedeemExecCost: bigint;
    tpRedeemFees: bigint[];
    vendorMarkup: bigint;
};

export type ContractProtocolStatus = {
    [key: number]: ProtocolStatusEntry;
    PP_COINBASE: OracleArray;
    getCombinedCglb: bigint;
    getCombinedCtargemaCA: bigint;
    getNormalizationFactors: bigint[];
};

export type ContractProtocolStatusResult = Omit<
    UseStorageResult<unknown>,
    "data"
> & {
    data: ContractProtocolStatus;
};

type Address = `0x${string}`;
type TransactionsTriplet = [bigint[], bigint[], bigint[]]; // [types/ids, amounts, timestamps]

export type DelayMachineInfo = {
    getBalance: bigint;
    getTransactions: TransactionsTriplet;
};

export type IncentiveV2Info = {
    contractBalance: bigint;
    userBalance: bigint;
};

export type StakingMachineInfo = {
    getBalance: bigint;
    getLockedBalance: bigint;
    getLockingInfo: [bigint, bigint]; // [lockedAmount, timestampEnd]
    tgAllowance: bigint;
};

export type VotingMachineInfo = {
    getUserVote: [Address, bigint]; // [lastProposalVoted, option/weight]
};

// Root type
export type UserOmocBalance = {
    TG: TokenBalance;
    tgAllowance: bigint;
    delaymachine: DelayMachineInfo;
    incentiveV2: IncentiveV2Info;
    stakingmachine: StakingMachineInfo;
    votingmachine: VotingMachineInfo;
};

export type UserOmocBalanceResult = Omit<UseStorageResult<unknown>, "data"> & {
    data: UserOmocBalance;
};

export type VestingTransaction = [bigint, bigint]; // [amount, timestamp] o [id, valor]
export type VestingParameters = [bigint[], bigint[]]; // [percentages[], timesdeltas[]]

export type VestingFactoryInfo = {
    getTGETimestamp: bigint;
    isTGEConfigured: boolean;
};

export type StakingInfo = {
    allowance: bigint;
    balance: bigint;
    getBalance: bigint;
    getLockedBalance: bigint;
    getLockingInfo: [bigint, bigint]; // [amount, timestampEnd]
};

export type VestingMachineInfo = {
    allowance: bigint;
    getBalance: bigint;
    getTransactions: VestingTransaction[]; // [ids, amounts, timestamps]
    getAvailable: bigint;
    getHolder: Address;
    getLocked: bigint;
    getParameters: VestingParameters; // [percentages, durations]
    getTotal: bigint;
    isVerified: boolean;
    tgAllowance: bigint;
    tgBalance: bigint;
    delay: DelayMachineInfo;
    staking: StakingInfo;
};

export type UserVesting = {
    vestingfactory: VestingFactoryInfo;
    vestingmachine: VestingMachineInfo;
    staking: StakingInfo;
    delay: DelayMachineInfo;
    tgAllowance: bigint;
    tgBalance: bigint;
};

export type UserVestingResult = Omit<UseStorageResult<unknown>, "data"> & {
    data: UserVesting;
};

export type DelayMachineStatus = {
    getLastId: bigint;
    getSource: Address;
};

export type StakingMachineStatus = {
    getDelayMachine: Address;
    getOracleManager: Address;
    getSupporters: Address;
    getWithdrawLockTime: bigint;
};

export type SupportersStatus = {
    isReadyToDistribute: boolean;
    mocToken: Address;
    period: bigint;
    totalMoc: bigint;
    totalToken: bigint;
};

export type VetoMachineStatus = {
    getVetoPctForWinnerProposal: bigint;
};

// Voting tuples
export type Proposal = [Address, bigint, bigint, bigint]; // [proposalAddress, votingRound, votes, timestamp]
export type VoteInfo = [Address, bigint, bigint]; // [voter, inFavor, against] (according to your contract)
export type VotingData = [Address, bigint, bigint, bigint]; // [leadingProposal, inFavor, against, expiration]

export type VotingMachineStatus = {
    // Constants / params
    MAX_PRE_PROPOSALS: bigint;
    MIN_PCT_FOR_QUORUM: bigint;
    MIN_STAKE: bigint;
    PCT_PRECISION: bigint;
    PRE_VOTE_EXPIRATION_TIME_DELTA: bigint;
    PRE_VOTE_MIN_PCT_TO_WIN: bigint;
    VOTE_MIN_PCT_TO_ACCEPT: bigint;
    VOTE_MIN_PCT_TO_VETO: bigint;
    VOTING_TIME_DELTA: bigint;

    // State / getters
    getProposalByIndex: Proposal[];
    getProposalCount: bigint;
    getState: bigint;
    getVoteInfo: VoteInfo;
    getVotingData: VotingData;
    getVotingRound: bigint;
    proposalsList: Record<number, Address>;
    readyToPreVoteStep: boolean;
    readyToVoteStep: boolean;
    totalSupply: bigint;
};

// Root type
export type ContractStatusOmoc = {
    delaymachine: DelayMachineStatus;
    stakingmachine: StakingMachineStatus;
    supporters: SupportersStatus;
    vetomachine: VetoMachineStatus;
    votingmachine: VotingMachineStatus;
};

export type ContractStatusOmocResult = Omit<
    UseStorageResult<unknown>,
    "data"
> & {
    data: ContractStatusOmoc;
};

export type OnchainPricesResult = Omit<UseStorageResult<unknown>, "data"> & {
    data: ContractStatusOmoc;
};

export interface UseBaseCoinBalanceResult {
    balance: bigint | undefined;
    formatted: string | undefined;
    symbol: string | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => void;
}

export type UseIncentiveV2Result = Omit<UseStorageResult<unknown>, "data"> & {
    data: IncentiveV2Info;
};

export type CommissionItem = {
    commission: bigint;
    commissionUSD: bigint;
    commissionPercent: bigint;
    balance: bigint;
};

export type CommissionsState = Record<string, CommissionItem>;

export const ALLOWANCE_STEPS = [
    "AllowancePayCommissionCA",
    "AllowancePayCommissionFeeToken",
    "AllowancePayCurrencyExchange",
    "AllowancePayAnotherToken",
    "SubmitOperationTransaction",
] as const;

export type AllowanceStep = (typeof ALLOWANCE_STEPS)[number];
