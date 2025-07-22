import BigNumber from "bignumber.js";
import axios from "axios";
import { parseUnits } from 'viem'
import { readContract } from 'viem/actions'
import { useMemo } from 'react'

import { MultiCall3 } from "./multicall";
import { useMultiCall } from "./useMultiCall";

import settings from "../settings/settings.json";
import omoc from "../settings/omoc/omoc.json";
import mapPricesOffchain from "../settings/prices-offchain.json";


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


/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useContractProtocolStatus(contracts?: any, currentBlockNumber?: number, parsedPrices?: any) {
    const callsRequests = useMemo(() => {
        if (!contracts) return []

        if (!currentBlockNumber) return []

        if ((typeof import.meta.env.REACT_APP_PRICE_OFFCHAIN_API !== 'undefined') && !parsedPrices) return []
                
        const callRequest = []
        callRequest.push(
            {
                contract: contracts.PP_COINBASE,
                functionName: 'peek',
                args: [],
                resultType: 'uint256',
                keyName: 'PP_COINBASE'            
            }
        )

        const vendorAddress =
        `${import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS}`.toLowerCase();
        let contractMocType: string | undefined;
        let Moc;
        let MocVendors;
        let MocQueue;
        let PP_FeeToken;
        let FC_MAX_ABSOLUTE_OP_PROVIDER;
        let FC_MAX_OP_DIFFERENCE_PROVIDER;
        let PP_TP;

        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            const caToken = settings.tokens.CA[ca] as CAToken;
            contractMocType = caToken.type;
            Moc = contracts.Moc[ca];
            MocVendors = contracts.MocVendors[ca];
            MocQueue = contracts.MocQueue[ca];
            PP_FeeToken = contracts.PP_FeeToken[ca];
            FC_MAX_ABSOLUTE_OP_PROVIDER = contracts.FC_MAX_ABSOLUTE_OP_PROVIDER[ca];
            FC_MAX_OP_DIFFERENCE_PROVIDER = contracts.FC_MAX_OP_DIFFERENCE_PROVIDER[ca];
            
            callRequest.push({
                contract: Moc,
                functionName: 'protThrld',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'protThrld'            
            })

            callRequest.push({
                contract: Moc,
                functionName: 'liqThrld',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'liqThrld'            
            })
            
            callRequest.push({
                contract: Moc,
                functionName: 'liquidated',
                args: [],
                resultType: 'bool',
                keyName: ca,
                keyIndex: 'liquidated'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'nACcb',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'nACcb'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'nTCcb',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'nTCcb'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'tcMintFee',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tcMintFee'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'tcMintFee',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tcMintFee'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'tcRedeemFee',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tcRedeemFee'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'getPTCac',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getPTCac',            
                onError: onErrorGetPTCac
            })
            
            callRequest.push({
                contract: Moc,
                functionName: 'getCglb',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getCglb'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'getLckAC',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getLckAC'            
            })
            
            callRequest.push({
                contract: Moc,
                functionName: 'getTCAvailableToRedeem',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getTCAvailableToRedeem'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'getTotalACavailable',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getTotalACavailable'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'getCtargemaCA',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getCtargemaCA'            
            })
            
            callRequest.push({
                contract: Moc,
                functionName: 'feeTokenPct',
                args: [],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'feeTokenPct'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'feeToken',
                args: [],
                resultType: 'address',
                keyName: ca,
                keyIndex: 'feeToken'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'feeToken',
                args: [],
                resultType: 'address',
                keyName: ca,
                keyIndex: 'feeToken'            
            })
    
            callRequest.push({
                contract: PP_FeeToken,
                functionName: 'peek',
                args: [],
                resultType: [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                keyName: ca,
                keyIndex: 'PP_FeeToken'            
            })
    
            callRequest.push({
                contract: MocVendors,
                functionName: 'vendorMarkup',
                args: [vendorAddress],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'vendorMarkup'            
            })
            
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [1],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tcMintExecCost'            
            })
    
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [2],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tcRedeemExecCost'            
            })
    
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [3],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tpMintExecCost'            
            })
    
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [4],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tpRedeemExecCost'            
            })
    
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [9],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'swapTPforTPExecCost'            
            })
    
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [8],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'swapTPforTCExecCost'            
            })
            
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [7],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'swapTCforTPExecCost'            
            })
            
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [6],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'redeemTCandTPExecCost'            
            })
            
            callRequest.push({
                contract: MocQueue,
                functionName: 'execCost',
                args: [5],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'mintTCandTPExecCost'            
            })
            
            
            callRequest.push({
                contract: Moc,
                functionName: 'maxQACToMintTP',
                args: [currentBlockNumber],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'maxQACToMintTP'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'maxQACToRedeemTP',
                args: [currentBlockNumber],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'maxQACToRedeemTP'            
            })
    
            callRequest.push({
                contract: Moc,
                functionName: 'paused',
                args: [],
                resultType: 'bool',
                keyName: ca,
                keyIndex: 'paused'            
            })
    
            callRequest.push({
                contract: contracts.MocMultiCollateralGuard,
                functionName: 'getRealTCAvailableToRedeem',
                args: [Moc.address],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getRealTCAvailableToRedeem'            
            })
    
            let tpAddress;
            for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                tpAddress = contracts.TP[tp].address;
                PP_TP = contracts.PP_TP[ca][tp];
                
                callRequest.push({
                    contract: PP_TP,
                    functionName: 'peek',
                    args: [],
                    resultType: [
                        {
                            "internalType": "bytes32",
                            "name": "",
                            "type": "bytes32"
                        },
                        {
                            "internalType": "bool",
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    keyName: ca,
                    keyIndex: 'PP_TP',
                    keySubIndex: tp
                });
    
                callRequest.push({
                    contract: Moc,
                    functionName: 'tpMintFees',
                    args: [tpAddress],
                    resultType: 'uint256',
                    keyName: ca,
                    keyIndex: 'tpMintFees',
                    keySubIndex: tp
                });
                
                callRequest.push({
                    contract: Moc,
                    functionName: 'tpRedeemFees',
                    args: [tpAddress],
                    resultType: 'uint256',
                    keyName: ca,
                    keyIndex: 'tpRedeemFees',
                    keySubIndex: tp
                });
    
                callRequest.push({
                    contract: Moc,
                    functionName: 'tpCtarg',
                    args: [tp],
                    resultType: 'uint256',
                    keyName: ca,
                    keyIndex: 'tpCtarg',
                    keySubIndex: tp
                });
    
                callRequest.push({
                    contract: Moc,
                    functionName: 'pegContainer',
                    args: [tp],
                    resultType: 'uint256',
                    keyName: ca,
                    keyIndex: 'pegContainer',
                    keySubIndex: tp
                });
    
                callRequest.push({
                    contract: Moc,
                    functionName: 'getTPAvailableToMint',
                    args: [tpAddress],
                    resultType: 'int256',
                    keyName: ca,
                    keyIndex: 'getTPAvailableToMint',
                    keySubIndex: tp
                });
    
                callRequest.push({
                    contract: Moc,
                    functionName: 'tpEma',
                    args: [tp],
                    resultType: 'uint256',
                    keyName: ca,
                    keyIndex: 'tpEma',
                    keySubIndex: tp
                });
    
                callRequest.push({
                    contract: contracts.MocMultiCollateralGuard,
                    functionName: 'getRealTPAvailableToMint',
                    args: [Moc.address, tpAddress],
                    resultType: 'uint256',
                    keyName: ca,
                    keyIndex: 'getRealTPAvailableToMint',
                    keySubIndex: tp
                });
            }
        }
        callRequest.push({
            contract: contracts.MocMultiCollateralGuard,
            functionName: 'getCombinedCglb',
            args: [],
            resultType: 'uint256',
            keyName: 'getCombinedCglb'        
        });
    
        callRequest.push({
            contract: contracts.MocMultiCollateralGuard,
            functionName: 'getCombinedCtargemaCA',
            args: [],
            resultType: 'uint256',
            keyName: 'getCombinedCtargemaCA'        
        });
    
        
        callRequest.push({
            contract: contracts.MocMultiCollateralGuard,
            functionName: 'getNormalizationFactors',
            args: [],
            resultType: 'uint256[]',
            keyName: 'getNormalizationFactors'
        });
        
        let PP_CA;
        let CA;
        let countRC20 = 0
        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            PP_CA = contracts.PP_CA[ca];
            Moc = contracts.Moc[ca];
            contractMocType = (settings.tokens.CA[ca] as CAToken).type;

            if (contractMocType === "coinbase") {
                callRequest.push({
                    contract: Moc,
                    functionName: 'getBalance',
                    args: [Moc.address],
                    resultType: 'uint256',
                    keyName: ca,
                    keyIndex: 'getACBalance'
                });
            } else {
                CA = contracts.CA[countRC20];
                callRequest.push({
                    contract: CA,
                    functionName: 'balanceOf',
                    args: [Moc.address],
                    resultType: 'uint256',
                    keyName: ca,
                    keyIndex: 'getACBalance'
                });
                countRC20++;
            }
            callRequest.push({
                contract: PP_CA,
                functionName: 'peek',
                args: [],
                resultType: [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                keyName: ca,
                KeyIndex: "PP_CA"
            });
        }

        if (parsedPrices){

                let priceOfflineTPs
                const bucketsPACtps: any[] = [];
                for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                    priceOfflineTPs = parsedPrices[ca].TP;
                    bucketsPACtps.push(priceOfflineTPs);
                }

                const tpAddresses = []
                for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                    const tpAddress = contracts.TP[tp]
                    tpAddresses.push(tpAddress.address)
                }

                callRequest.push({
                    contract: contracts.MocMultiCollateralGuard,
                    functionName: 'calcNormalizationFactorsWithPrices',
                    args: [bucketsPACtps],
                    resultType: 'uint256[]',
                    keyName: 'getNormalizationFactors'
                })

                callRequest.push({
                    contract: contracts.MocMultiCollateralGuard,
                    functionName: 'calcCombinedCglbWithPrices',
                    args: [bucketsPACtps],
                    resultType: 'uint256',
                    keyName: 'getCombinedCglb'
                })

                callRequest.push({
                    contract: contracts.MocMultiCollateralGuard,
                    functionName: 'calcCombinedCtargemaCAWithPrices',
                    args: [bucketsPACtps],
                    resultType: 'uint256',
                    keyName: 'getCombinedCtargemaCA'
                })

                for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                    Moc = contracts.Moc[ca]
                    priceOfflineTPs = parsedPrices[ca].TP

                    callRequest.push({
                        contract: Moc,
                        functionName: 'calcPTCac',
                        args: [priceOfflineTPs],
                        resultType: 'uint256',
                        keyName: ca,
                        keyIndex: 'getPTCac',
                        keySubIndex: null,
                        onError: onErrorGetPTCac
                    })

                    callRequest.push({
                        contract: Moc,
                        functionName: 'calcCglb',
                        args: [priceOfflineTPs],
                        resultType: 'uint256',
                        keyName: ca,
                        keyIndex: 'getCglb',
                        keySubIndex: null
                    })

                    callRequest.push({
                        contract: Moc,
                        functionName: 'calcLckAC',
                        args: [priceOfflineTPs],
                        resultType: 'uint256',
                        keyName: ca,
                        keyIndex: 'getLckAC',
                        keySubIndex: null
                    })

                    callRequest.push({
                        contract: Moc,
                        functionName: 'calcLckACemaAdjusted',
                        args: [priceOfflineTPs],
                        resultType: 'uint256',
                        keyName: ca,
                        keyIndex: 'calcLckACemaAdjusted',
                        keySubIndex: null
                    })

                    callRequest.push({
                        contract: Moc,
                        functionName: 'calcTCAvailableToRedeem',
                        args: [priceOfflineTPs],
                        resultType: 'uint256',
                        keyName: ca,
                        keyIndex: 'getTCAvailableToRedeem',
                        keySubIndex: null
                    })

                    callRequest.push({
                        contract: Moc,
                        functionName: 'calcCtargemaCA',
                        args: [priceOfflineTPs],
                        resultType: 'uint256',
                        keyName: ca,
                        keyIndex: 'getCtargemaCA',
                        keySubIndex: null
                    })

                    callRequest.push({
                        contract: contracts.MocMultiCollateralGuard,
                        functionName: 'calcRealTCAvailableToRedeemWithPrices',
                        args: [Moc.address, bucketsPACtps],
                        resultType: 'uint256',
                        keyName: ca,
                        keyIndex: 'getRealTCAvailableToRedeem',
                    })

                    //status[ca].PP_CA = [parsedPrices[ca].CA, true]
                    //status[ca].getTotalACavailable = status[ca].nACcb
                    
                    for (let tp = 0; tp < settings.tokens.TP.length; tp++) {

                        callRequest.push({
                            contract: Moc,
                            functionName: 'calcTPAvailableToMint',
                            args: [tpAddresses[tp], priceOfflineTPs],
                            resultType: 'int256',
                            keyName: ca,
                            keyIndex: 'getTPAvailableToMint',
                            keySubIndex: tp
                        })

                        callRequest.push({
                            contract: contracts.MocMultiCollateralGuard,
                            functionName: 'calcRealTPAvailableToMintWithPrices',
                            args: [Moc.address, tpAddresses[tp], bucketsPACtps],
                            resultType: 'uint256',
                            keyName: ca,
                            keyIndex: 'getRealTPAvailableToMint',
                            keySubIndex: tp
                        })   
                        
                        //status[ca].PP_TP[tp] = [parsedPrices[ca].TP[tp], true]
                    }
                }

        }

        return callRequest
    }, [contracts])

      
    // Pass calls into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
      refetchInterval: 30_000,
      enabled: callsRequests.length > 0,
    })
  
    return multicallState
  }

