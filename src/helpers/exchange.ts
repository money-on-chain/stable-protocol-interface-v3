import {
    mintTC as mintTC_coinbase,
    mintTP as mintTP_coinbase,
    redeemTC as redeemTC_coinbase,
    redeemTP as redeemTP_coinbase,
} from "../backend/moc-coinbase";
import { mintTC, mintTP, redeemTC, redeemTP, swapTPforTP, swapTCforTP } from "../backend/moc-rc20";
import settings from "../settings/settings.json";
import type { ContractInfo, DContracts } from "../types/hooks";
import type {
    ContractProtocolStatusResult,
    UserBalanceResult,
} from "../types/status";
import type { InterfaceContext } from "../types/wallets";
import { TokenSettings } from "./currencies";

// Type definitions

interface TokenContractResult {
    token: ContractInfo;
    decimals: number;
}

interface ApproveTokenContractResult {
    token: ContractInfo;
    contractAllow: ContractInfo;
    decimals: number;
}

interface TokenMap {
    [key: string]: string[];
}

type TokenName = string;
type TokenAmount = string | number;
type LimitAmount = string | number;
type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: unknown) => void;

/*
const tokenMap = {
    CA_0: ['TC_0', 'TP_0', 'TP_1'],
    CA_1: ['TC_1', 'TP_0', 'TP_1'],
    TC_0: ['CA_0'],
    TC_1: ['CA_1'],
    TC_0: ['TP_0', 'TP_1'],
    TC_1: ['TP_0', 'TP_1'],
    TP_0: ['CA_0', 'CA_1'],
    TP_1: ['CA_0', 'CA_1']
    TP_0: ['TP_1'],
    TP_1: ['TP_0'],
};*/

function loadTokenMap(): TokenMap {
    const tMap: TokenMap = {};
    let lReceive: string[] = [];

    // Exchange CA
    for (let i = 0; i < settings.tokens.CA.length; i++) {
        lReceive = [];
        lReceive.push(`TC_${i}`);
        // TP
        for (let t = 0; t < settings.tokens.TP.length; t++) {
            lReceive.push(`TP_${t}`);
        }
        tMap[`CA_${i}`] = lReceive;
        
        
    }

    // Exchange TC
    for (let i = 0; i < settings.tokens.CA.length; i++) {        
        lReceive = [];
        // TP
        for (let t = 0; t < settings.tokens.TP.length; t++) {
            lReceive.push(`TP_${t}`);
        }

        // Exchange TC -> CA
        lReceive.push(`CA_${i}`);

        // Exchange TC -> TP
        tMap[`TC_${i}`] = lReceive;
    }

    // Exchange TP
    for (let i = 0; i < settings.tokens.TP.length; i++) {
        const lReceive: string[] = [];

        // CA targets
        for (let a = 0; a < settings.tokens.CA.length; a++) {
            lReceive.push(`CA_${a}`);
        }
        
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {            
            if (tp !== i) {
                lReceive.push(`TP_${tp}`);
            }
        }
        

        tMap[`TP_${i}`] = lReceive;
    }
    
    return tMap;
}

//const VERY_HIGH_NUMBER = 100000000000;

const tokenMap: TokenMap = loadTokenMap();
const tokenExchange = (): string[] => Object.keys(tokenMap);
const tokenReceive = (tExchange: string): string[] => tokenMap[tExchange];

function isMintOperation(tokenExchange: string, tokenReceive: string): boolean {
    /*
        case 'CA_0,TC':
        case 'CA_1,TC':
        case 'CA_0,TP_0':
        case 'CA_1,TP_0':
        case 'CA_0,TP_1':
        case 'CA_1,TP_1':
            // Mint
            return true;
        case 'TP_0,CA_0':
        case 'TP_0,CA_1':
        case 'TP_1,CA_0':
        case 'TP_1,CA_1':
        case 'TC,CA_0':
        case 'TC,CA_1':
            // Redeem
            return false;
    }
     */

    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;

    switch (aTokenMap) {
        case "CA,TC":
        case "CA,TP":
            // Mint
            return true;
        case "TP,CA":
        case "TC,CA":
        case "TP,TP":
        case "TP,TPCA":
            // Redeem
            return false;
        default:
            throw new Error("Invalid token name");
    }
}

