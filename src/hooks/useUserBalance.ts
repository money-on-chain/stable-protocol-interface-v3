import { useMemo } from 'react'
import { useMultiCall } from "./useMultiCall";
import settings from "../settings/settings.json";


/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useUserBalance(contracts?: any, userAddress?: string) {
    const callsRequests = useMemo(() => {
        if (!contracts) return []
        if (!userAddress) return []
                
        const callRequest = []        
        
        let Moc
        let CollateralToken
        let FeeToken
        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            Moc = contracts.Moc[ca]
            CollateralToken = contracts.CollateralToken[ca]
            FeeToken = contracts.FeeToken[ca]

            callRequest.push({
                contract: CollateralToken,
                functionName: 'balanceOf',
                args: [userAddress],
                resultType: "uint256",
                keyName: ca,
                keyIndex: "TC",
                keySubIndex: "balance"
            })

            callRequest.push({
                contract: CollateralToken,
                functionName: 'allowance',
                args: [userAddress, Moc.address],
                resultType: "uint256",
                keyName: ca,
                keyIndex: "TC",
                keySubIndex: "allowance"
            })

            callRequest.push({
                contract: FeeToken,
                functionName: 'balanceOf',
                args: [userAddress],
                resultType: "uint256",
                keyName: ca,
                keyIndex: "FeeToken",
                keySubIndex: "balance"
            });


            callRequest.push({
                contract: FeeToken,
                functionName: 'allowance',
                args: [userAddress, Moc.address],
                resultType: "uint256",
                keyName: ca,
                keyIndex: "FeeToken",
                keySubIndex: "allowance"
            });
        }

        if (typeof contracts.stakingmachine !== "undefined") {
            // OMOC

            callRequest.push({
                contract: contracts.stakingmachine,
                functionName: 'getBalance',
                args: [userAddress],
                resultType: "uint256",
                keyName: "stakingmachine",
                keyIndex: "getBalance"                
            });

            callRequest.push({
                contract: contracts.stakingmachine,
                functionName: 'getLockedBalance',
                args: [userAddress],
                resultType: "uint256",
                keyName: "stakingmachine",
                keyIndex: "getLockedBalance"
            });
            

            callRequest.push({
                contract: contracts.stakingmachine,
                functionName: 'getLockingInfo',
                args: [userAddress],
                resultType: [
                    { type: "uint256", name: "amount" },
                    { type: "uint256", name: "untilTimestamp" },
                ],
                keyName: "stakingmachine",
                keyIndex: "getLockingInfo"
            });

            callRequest.push({
                contract: contracts.delaymachine,
                functionName: 'getTransactions',
                args: [userAddress],
                resultType: [
                    { type: "uint256[]", name: "ids" },
                    { type: "uint256[]", name: "amounts" },
                    { type: "uint256[]", name: "expirations" },
                ],
                keyName: "delaymachine",
                keyIndex: "getTransactions"
            });

            callRequest.push({
                contract: contracts.delaymachine,
                functionName: 'getBalance',
                args: [userAddress],
                resultType: "uint256",
                keyName: "delaymachine",
                keyIndex: "getBalance"
            });
            
            callRequest.push({
                contract: contracts.tg,
                functionName: 'getBalance',
                args: [userAddress],
                resultType: "uint256",
                keyName: "TG",
                keyIndex: "balance"
            });

            callRequest.push({
                contract: contracts.tg,
                functionName: 'allowance',
                args: [userAddress, contracts.stakingmachine.address],
                resultType: "uint256",
                keyName: "stakingmachine",
                keyIndex: "tgAllowance"
            });

            callRequest.push({
                contract: contracts.votingmachine,
                functionName: 'getUserVote',
                args: [userAddress],
                resultType: [
                    { type: "address", name: "voteAddress" },
                    { type: "uint256", name: "voteRound" },
                ],
                keyName: "votingmachine",
                keyIndex: "getUserVote"
            });

                
            if (typeof contracts.vestingmachine !== "undefined") {

                callRequest.push({
                    contract: contracts.vestingfactory,
                    functionName: 'isTGEConfigured',
                    args: [],
                    resultType: "bool",
                    keyName: "vestingfactory",
                    keyIndex: "isTGEConfigured"
                });

                callRequest.push({
                    contract: contracts.vestingfactory,
                    functionName: 'getTGETimestamp',
                    args: [],
                    resultType: "uint256",
                    keyName: "vestingfactory",
                    keyIndex: "getTGETimestamp"
                });
                
                callRequest.push({
                    contract: contracts.vestingmachine,
                    functionName: 'getParameters',
                    args: [],
                    resultType: [
                        { type: "uint256[]", name: "percentages" },
                        { type: "uint256[]", name: "timeDeltas" },
                    ],
                    keyName: "vestingmachine",
                    keyIndex: "getParameters"
                });
                
                
                callRequest.push({
                    contract: contracts.vestingmachine,
                    functionName: 'getHolder',
                    args: [],
                    resultType: "address",
                    keyName: "vestingmachine",
                    keyIndex: "getHolder"
                });
                
                callRequest.push({
                    contract: contracts.vestingmachine,
                    functionName: 'getLocked',
                    args: [],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "getLocked"
                });

                callRequest.push({
                    contract: contracts.vestingmachine,
                    functionName: 'getAvailable',
                    args: [],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "getAvailable"
                });
                
                callRequest.push({
                    contract: contracts.vestingmachine,
                    functionName: 'isVerified',
                    args: [],
                    resultType: "bool",
                    keyName: "vestingmachine",
                    keyIndex: "isVerified"
                });
                
                callRequest.push({
                    contract: contracts.vestingmachine,
                    functionName: 'getTotal',
                    args: [],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "getTotal"
                });
                
                callRequest.push({
                    contract: contracts.tg,
                    functionName: 'balanceOf',
                    args: [contracts.vestingmachine.address],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "tgBalance"
                });

                callRequest.push({
                    contract: contracts.tg,
                    functionName: 'allowance',
                    args: [userAddress, contracts.vestingmachine.address],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "tgAllowance"
                });
                
                callRequest.push({
                    contract: contracts.stakingmachine,
                    functionName: 'getBalance',
                    args: [contracts.vestingmachine.address],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "staking",
                    keySubIndex: "balance"
                });
                callRequest.push({
                    contract: contracts.tg,
                    functionName: 'allowance',
                    args: [contracts.vestingmachine.address, contracts.stakingmachine.address],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "staking",
                    keySubIndex: "allowance"
                });

                callRequest.push({
                    contract: contracts.delaymachine, 
                    functionName: 'getBalance', 
                    args: [contracts.vestingmachine.address], 
                    resultType: "uint256", 
                    keyName: "vestingmachine", 
                    keyIndex: "delay", 
                    keySubIndex: "balance"
                })
                


                callRequest.push({
                    contract: contracts.tg,
                    functionName: 'allowance',
                    args: [contracts.vestingmachine.address, contracts.delaymachine.address],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "delay",
                    keySubIndex: "allowance"
                });
                
                callRequest.push({
                    contract: contracts.stakingmachine,
                    functionName: 'getBalance',
                    args: [contracts.vestingmachine.address],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "staking",
                    keySubIndex: "getBalance"
                });

                callRequest.push({
                    contract: contracts.stakingmachine,
                    functionName: 'getLockedBalance',
                    args: [contracts.vestingmachine.address],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "staking",
                    keySubIndex: "getLockedBalance"
                });

                callRequest.push({
                    contract: contracts.stakingmachine,
                    functionName: 'getLockingInfo',
                    args: [contracts.vestingmachine.address],
                    resultType: [
                        { type: "uint256", name: "amount" },
                        { type: "uint256", name: "untilTimestamp" },
                    ],
                    keyName: "vestingmachine",
                    keyIndex: "staking",
                    keySubIndex: "getLockingInfo"
                });

                callRequest.push({
                    contract: contracts.delaymachine,
                    functionName: 'getTransactions',
                    args: [contracts.vestingmachine.address],
                    resultType: [
                        { type: "uint256[]", name: "ids" },
                        { type: "uint256[]", name: "amounts" },
                        { type: "uint256[]", name: "expirations" },
                    ],
                    keyName: "vestingmachine",
                    keyIndex: "delay",
                    keySubIndex: "getTransactions"
                });

                callRequest.push({
                    contract: contracts.delaymachine,
                    functionName: 'getBalance',
                    args: [contracts.vestingmachine.address],
                    resultType: "uint256",
                    keyName: "vestingmachine",
                    keyIndex: "delay",
                    keySubIndex: "getBalance"
                });
                
            }
    
            // Incentive V2
            if (typeof contracts.IncentiveV2 !== "undefined") {

                callRequest.push({
                    contract: contracts.tg,
                    functionName: 'balanceOf',
                    args: [contracts.IncentiveV2.address],
                    resultType: "uint256",
                    keyName: "incentiveV2",
                    keyIndex: "contractBalance"
                });

                callRequest.push({
                    contract: contracts.IncentiveV2,
                    functionName: 'get_balance',
                    args: [userAddress],
                    resultType: "uint256",
                    keyName: "incentiveV2",
                    keyIndex: "userBalance"
                });
                
            }
        }

        let TP;
        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
                TP = contracts.TP[tp];
                Moc = contracts.Moc[ca]

                callRequest.push({
                    contract: TP,
                    functionName: 'balanceOf',
                    args: [userAddress],
                    resultType: "uint256",
                    keyName: ca,
                    keyIndex: "TP_balance",
                    keySubIndex: tp,
                });

                callRequest.push({
                    contract: TP,
                    functionName: 'allowance',
                    args: [userAddress, Moc.address],
                    resultType: "uint256",
                    keyName: ca,
                    keyIndex: "TP_allowance",
                    keySubIndex: tp,
                });                
                
            }
        }

        let CA;
        let contractMocType
        let countRC20 = 0

        for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
            // RC-20 collateral Only
            contractMocType = (settings.tokens.CA[ca] as CAToken).type
            if (contractMocType !== 'coinbase')  {
                Moc = contracts.Moc[ca];
                CA = contracts.CA[countRC20];


                callRequest.push({
                    contract: CA,
                    functionName: 'balanceOf',
                    args: [userAddress],
                    resultType: "uint256",
                    keyName: ca,
                    keyIndex: "CA_balance"
                });

                callRequest.push({
                    contract: CA,
                    functionName: 'allowance',
                    args: [userAddress, Moc.address],
                    resultType: "uint256",
                    keyName: ca,
                    keyIndex: "CA_allowance"
                });
                
                countRC20++
            }
        }

        // Token migrator
        if (contracts.tp_legacy) {
            const tpLegacy = contracts.tp_legacy;
            const tokenMigrator = contracts.token_migrator;


            callRequest.push({
                contract: tpLegacy,
                functionName: 'balanceOf',
                args: [userAddress],
                resultType: "uint256",
                keyName: "tpLegacy",
                keyIndex: "balance"
            });

            callRequest.push({
                contract: tpLegacy,
                functionName: 'allowance',
                args: [userAddress, tokenMigrator.address],
                resultType: "uint256",
                keyName: "tpLegacy",
                keyIndex: "allowance"
            });
            
        }

        

        return callRequest

    }, [contracts])

      
    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
      refetchInterval: 30_000,
      enabled: callsRequests.length > 0,
    })
  
    return multicallState
  }
