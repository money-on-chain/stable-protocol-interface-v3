import settings from "../settings/settings.json";
import BigNumber from "bignumber.js";
import { fromContractPrecisionDecimals } from "./Formats";
import { TokenSettings } from "./currencies";
import { mintTC, redeemTC, mintTP, redeemTP } from "../lib/backend/moc-rc20";
import {
    mintTC as mintTC_coinbase,
    redeemTC as redeemTC_coinbase,
    mintTP as mintTP_coinbase,
    redeemTP as redeemTP_coinbase,
} from "../lib/backend/moc-coinbase";

// Type definitions
interface InterfaceContext {
    // Add specific interface context properties as needed
    [key: string]: any;
}

interface Auth {
    userBalanceData: {
        CA: Array<{ balance: number; allowance: number }>;
        TP: Array<Array<{ balance: number; allowance: number }>>;
        [key: number]: {
            TC: { balance: number; allowance: number };
            FeeToken: { balance: number; allowance: number };
        };
        TG: { balance: number; allowance: number };
    };
    contractStatusData: Array<{
        tcMintExecCost: string;
        tpMintExecCost: string;
        tpRedeemExecCost: string;
        tcRedeemExecCost: string;
    }>;
}

interface DContracts {
    contracts: {
        CA: Array<any>;
        Moc: Array<any>;
        CollateralToken: Array<any>;
        TP: Array<any>;
        FeeToken: Array<any>;
        TG: any;
        StakingMachine: any;
    };
}

interface TokenContractResult {
    token: any;
    decimals: number;
}

interface ApproveTokenContractResult {
    token: any;
    contractAllow: any;
    decimals: number;
}

interface TokenMap {
    [key: string]: string[];
}

type TokenName = string;
type TokenAmount = string | number;
type LimitAmount = string | number;
type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;

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

function TokenAllowance(auth: Auth, tokenExchange: string, caIndex: number): number {
    // Ex. tokenExchange = CA_0, CA_1, TP_0, TP_1, TC_0, TC_1, COINBASE, TF_0, TF_1
    //const tokenExchangeSettings = TokenSettings(tokenExchange);
    const aTokenExchange: string[] = tokenExchange.split("_");
    let allowance: number = 0;
    switch (aTokenExchange[0]) {
        case "CA":
            allowance =
                auth.userBalanceData.CA[parseInt(aTokenExchange[1])].allowance;
            break;
        case "TP":
            allowance =
                auth.userBalanceData.TP[caIndex][parseInt(aTokenExchange[1])].allowance;
            break;
        case "TC":
            allowance = auth.userBalanceData[parseInt(aTokenExchange[1])].TC.allowance;
            break;
        case "TF":
            allowance = auth.userBalanceData[parseInt(aTokenExchange[1])].FeeToken.allowance;
            break;
        default:
            throw new Error("Invalid token name");
    }

    return allowance;
}

function UserTokenAllowance(auth: Auth, tokenExchange: string, caIndex: number): BigNumber {
    const tokenExchangeSettings = TokenSettings(tokenExchange);

    return new BigNumber(
        fromContractPrecisionDecimals(
            TokenAllowance(auth, tokenExchange, caIndex),
            tokenExchangeSettings.decimals
        )
    );
}

function ApproveTokenContract(dContracts: DContracts, tokenExchange: string, tokenReceive: string): ApproveTokenContractResult {
    const tokenExchangeSettings = TokenSettings(tokenExchange);

    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;

    switch (aTokenMap) {
        case "CA,TC":
        case "CA,TP":
            return {
                token: dContracts.contracts.CA[parseInt(aTokenExchange[1])],
                contractAllow: dContracts.contracts.Moc[parseInt(aTokenExchange[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TC,CA":
            return {
                token: dContracts.contracts.CollateralToken[parseInt(aTokenExchange[1])],
                contractAllow: dContracts.contracts.Moc[parseInt(aTokenReceive[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TP,CA":
            return {
                token: dContracts.contracts.TP[parseInt(aTokenExchange[1])],
                contractAllow: dContracts.contracts.Moc[parseInt(aTokenReceive[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TF,TF":
            return {
                token: dContracts.contracts.FeeToken[parseInt(aTokenExchange[1])],
                contractAllow: dContracts.contracts.Moc[parseInt(aTokenExchange[1])],
                decimals: tokenExchangeSettings.decimals,
            };
        case "TG,ST": // Token Govern, Allow on Staking Machine
            return {
                token: dContracts.contracts.TG,
                contractAllow: dContracts.contracts.StakingMachine,
                decimals: tokenExchangeSettings.decimals,
            };
        default:
            throw new Error("Invalid token name");
    }
}

function TokenContract(contracts: any, tokenExchange: string): TokenContractResult {
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
    tokenAmount: TokenAmount,
    limitAmount: LimitAmount,
    onTransaction: OnTransaction,
    onReceipt: OnReceipt
): Promise<any> {
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

function executionFeeMap(tokenExchange: string, tokenReceive: string, auth: Auth): string {
    const aTokenExchange: string[] = tokenExchange.split("_");
    const aTokenReceive: string[] = tokenReceive.split("_");
    const aTokenMap: string = `${aTokenExchange[0]},${aTokenReceive[0]}`;
    switch (aTokenMap) {
        case "CA,TC":
            return auth.contractStatusData[parseInt(aTokenExchange[1])].tcMintExecCost;
        case "CA,TP":
            return auth.contractStatusData[parseInt(aTokenExchange[1])].tpMintExecCost;
        case "TP,CA":
            return auth.contractStatusData[parseInt(aTokenReceive[1])].tpRedeemExecCost;
        case "TC,CA":
            return auth.contractStatusData[parseInt(aTokenReceive[1])].tcRedeemExecCost;
        default:
            throw new Error("Invalid token name map");
    }
}

export {
    tokenExchange,
    tokenReceive,
    isMintOperation,
    UserTokenAllowance,
    ApproveTokenContract,
    exchangeMethod,
    TokenContract,
    executionFeeMap,
};

// Export types for use in other files
export type {
    InterfaceContext,
    Auth,
    DContracts,
    TokenContractResult,
    ApproveTokenContractResult,
    TokenMap,
    TokenName,
    TokenAmount,
    LimitAmount,
    OnTransaction,
    OnReceipt,
}; 