import {
    mintTC as mintTC_coinbase,
    mintTP as mintTP_coinbase,
    redeemTC as redeemTC_coinbase,
    redeemTP as redeemTP_coinbase,
} from "../backend/moc-coinbase";
import { mintTC, mintTP, redeemTC, redeemTP } from "../backend/moc-rc20";
import settings from "../settings/settings.json";
import type { ContractInfo, DContracts } from "../types/hooks";
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
    TP_0: ['CA_0', 'CA_1'],
    TP_1: ['CA_0', 'CA_1']

    CA_0: ['TC_0', 'TP_0', 'TP_1']
    CA_1: ['TC_1', 'TP_0', 'TP_1']
    TC_0: ['CA_0']
    TC_1: ['CA_1']
    TP_0: ['CA_0', 'CA_1']
    TP_1: ['CA_0', 'CA_1']
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
        tMap[`TC_${i}`] = [`CA_${i}`];
    }

    // Exchange TP
    lReceive = [];
    for (let i = 0; i < settings.tokens.TP.length; i++) {
        lReceive = [];
        for (let a = 0; a < settings.tokens.CA.length; a++) {
            lReceive.push(`CA_${a}`);
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
            // Redeem
            return false;
        default:
            throw new Error("Invalid token name");
    }
}

function TokenAllowance(
    userBalance: { data: Record<string | number, unknown> },
    tokenExchange: string,
    caIndex: number
): bigint {
    // Ex. tokenExchange = CA_0, CA_1, TP_0, TP_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    //const tokenExchangeSettings = TokenSettings(tokenExchange);
    const aTokenExchange: string[] = tokenExchange.split("_");
    let allowance: bigint = 0n;
    switch (aTokenExchange[0]) {
        case "CA":
            allowance = (userBalance.data.CA as { allowance: bigint }[])[
                parseInt(aTokenExchange[1])
            ].allowance;
            break;
        case "TP":
            allowance = (userBalance.data.TP as { allowance: bigint }[][])[
                caIndex
            ][parseInt(aTokenExchange[1])].allowance;
            break;
        case "TC":
            allowance = (
                userBalance.data[parseInt(aTokenExchange[1])] as {
                    TC: { allowance: bigint };
                }
            ).TC.allowance;
            break;
        case "TF":
            allowance = (
                userBalance.data[parseInt(aTokenExchange[1])] as {
                    FeeToken: { allowance: bigint };
                }
            ).FeeToken.allowance;
            break;
        default:
            throw new Error("Invalid token name");
    }

    return allowance;
}

function UserTokenAllowance(
    userBalance: { data: Record<string | number, unknown> },
    tokenExchange: string,
    caIndex: number
): bigint {
    return TokenAllowance(userBalance, tokenExchange, caIndex);
}

function ApproveTokenContract(
    contracts: DContracts,
    tokenExchange: string,
    tokenReceive: string
): ApproveTokenContractResult {
    const tokenExchangeSettings = TokenSettings(tokenExchange);

    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;

    switch (aTokenMap) {
        case "CA,TC":
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

    const tokenMap: string = `${tokenExchange}`;
    const aTokenMap: string[] = tokenMap.split("_");
    switch (aTokenMap[0]) {
        case "CA":
            return {
                token: contracts.CA[parseInt(aTokenMap[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TP":
            return {
                token: contracts.TP[parseInt(aTokenMap[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TC":
            return {
                token: contracts.CollateralToken[parseInt(aTokenMap[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TF":
            return {
                token: contracts.FeeToken[parseInt(aTokenMap[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TG":
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
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<unknown> {
    let caIndex: number = 0;
    let tpIndex: number = 0;

    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    console.log("aTokenExchange", aTokenExchange);
    console.log("aTokenReceive", aTokenReceive);
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    console.log("aTokenMap", aTokenMap);
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
        default:
            throw new Error("Invalid Exchange Method map");
    }
}

function executionFeeMap(
    tokenExchange: string,
    tokenReceive: string,
    contractProtocolStatus: { data: Record<string | number, unknown> }
): bigint {
    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    switch (aTokenMap) {
        case "CA,TC":
            return (
                contractProtocolStatus.data[parseInt(aTokenExchange[1])] as {
                    tcMintExecCost: bigint;
                }
            ).tcMintExecCost;
        case "CA,TP":
            return (
                contractProtocolStatus.data[parseInt(aTokenExchange[1])] as {
                    tpMintExecCost: bigint;
                }
            ).tpMintExecCost;
        case "TP,CA":
            return (
                contractProtocolStatus.data[parseInt(aTokenReceive[1])] as {
                    tpRedeemExecCost: bigint;
                }
            ).tpRedeemExecCost;
        case "TC,CA":
            return (
                contractProtocolStatus.data[parseInt(aTokenReceive[1])] as {
                    tcRedeemExecCost: bigint;
                }
            ).tcRedeemExecCost;
        default:
            throw new Error("Invalid token name map");
    }
}

export {
    ApproveTokenContract,
    exchangeMethod,
    executionFeeMap,
    isMintOperation,
    TokenContract,
    tokenExchange,
    tokenReceive,
    UserTokenAllowance,
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