function typeOperation(tokenExchange: string, tokenReceive: string): string {

    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;

    switch (aTokenMap) {
        case "CA,TC":
        case "CA,TP":
            // Mint
            return "MINT";
        case "TP,CA":
        case "TC,CA":
            // Redeem        
            return "REDEEM";
        case "TP,TP":
        case "TP,TPCA":
            // Swap TP for TP
            return "SWAP_TPFORTP";
        case "TC,TP":
            // Swap TC for TP
            return "SWAP_TCFORTP";    
        default:
            throw new Error("Invalid token name");
    }
}

function TokenAllowance(
    userBalance: UserBalanceResult,
    tokenExchange: string,
    caIndex: number
): bigint {
    // Ex. tokenExchange = CA_0, CA_1, TP_0, TP_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    //const tokenExchangeSettings = TokenSettings(tokenExchange);
    const aTokenExchange: string[] = tokenExchange.split("_");
    let allowance: bigint | undefined = 0n;
    switch (aTokenExchange[0]) {
        case "CA":
            allowance =
                userBalance.data.CA[parseInt(aTokenExchange[1])].allowance;
            break;
        case "TP":
        case "TPCA":
            allowance =
                userBalance.data.TP[caIndex][parseInt(aTokenExchange[1])]
                    .allowance;
            break;
        case "TC":
            allowance =
                userBalance.data[parseInt(aTokenExchange[1])].TC.allowance;
            break;
        case "TF":
            allowance =
                userBalance.data[parseInt(aTokenExchange[1])].FeeToken
                    .allowance;
            break;
        default:
            throw new Error("Invalid token name");
    }

    return allowance || 0n;
}

function UserTokenAllowance(
    userBalance: UserBalanceResult,
    tokenExchange: string,
    caIndex: number
): bigint {
    return TokenAllowance(userBalance, tokenExchange, caIndex);
}