const contractStatus = async (
    publicClient: any,
    contracts: any
): Promise<any> => {
    if (!contracts) return;

    const vendorAddress =
        `${import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS}`.toLowerCase();    
        
    // OMOC    
    let proposalCountVoting: number | undefined;
    if (typeof import.meta.env.REACT_APP_CONTRACT_IREGISTRY !== "undefined") {        
        proposalCountVoting = await readContract(publicClient, {
            address: contracts.VotingMachine.address,
            abi: contracts.VotingMachine.abi,
            functionName: 'getProposalCount',
            args: [],
            })
    }

    //const multiCallRequest = new MultiCall3(publicClient)
    const currentBlockNumber =  await publicClient.getBlockNumber()  
    
    let contractMocType: string | undefined;
    let Moc;
    let MocVendors;
    let MocQueue;
    let PP_FeeToken;
    let FC_MAX_ABSOLUTE_OP_PROVIDER;
    let FC_MAX_OP_DIFFERENCE_PROVIDER;
    let PP_TP;
    
    const callRequest = []
    callRequest.push(
        {
            contract: contracts.PP_COINBASE,
            functionName: 'peek',
            args: [],
            resultType: 'uint256',
            keyName: 'PP_COINBASE'            
        }
    )

    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        const caToken = settings.tokens.CA[ca] as CAToken;
        contractMocType = caToken.type;
        Moc = contracts.Moc[ca];
        MocVendors = contracts.MocVendors[ca];
        MocQueue = contracts.MocQueue[ca];
        PP_FeeToken = contracts.PP_FeeToken[ca];
        FC_MAX_ABSOLUTE_OP_PROVIDER = contracts.FC_MAX_ABSOLUTE_OP_PROVIDER[ca];
        FC_MAX_OP_DIFFERENCE_PROVIDER = contracts.FC_MAX_OP_DIFFERENCE_PROVIDER[ca];
        
        callRequest.push({
            contract: Moc,
            functionName: 'protThrld',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'protThrld'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'liqThrld',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'liqThrld'            
        })
        
        callRequest.push({
            contract: Moc,
            functionName: 'liquidated',
            args: [],
            resultType: 'bool',
            keyName: ca,
            keyIndex: 'liquidated'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'nACcb',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'nACcb'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'nTCcb',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'nTCcb'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'tcMintFee',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'tcMintFee'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'tcMintFee',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'tcMintFee'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'tcRedeemFee',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'tcRedeemFee'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'getPTCac',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'getPTCac',            
            onError: onErrorGetPTCac
        })
        
        callRequest.push({
            contract: Moc,
            functionName: 'getCglb',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'getCglb'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'getLckAC',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'getLckAC'            
        })
        
        callRequest.push({
            contract: Moc,
            functionName: 'getTCAvailableToRedeem',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'getTCAvailableToRedeem'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'getTotalACavailable',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'getTotalACavailable'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'getCtargemaCA',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'getCtargemaCA'            
        })
        
        callRequest.push({
            contract: Moc,
            functionName: 'feeTokenPct',
            args: [],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'feeTokenPct'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'feeToken',
            args: [],
            resultType: 'address',
            keyName: ca,
            keyIndex: 'feeToken'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'feeToken',
            args: [],
            resultType: 'address',
            keyName: ca,
            keyIndex: 'feeToken'            
        })

        callRequest.push({
            contract: PP_FeeToken,
            functionName: 'peek',
            args: [],
            resultType: [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                },
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            keyName: ca,
            keyIndex: 'PP_FeeToken'            
        })

        callRequest.push({
            contract: MocVendors,
            functionName: 'vendorMarkup',
            args: [vendorAddress],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'vendorMarkup'            
        })
        
        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [1],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'tcMintExecCost'            
        })

        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [2],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'tcRedeemExecCost'            
        })

        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [3],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'tpMintExecCost'            
        })

        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [4],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'tpRedeemExecCost'            
        })

        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [9],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'swapTPforTPExecCost'            
        })

        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [8],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'swapTPforTCExecCost'            
        })
        
        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [7],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'swapTCforTPExecCost'            
        })
        
        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [6],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'redeemTCandTPExecCost'            
        })
        
        callRequest.push({
            contract: MocQueue,
            functionName: 'execCost',
            args: [5],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'mintTCandTPExecCost'            
        })
        
        
        callRequest.push({
            contract: Moc,
            functionName: 'maxQACToMintTP',
            args: [currentBlockNumber],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'maxQACToMintTP'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'maxQACToRedeemTP',
            args: [currentBlockNumber],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'maxQACToRedeemTP'            
        })

        callRequest.push({
            contract: Moc,
            functionName: 'paused',
            args: [],
            resultType: 'bool',
            keyName: ca,
            keyIndex: 'paused'            
        })

        callRequest.push({
            contract: contracts.MocMultiCollateralGuard,
            functionName: 'getRealTCAvailableToRedeem',
            args: [Moc.address],
            resultType: 'uint256',
            keyName: ca,
            keyIndex: 'getRealTCAvailableToRedeem'            
        })

        let tpAddress;
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
            tpAddress = contracts.TP[tp].address;
            PP_TP = contracts.PP_TP[ca][tp];
            
            callRequest.push({
                contract: PP_TP,
                functionName: 'peek',
                args: [],
                resultType: [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                keyName: ca,
                keyIndex: 'PP_TP',
                keySubIndex: tp
            });

            callRequest.push({
                contract: Moc,
                functionName: 'tpMintFees',
                args: [tpAddress],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tpMintFees',
                keySubIndex: tp
            });
            
            callRequest.push({
                contract: Moc,
                functionName: 'tpRedeemFees',
                args: [tpAddress],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tpRedeemFees',
                keySubIndex: tp
            });

            callRequest.push({
                contract: Moc,
                functionName: 'tpCtarg',
                args: [tp],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tpCtarg',
                keySubIndex: tp
            });

            callRequest.push({
                contract: Moc,
                functionName: 'pegContainer',
                args: [tp],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'pegContainer',
                keySubIndex: tp
            });

            callRequest.push({
                contract: Moc,
                functionName: 'getTPAvailableToMint',
                args: [tpAddress],
                resultType: 'int256',
                keyName: ca,
                keyIndex: 'getTPAvailableToMint',
                keySubIndex: tp
            });

            callRequest.push({
                contract: Moc,
                functionName: 'tpEma',
                args: [tp],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'tpEma',
                keySubIndex: tp
            });

            callRequest.push({
                contract: contracts.MocMultiCollateralGuard,
                functionName: 'getRealTPAvailableToMint',
                args: [Moc.address, tpAddress],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getRealTPAvailableToMint',
                keySubIndex: tp
            });
        }
    }

    callRequest.push({
        contract: contracts.MocMultiCollateralGuard,
        functionName: 'getCombinedCglb',
        args: [],
        resultType: 'uint256',
        keyName: 'getCombinedCglb'        
    });

    callRequest.push({
        contract: contracts.MocMultiCollateralGuard,
        functionName: 'getCombinedCtargemaCA',
        args: [],
        resultType: 'uint256',
        keyName: 'getCombinedCtargemaCA'        
    });

    
    callRequest.push({
        contract: contracts.MocMultiCollateralGuard,
        functionName: 'getNormalizationFactors',
        args: [],
        resultType: 'uint256[]',
        keyName: 'getNormalizationFactors'
    });

    // OMOC
    if (typeof contracts.IRegistry !== "undefined") {
        callRequest.push({
            contract: contracts.StakingMachine,
            functionName: 'getWithdrawLockTime',
            args: [],
            resultType: "uint256",
            keyName: "stakingmachine",
            keyIndex: 'getWithdrawLockTime'
        });

        callRequest.push({
            contract: contracts.StakingMachine,
            functionName: 'getSupporters',
            args: [],
            resultType: 'address',
            keyName: 'stakingmachine',
            keyIndex: 'getSupporters'
        });

        callRequest.push({
            contract: contracts.StakingMachine,
            functionName: 'getOracleManager',
            args: [],
            resultType: 'address',
            keyName: 'stakingmachine',
            keyIndex: 'getOracleManager'
        });

        callRequest.push({
            contract: contracts.StakingMachine,
            functionName: 'getDelayMachine',
            args: [],
            resultType: 'address',
            keyName: 'stakingmachine',
            keyIndex: 'getDelayMachine'
        });

        callRequest.push({
            contract: contracts.DelayMachine,
            functionName: 'getLastId',
            args: [],
            resultType: 'uint256',
            keyName: 'delaymachine',
            keyIndex: 'getLastId'
        });

        callRequest.push({
            contract: contracts.DelayMachine,
            functionName: 'getSource',
            args: [],
            resultType: 'address',
            keyName: 'delaymachine',
            keyIndex: 'getSource'
        });

        callRequest.push({
            contract: contracts.Supporters,
            functionName: 'isReadyToDistribute',
            args: [],
            resultType: 'bool',
            keyName: 'supporters',
            keyIndex: 'isReadyToDistribute'
        });

        callRequest.push({
            contract: contracts.Supporters,
            functionName: 'mocToken',
            args: [],
            resultType: 'address',
            keyName: 'supporters',
            keyIndex: 'mocToken'
        });

        callRequest.push({
            contract: contracts.Supporters,
            functionName: 'period',
            args: [],
            resultType: 'uint256',
            keyName: 'supporters',
            keyIndex: 'period'
        });

        callRequest.push({
            contract: contracts.Supporters,
            functionName: 'totalMoc',
            args: [],
            resultType: 'uint256',
            keyName: 'supporters',
            keyIndex: 'totalMoc'
        });

        callRequest.push({
            contract: contracts.Supporters,
            functionName: 'totalToken',
            args: [],
            resultType: 'uint256',
            keyName: 'supporters',
            keyIndex: 'totalToken'
        });

        callRequest.push({
            contract: contracts.VotingMachine,
            functionName: 'getState',
            args: [],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'getState'
        });

        callRequest.push({
            contract: contracts.VotingMachine,
            functionName: 'getVotingRound',
            args: [],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'getVotingRound'
        });

        callRequest.push({
            contract: contracts.VotingMachine,
            functionName: 'getVoteInfo',
            args: [],
            resultType: [
                { type: "address", name: "winnerProposal" },
                { type: "uint256", name: "inFavorVotes" },
                { type: "uint256", name: "againstVotes" }
            ],
            keyName: 'votingmachine',
            keyIndex: 'getVoteInfo'
        });

        callRequest.push({
            contract: contracts.VotingMachine,
            functionName: 'readyToPreVoteStep',
            args: [],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'readyToPreVoteStep'
        });

        callRequest.push({
            contract: contracts.VotingMachine,
            functionName: 'readyToVoteStep',
            args: [],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'readyToVoteStep'
        });

        callRequest.push({
            contract: contracts.VotingMachine,
            functionName: 'getProposalCount',
            args: [],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'getProposalCount'
        });

        callRequest.push({
            contract: contracts.VotingMachine,
            functionName: 'getVotingData',
            args: [],
            resultType: [
                { type: "address", name: "winnerProposal" },
                { type: "uint256", name: "inFavorVotes" },
                { type: "uint256", name: "againstVotes" },
                { type: "uint256", name: "votingExpirationTime" },
            ],
            keyName: 'votingmachine',
            keyIndex: 'getVotingData'
        });

        callRequest.push({
            contract: contracts.TG,
            functionName: 'totalSupply',
            args: [],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'totalSupply'
        });

        // Proposals
        let indexProp;
        if (proposalCountVoting !== undefined) {
            for (let i = 1; i < 30; i++) {
                if (proposalCountVoting - BigInt(i) >= 0) {
                    indexProp = proposalCountVoting - i;
                    callRequest.push({
                        contract: contracts.VotingMachine,
                        functionName: 'getProposalByIndex',
                        args: [indexProp],
                        resultType: [
                            { type: "address", name: "proposalAddress" },
                            { type: "uint256", name: "votingRound" },
                            { type: "uint256", name: "votes" },
                            { type: "uint256", name: "expirationTimeStamp" },
                        ],
                        keyName: "votingmachine",
                        keyIndex: "getProposalByIndex",
                        keySubIndex: indexProp,
                        onError: onErrorProposal
                    });
                }
            }
        }

        // OMOC REGISTRY CONSTANT
        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_MIN_STAKE],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'MIN_STAKE'
        });

        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PRE_VOTE_EXPIRATION_TIME_DELTA],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'PRE_VOTE_EXPIRATION_TIME_DELTA'
        });

        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_MAX_PRE_PROPOSALS],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'MAX_PRE_PROPOSALS'
        });

        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PRE_VOTE_MIN_PCT_TO_WIN],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'PRE_VOTE_MIN_PCT_TO_WIN'
        });

        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_TO_VETO],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'VOTE_MIN_PCT_TO_VETO'
        });

        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_FOR_QUORUM],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'MIN_PCT_FOR_QUORUM'
        });

        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTE_MIN_PCT_TO_ACCEPT],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'VOTE_MIN_PCT_TO_ACCEPT'
        });

        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_PCT_PRECISION],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'PCT_PRECISION'
        });

        callRequest.push({
            contract: contracts.IRegistry,
            functionName: 'getUint',
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTING_TIME_DELTA],
            resultType: 'uint256',
            keyName: 'votingmachine',
            keyIndex: 'VOTING_TIME_DELTA'
        });
    }

    let PP_CA;
    let CA;
    let countRC20 = 0
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        PP_CA = contracts.PP_CA[ca];
        Moc = contracts.Moc[ca];
        contractMocType = (settings.tokens.CA[ca] as CAToken).type;

        if (contractMocType === "coinbase") {
            callRequest.push({
                contract: Moc,
                functionName: 'getBalance',
                args: [Moc.address],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getACBalance'
            });
        } else {
            CA = contracts.CA[countRC20];
            callRequest.push({
                contract: CA,
                functionName: 'balanceOf',
                args: [Moc.address],
                resultType: 'uint256',
                keyName: ca,
                keyIndex: 'getACBalance'
            });
            countRC20++;
        }
        callRequest.push({
            contract: PP_CA,
            functionName: 'peek',
            args: [],
            resultType: [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                },
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            keyName: ca,
            KeyIndex: "PP_CA"
        });
    }

    const { storage, isFetching, refetch } = useMultiCall3(callRequest)
    console.log("DEBUG>>>>2")
    console.log(storage)
    console.log(isFetching)
    console.log(refetch)
    //const status = await multiCallRequest.fetch()
    //console.log(status)

    
    // Price Off-chain. Status variables calculated from off-chain prices
    status.pricesOffchain = false
    if (typeof import.meta.env.REACT_APP_PRICE_OFFCHAIN_API !== 'undefined') {
        const mapPrices = mapPricesOffchain.prices
        console.warn("Price Off-chain detected - Using price off-chain API")
        const coinpairs = []
        let coinpair = ''
        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            // CA Coin pair
            coinpair = mapPrices[ca].CA
            coinpairs.push(coinpair)
            // TP Coin pair
            for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                coinpair = mapPrices[ca].TP[tp]
                coinpairs.push(coinpair)
            }
            // TF Coin pair
            coinpair = mapPrices[ca].TF
            coinpairs.push(coinpair)
            // COINBASE Coin pair
            coinpair = mapPrices[ca].COINBASE
            coinpairs.push(coinpair)
        }

        try {
            // Get price offline
            const apiUrl =
                `${import.meta.env.REACT_APP_PRICE_OFFCHAIN_API}` +
                'api/offchain_prices/'

            const response = await axios({
                url: apiUrl,
                params: {
                    coinpairs: coinpairs.join()
                },
                method: 'get',
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.status === 200) {
                //console.log(response.data)
                /* Parsed response */
                let coinpair
                const parsedPrices: Record<string, any>[] = [];
                let caParsePrices: Record<string, any>;
                let tpParsePrices: any[];
                for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                    caParsePrices = {};
                    // CA Coin pair
                    coinpair = mapPrices[ca].CA;
                    caParsePrices.CA = parseUnits(response.data.values[coinpair].toFixed(18), 18);
                    // TP Coin pair
                    tpParsePrices = [];
                    for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                        coinpair = mapPrices[ca].TP[tp];
                        tpParsePrices.push(parseUnits(response.data.values[coinpair].toFixed(18), 18));
                    }
                    caParsePrices.TP = tpParsePrices;
                    // TF Coin pair
                    coinpair = mapPrices[ca].TF;
                    caParsePrices.TF = parseUnits(response.data.values[coinpair].toFixed(18), 18);
                    // COINBASE Coin pair
                    coinpair = mapPrices[ca].COINBASE;
                    caParsePrices.COINBASE = parseUnits(response.data.values[coinpair].toFixed(18), 18);
                    parsedPrices.push(caParsePrices);
                }
                //console.log('Parsed prices:')
                //console.log(parsedPrices)

                // const priceOfflineTPs = [
                //   toContractPrecisionDecimals(new BigNumber(156888645.02), 18),
                //   toContractPrecisionDecimals(new BigNumber(527823690.18), 18)]
                const tpAddresses = []
                for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                    const tpAddress = contracts.TP[tp]
                    tpAddresses.push(tpAddress.address)
                }

                // Price Off-chain
                const multiCallRequestPO = new MultiCall3(publicClient)

                let priceOfflineTPs
                const bucketsPACtps: any[] = [];
                for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                    priceOfflineTPs = parsedPrices[ca].TP;
                    bucketsPACtps.push(priceOfflineTPs);
                }

                multiCallRequestPO.aggregate(contracts.MocMultiCollateralGuard, 'calcNormalizationFactorsWithPrices', [bucketsPACtps], 'uint256[]', 'calcNormalizationFactorsWithPrices')
                multiCallRequestPO.aggregate(contracts.MocMultiCollateralGuard, 'calcCombinedCglbWithPrices', [bucketsPACtps], 'uint256', 'calcCombinedCglbWithPrices')
                multiCallRequestPO.aggregate(contracts.MocMultiCollateralGuard, 'calcCombinedCtargemaCAWithPrices', [bucketsPACtps], 'uint256', 'calcCombinedCtargemaCAWithPrices')

                for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                    Moc = contracts.Moc[ca]
                    priceOfflineTPs = parsedPrices[ca].TP
                    multiCallRequestPO.aggregate(Moc, 'calcPTCac', [priceOfflineTPs], 'uint256', ca, 'calcPTCac', null, onErrorGetPTCac)
                    multiCallRequestPO.aggregate(Moc, 'calcCglb', [priceOfflineTPs], 'uint256', ca, 'calcCglb')
                    multiCallRequestPO.aggregate(Moc, 'calcLckAC', [priceOfflineTPs], 'uint256', ca, 'calcLckAC')
                    multiCallRequestPO.aggregate(Moc, 'calcLckACemaAdjusted', [priceOfflineTPs], 'uint256', ca, 'calcLckACemaAdjusted')
                    multiCallRequestPO.aggregate(Moc, 'calcTCAvailableToRedeem', [priceOfflineTPs], 'uint256', ca, 'calcTCAvailableToRedeem')
                    multiCallRequestPO.aggregate(Moc, 'calcCtargemaCA', [priceOfflineTPs], 'uint256', ca, 'calcCtargemaCA')
                    multiCallRequestPO.aggregate(contracts.MocMultiCollateralGuard, 'calcRealTCAvailableToRedeemWithPrices', [Moc.address, bucketsPACtps], 'uint256', ca, 'calcRealTCAvailableToRedeemWithPrices')
                    for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                        multiCallRequestPO.aggregate(Moc, 'calcTPAvailableToMint', [tpAddresses[tp], priceOfflineTPs], 'int256', ca, 'calcTPAvailableToMint', tp)
                        multiCallRequestPO.aggregate(contracts.MocMultiCollateralGuard, 'calcRealTPAvailableToMintWithPrices', [Moc.address, tpAddresses[tp], bucketsPACtps], 'uint256', ca, 'calcRealTPAvailableToMintWithPrices', tp)
                    }
                }
                status.PO = await multiCallRequestPO.fetch()

                // Map On-chain values with Off-chain calculation
                status.getNormalizationFactors = status.PO.calcNormalizationFactorsWithPrices
                status.getCombinedCglb = status.PO.calcCombinedCglbWithPrices
                status.getCombinedCtargemaCA = status.PO.calcCombinedCtargemaCAWithPrices
                for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
                    status[ca].getPTCac = status.PO[ca].calcPTCac
                    status[ca].getCglb = status.PO[ca].calcCglb
                    status[ca].getLckAC = status.PO[ca].calcLckAC
                    status[ca].getCtargemaCA = status.PO[ca].calcCtargemaCA
                    status[ca].getTCAvailableToRedeem = status.PO[ca].calcTCAvailableToRedeem
                    status[ca].getRealTCAvailableToRedeem = status.PO[ca].calcRealTCAvailableToRedeemWithPrices
                    status[ca].PP_CA = [parsedPrices[ca].CA, true]
                    //status[ca].PP_FeeToken = [parsedPrices[ca].TF, true]
                    //status[ca].PP_COINBASE = [parsedPrices[ca].COINBASE, true]
                    // Warning!: With success fee disabled is safe to use nACcb as getTotalACavailable
                    status[ca].getTotalACavailable = status[ca].nACcb
                    for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                        status[ca].getTPAvailableToMint[tp] = status.PO[ca].calcTPAvailableToMint[tp]
                        status[ca].getRealTPAvailableToMint[tp] = status.PO[ca].calcRealTPAvailableToMintWithPrices[tp]
                        status[ca].PP_TP[tp] = [parsedPrices[ca].TP[tp], true]
                    }
                }
                status.canOperate = true
                status.pricesOffchain = true
            }
        } catch (err) {
            // Continue if it has an error
            console.log("Error getting off-chain API!")
            console.error(err)
        }
    }
    
    // const ctargemaCA = BigInt(status[0].getCtargemaCA);
    // const threshold = 1_000_000n * 10n ** 18n;

    // if (ctargemaCA > threshold) {
    //     status.canOperate = false;
    // }

    // // History Price (24hs ago)
    // let historic: Record<string, any> = {};
    // if (status.pricesOffchain) {
    //     // Price Get it from the API
    //     historic.blockHeight = status.blockHeight
    //     historic.PP_COINBASE = status.PP_COINBASE
    //     historic.PP_FeeToken = status[0].PP_FeeToken
    //     historic.canOperate = true

    //     for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
    //         (historic[ca] as any) = {};
    //         (historic[ca] as any).getPTCac = status[ca].getPTCac;
    //         (historic[ca] as any).PP_CA = status[ca].PP_CA;
    //         (historic[ca] as any).PP_TP = [];
    //         for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
    //             (historic[ca] as any).PP_TP[tp] = status[ca].PP_TP[tp];
    //         }
    //     }
    // } else {
    //     // No price off chain
    //     const d24BlockHeights = status.blockHeight - 0;
    //     const multiCallRequestHistory = new MultiCall3(publicClient)

    //     for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
    //         Moc = contracts.Moc[ca];
    //         PP_CA = contracts.PP_CA[ca];
    //         multiCallRequestHistory.aggregate(
    //             Moc,
    //             'getPTCac',
    //             [],
    //             "uint256",
    //             ca,
    //             "getPTCac"
    //         );
    //         multiCallRequestHistory.aggregate(
    //             PP_CA,
    //             'peek',
    //             [],
    //             [
    //                 {
    //                     "internalType": "bytes32",
    //                     "name": "",
    //                     "type": "bytes32"
    //                 },
    //                 {
    //                     "internalType": "bool",
    //                     "name": "",
    //                     "type": "bool"
    //                 }
    //             ],
    //             ca,
    //             "PP_CA"
    //         );
    //         for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
    //             PP_TP = contracts.PP_TP[ca][tp];
    //             multiCallRequestHistory.aggregate(
    //                 PP_TP,
    //                 'peek',
    //                 [],
    //                 [
    //                     {
    //                         "internalType": "bytes32",
    //                         "name": "",
    //                         "type": "bytes32"
    //                     },
    //                     {
    //                         "internalType": "bool",
    //                         "name": "",
    //                         "type": "bool"
    //                     }
    //                 ],
    //                 ca,
    //                 "PP_TP",
    //                 tp
    //             );
    //         }
    //     }
    //     multiCallRequestHistory.aggregate(
    //         contracts.PP_COINBASE,
    //         'peek',
    //         [],
    //         [
    //             {
    //                 "internalType": "bytes32",
    //                 "name": "",
    //                 "type": "bytes32"
    //             },
    //             {
    //                 "internalType": "bool",
    //                 "name": "",
    //                 "type": "bool"
    //             }
    //         ],
    //         "PP_COINBASE"
    //     );
    //     multiCallRequestHistory.aggregate(
    //         PP_FeeToken,
    //         'peek',
    //         [],
    //         [
    //             {
    //                 "internalType": "bytes32",
    //                 "name": "",
    //                 "type": "bytes32"
    //             },
    //             {
    //                 "internalType": "bool",
    //                 "name": "",
    //                 "type": "bool"
    //             }
    //         ],
    //         "PP_FeeToken"
    //     );

    //     const historic = await multiCallRequestHistory.fetch();
    //     console.log(`Reading contract status HISTORY: OK!. Block: ${historic.blockHeight}`);
    //     historic.blockHeight = d24BlockHeights;
    // }

    // status.canHistoric = historic.canOperate;
    // status.historic = historic;

    return status;
};
