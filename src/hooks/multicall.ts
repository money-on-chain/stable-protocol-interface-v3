import BigNumber from "bignumber.js";
import axios from "axios";
import { parseUnits, useReadContracts } from 'viem'
import { readContract } from 'viem/actions'


import { fromContractPrecisionDecimals } from "../../helpers/Formats";
import settings from "../../settings/settings.json";
import omoc from "../../settings/omoc/omoc.json";
import mapPricesOffchain from "../../settings/prices-offchain.json";
import { toContractPrecisionDecimals } from "./utils";

// Type definitions for Multicall
interface MulticallCall {
    contractAddress: string;
    encodeABI: string;
    resultType: string | any[];
    keyName: string | number;
    keyIndex?: string | number | null;
    keySubIndex?: string | number | null;
    onError?: (() => { value: any; canOperate: boolean }) | undefined;
}

interface MulticallStorage {
    [key: string]: any;
}

type CAToken = {
    key: number;
    collateralType: string;
    name: string;
    fullName: string;
    decimals: number;
    visibleDecimals: number;
    visiblePriceDecimals: number;
    visiblePriceUSD: number;
    visibleBalanceDecimals: number;
    visibleBalanceUSDDecimals: number;
    peggedUSD: boolean;
    type?: string;
};

const onErrorLeverage = () => {
    const value = new BigNumber(
        115792089237316200000000000000000000000000000000000000
    );
    console.warn("WARN: Leverage too high!");
    return { value, canOperate: true };
};

const onErrorProposal = () => {
    console.warn("Proposal not exist");
    return { value: null, canOperate: true };
};

const onErrorFluxCapacitor = () => {
    console.warn("Flux capacitor is disabled");
    return { value: null, canOperate: true };
};

const onErrorTP = () => {
    return { value: null, canOperate: true };
};

const onErrorGetPTCac = () => {
    return { value: 0, canOperate: true };
};

class MultiCall3 {
    constructor(publicClient) {    
      this.publicClient = publicClient;
      this.calls = [];
      this.storage = {};
    }
    clear() {
      this.calls = [];
    }
    aggregate(
      contract,
      functionName,
      args,
      resultType,
      keyName,
      keyIndex,
      keySubIndex,
      onError
    ) {
      this.calls.push([
        contract,
        functionName,
        args,
        resultType,
        keyName,
        keyIndex,
        keySubIndex,
        onError,
      ]);
    }
    async fetch() {
      
      const convertedEntries = this.calls.map(([target, functionName, args]) => {
        const isGetBalance = functionName === 'getBalance';
        const isTargetAddress = typeof target === 'string';
        if (isGetBalance && isTargetAddress) {
          return {
            abi: [],
            address: target,
            functionName: 'getBalance',
            type: 'getBalance', 
          };
        }
        
        if (typeof target === 'object' && target.address && target.abi) {
          return {
            address: target.address,
            abi: target.abi,
            functionName,
            args,
          };
        }
      
        throw new Error(`Invalid call format for function "${functionName}"`);
      });
      
      const multiCallResult = await this.publicClient.multicall({
        contracts: convertedEntries
      })
      
      let canOperate = true;
      const calls = this.calls;
      const storage = this.storage;
      multiCallResult.forEach(function (item, itemIndex) {
        let value;
        const resultType = calls[itemIndex][3];      
        const keyName = calls[itemIndex][4];
        const keyIndex = calls[itemIndex][5];
        const keySubIndex = calls[itemIndex][6];
        const onError = calls[itemIndex][7];
  
        if (item.status === 'success') {
          value = item.result
        } else {
  
          if (onError !== undefined) {
            const resError = onError();
            value = resError["value"];
            canOperate = resError["canOperate"];
          } else {
            // Not Ok Error on calling
            if (resultType === "uint256" || resultType === "int256") {
              value = "0";
            } else if (resultType === "address") {
              value = "0x";
            } else if (resultType === "bool") {
              value = false;
            }
            // If there are any problems can not operate
            canOperate = false;
            console.warn(
              "WARN: Cannot operate! Index query:",
              itemIndex
            );
            console.warn("keyName:", keyName)
            console.warn("keyIndex:", keyIndex)
            console.warn("keySubIndex:", keySubIndex)
          }
  
        }
  
        if (keyIndex != null && keySubIndex != null) {
          if (!storage[keyName]) {
            if (keyName === parseInt(keyName, 10)) {
              storage[keyName] = [];
            } else {
              storage[keyName] = {};
            }
          }
          if (!storage[keyName][keyIndex]) {
            if (keyIndex === parseInt(keyIndex, 10)) {
              storage[keyName][keyIndex] = [];
            } else {
              storage[keyName][keyIndex] = {};
            }
          }
          storage[keyName][keyIndex][keySubIndex] = value;
        } else if (keyIndex != null) {
          if (!storage[keyName]) {
            if (keyName === parseInt(keyName, 10)) {
              storage[keyName] = [];
            } else {
              storage[keyName] = {};
            }
          }
          storage[keyName][keyIndex] = value;
        } else {
          storage[keyName] = value;
        }
  
      })
  
      storage["canOperate"] = canOperate;
  
      return storage;
  
    }
     
    
  }


  export { MultiCall3 };