function ApproveTokenContract(
    contracts: DContracts,
    tokenExchange: string,
    tokenReceive: string,
    caIndex: number
): ApproveTokenContractResult {
    const tokenExchangeSettings = TokenSettings(tokenExchange);

    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;

    switch (aTokenMap) {
        case "CA,TC":
        case "CA,CA":
        case "CA,TP":
            if (!contracts.CA) {
                throw new Error("CA contract not available");
            }
            if (!contracts.Moc) {
                throw new Error("Moc contract not available");
            }
            return {
                token: contracts.CA[parseInt(aTokenExchange[1])],
                contractAllow: contracts.Moc[parseInt(aTokenExchange[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TC,CA":
            if (!contracts.CollateralToken) {
                throw new Error("CollateralToken contract not available");
            }
            if (!contracts.Moc) {
                throw new Error("Moc contract not available");
            }
            return {
                token: contracts.CollateralToken[parseInt(aTokenExchange[1])],
                contractAllow: contracts.Moc[parseInt(aTokenReceive[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TC,TP":
            if (!contracts.CollateralToken) {
                throw new Error("CollateralToken contract not available");
            }
            if (!contracts.Moc) {
                throw new Error("Moc contract not available");
            }
            return {
                token: contracts.CollateralToken[parseInt(aTokenExchange[1])],
                contractAllow: contracts.Moc[parseInt(aTokenExchange[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TP,CA":
            if (!contracts.TP) {
                throw new Error("TP contract not available");
            }
            if (!contracts.Moc) {
                throw new Error("Moc contract not available");
            }
            return {
                token: contracts.TP[parseInt(aTokenExchange[1])],
                contractAllow: contracts.Moc[parseInt(aTokenReceive[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TP,TP":
            if (!contracts.TP) {
                throw new Error("TP contract not available");
            }
            if (!contracts.Moc) {
                throw new Error("Moc contract not available");
            }
            return {
                token: contracts.TP[parseInt(aTokenExchange[1])],
                contractAllow: contracts.Moc[caIndex],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TP,TPCA":
            if (!contracts.TP) {
                throw new Error("TP contract not available");
            }
            if (!contracts.Moc) {
                throw new Error("Moc contract not available");
            }
            return {
                token: contracts.TP[parseInt(aTokenExchange[1])],
                contractAllow: contracts.Moc[parseInt(aTokenReceive[2])],
                decimals: tokenExchangeSettings.decimals,
            };    
        case "TF,TF":
            if (!contracts.FeeToken) {
                throw new Error("FeeToken contract not available");
            }
            if (!contracts.Moc) {
                throw new Error("Moc contract not available");
            }
            return {
                token: contracts.FeeToken[parseInt(aTokenExchange[1])],
                contractAllow: contracts.Moc[parseInt(aTokenExchange[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TG,ST": // Token Govern, Allow on Staking Machine
            if (!contracts.TG) {
                throw new Error("TG contract not available");
            }
            if (!contracts.StakingMachine) {
                throw new Error("StakingMachine contract not available");
            }
            return {
                token: contracts.TG,
                contractAllow: contracts.StakingMachine,
                decimals: tokenExchangeSettings.decimals,
            };
        case "TC,VM":
            if (!contracts.CollateralToken) {
                throw new Error("CollateralToken contract not available");
            }
            if (!contracts.VetoMachine) {
                throw new Error("VetoMachine contract not available");
            }
            return {
                token: contracts.CollateralToken[parseInt(aTokenExchange[1])],
                contractAllow: contracts.VetoMachine,
                decimals: tokenExchangeSettings.decimals,
            };
        default:
            throw new Error("Invalid token name");
    }
}

function TokenContract(
    contracts: DContracts,
    tokenExchange: string
): TokenContractResult {
    // Ex. aTokenMap = CA_0, CA_1, TP_0, TP_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    const tokenExchangeSettings = TokenSettings(tokenExchange);
    if (!contracts) {
        throw new Error("Contracts not available");
    }

    const tokenMap: string = `${tokenExchange}`;
    const aTokenMap: string[] = tokenMap.split("_");
    switch (aTokenMap[0]) {
        case "CA":
            if (!contracts.CA) {
                throw new Error("CA contract not available");
            }
            return {
                token: contracts.CA[parseInt(aTokenMap[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TP":
        case "TPCA":
            if (!contracts.TP) {
                throw new Error("TP contract not available");
            }
            return {
                token: contracts.TP[parseInt(aTokenMap[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TC":
            if (!contracts.CollateralToken) {
                throw new Error("CollateralToken contract not available");
            }
            return {
                token: contracts.CollateralToken[parseInt(aTokenMap[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TF":
            if (!contracts.FeeToken) {
                throw new Error("FeeToken contract not available");
            }
            return {
                token: contracts.FeeToken[parseInt(aTokenMap[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TG":
            if (!contracts.TG) {
                throw new Error("TG contract not available");
            }
            return {
                token: contracts.TG,
                decimals: tokenExchangeSettings.decimals,
            };
        default:
            throw new Error("Invalid token name");
    }
}

function exchangeMethod(
    interfaceContext: InterfaceContext,
    tokenExchange: string,
    tokenReceive: string,
    tokenAmount: bigint,
    limitAmount: bigint,
    qAssetMaxFees: bigint,
    caIndex: number,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<unknown> {
    let tpIndex: number = 0;
    let iFromTP: number = 0;
    let iToTP: number = 0;

    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    const tokenExchangeSettings = TokenSettings(tokenExchange);
    const tokenReceiveSettings = TokenSettings(tokenReceive);

    switch (aTokenMap) {
        case "CA,TC":
            caIndex = parseInt(aTokenExchange[1]);
            if (tokenExchangeSettings.collateralType === "coinbase") {
                return mintTC_coinbase(
                    interfaceContext,
                    caIndex,
                    tokenAmount,
                    limitAmount,
                    onTransaction,
                    onReceipt
                );
            } else {
                return mintTC(
                    interfaceContext,
                    caIndex,
                    tokenAmount,
                    limitAmount,
                    onTransaction,
                    onReceipt
                );
            }
        case "TC,CA":
            caIndex = parseInt(aTokenReceive[1]);
            if (tokenReceiveSettings.collateralType === "coinbase") {
                return redeemTC_coinbase(
                    interfaceContext,
                    caIndex,
                    tokenAmount,
                    limitAmount,
                    onTransaction,
                    onReceipt
                );
            } else {
                return redeemTC(
                    interfaceContext,
                    caIndex,
                    tokenAmount,
                    limitAmount,
                    onTransaction,
                    onReceipt
                );
            }

        case "CA,TP":
            caIndex = parseInt(aTokenExchange[1]);
            tpIndex = parseInt(aTokenReceive[1]);
            if (tokenExchangeSettings.collateralType === "coinbase") {
                return mintTP_coinbase(
                    interfaceContext,
                    caIndex,
                    tpIndex,
                    tokenAmount,
                    limitAmount,
                    onTransaction,
                    onReceipt
                );
            } else {
                return mintTP(
                    interfaceContext,
                    caIndex,
                    tpIndex,
                    tokenAmount,
                    limitAmount,
                    onTransaction,
                    onReceipt
                );
            }
        case "TP,CA":
            tpIndex = parseInt(aTokenExchange[1]);
            caIndex = parseInt(aTokenReceive[1]);

            if (tokenReceiveSettings.collateralType === "coinbase") {
                return redeemTP_coinbase(
                    interfaceContext,
                    caIndex,
                    tpIndex,
                    tokenAmount,
                    limitAmount,
                    onTransaction,
                    onReceipt
                );
            } else {
                return redeemTP(
                    interfaceContext,
                    caIndex,
                    tpIndex,
                    tokenAmount,
                    limitAmount,
                    onTransaction,
                    onReceipt
                );
            }
        case "TP,TP":
            iFromTP = parseInt(aTokenExchange[1]);
            iToTP = parseInt(aTokenReceive[1]);
            return swapTPforTP(
                    interfaceContext,
                    iFromTP,
                    iToTP,
                    tokenAmount,
                    caIndex,
                    limitAmount,
                    qAssetMaxFees,
                    onTransaction,
                    onReceipt
                );                
        case "TP,TPCA":
            caIndex = parseInt(aTokenReceive[2]);
            iFromTP = parseInt(aTokenExchange[1]);
            iToTP = parseInt(aTokenReceive[1]);
            return swapTPforTP(
                    interfaceContext,
                    iFromTP,
                    iToTP,
                    tokenAmount,
                    caIndex,
                    limitAmount,
                    qAssetMaxFees,
                    onTransaction,
                    onReceipt
                );
        case "TC,TP":
            caIndex = parseInt(aTokenExchange[1]);
            tpIndex = parseInt(aTokenReceive[1]);
            return swapTCforTP(
                interfaceContext,
                tpIndex,
                tokenAmount,
                caIndex,
                limitAmount,
                qAssetMaxFees,
                onTransaction,
                onReceipt
            );
        default:
            throw new Error("Invalid Exchange Method map");
    }
}

function executionFeeMap(
    tokenExchange: string,
    tokenReceive: string,
    contractProtocolStatus: ContractProtocolStatusResult,
    caIndex: number
): bigint {
    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    switch (aTokenMap) {
        case "CA,TC":
            return contractProtocolStatus.data[parseInt(aTokenExchange[1])]
                .tcMintExecCost;
        case "CA,TP":
            return contractProtocolStatus.data[parseInt(aTokenExchange[1])]
                .tpMintExecCost;
        case "TP,CA":
            return contractProtocolStatus.data[parseInt(aTokenReceive[1])]
                .tpRedeemExecCost;
        case "TC,CA":
            return contractProtocolStatus.data[parseInt(aTokenReceive[1])]
                .tcRedeemExecCost;
        case "TP,TP":
            return contractProtocolStatus.data[caIndex]
                .swapTPforTPExecCost;        
        case "TP,TPCA":
            return contractProtocolStatus.data[parseInt(aTokenReceive[2])]
                .swapTPforTPExecCost;        
        case "TC,TP":
            return contractProtocolStatus.data[parseInt(aTokenExchange[1])]
                .swapTCforTPExecCost;        
        default:
            throw new Error("Invalid token name map");
    }
}

/**
 * Calculates the limit as: amount + amount * percentage
 * using only BigInt arithmetic by scaling the percentage.
 *
 * @param {bigint} amount - The base amount as BigInt.
 * @param {number} percentage - A decimal like 0.7 (70%).
 * @param {bigint} scale - Precision scale (default: 1_000_000n = 6 decimals).
 * @returns {bigint} The resulting amount with the percentage added.
 */
function calculateLimit(
    amount: bigint,
    percentage: number,
    scale = 1_000_000n
): bigint {
    // Convert the decimal percentage to a scaled integer
    const scaledPercentage = BigInt(Math.floor(percentage * Number(scale)));

    // Compute: amount * (1 + percentage) = amount * (scale + scaledPercentage) / scale
    const limit = (amount * (scale + scaledPercentage)) / scale;

    return limit;
}

export {
    calculateLimit,
    ApproveTokenContract,
    exchangeMethod,
    executionFeeMap,
    isMintOperation,
    TokenContract,
    tokenExchange,
    tokenReceive,
    UserTokenAllowance,
    typeOperation,
};

// Export types for use in other files
export type {
    ApproveTokenContractResult,
    DContracts,
    InterfaceContext,
    LimitAmount,
    OnReceipt,
    OnTransaction,
    TokenAmount,
    TokenContractResult,
    TokenMap,
    TokenName,
};
