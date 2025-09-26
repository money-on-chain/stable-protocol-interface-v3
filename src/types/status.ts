export type TokenBalance = {
    allowance: bigint;
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
    canOperate: boolean;
};

export type OracleValue = {
    0: bigint; // valor
    1: boolean; // válido o no
};

export type OracleArray = [string, boolean]; // Example: PP_FeeToken, PP_COINBASE

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
    canOperate: boolean;
    getCombinedCglb: bigint;
    getCombinedCtargemaCA: bigint;
    getNormalizationFactors: bigint[];
};
