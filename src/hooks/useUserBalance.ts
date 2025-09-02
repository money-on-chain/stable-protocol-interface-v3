import { useMemo } from 'react'
import { useMultiCall } from "./useMulticall";
import settings from "../settings/settings.json";

/**
 * React hook that wraps useMultiCall3 to fetch contract status data.
 * Builds the call array with useMemo so it remains stable between renders.
 */
export function useUserBalance(contracts?: any, userAddress?: string, refetchInterval = 30_000) {
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
                keys: [ca, "TC", "balance"]
            })

            callRequest.push({
                contract: CollateralToken,
                functionName: 'allowance',
                args: [userAddress, Moc.address],
                resultType: "uint256",
                keys: [ca, "TC", "allowance"]
            })

            callRequest.push({
                contract: FeeToken,
                functionName: 'balanceOf',
                args: [userAddress],
                resultType: "uint256",
                keys: [ca, "FeeToken", "balance"]
            });


            callRequest.push({
                contract: FeeToken,
                functionName: 'allowance',
                args: [userAddress, Moc.address],
                resultType: "uint256",
                keys: [ca, "FeeToken", "allowance"]
            });
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
                    keys: ["TP", ca,  tp, "balance"]
                });

                callRequest.push({
                    contract: TP,
                    functionName: 'allowance',
                    args: [userAddress, Moc.address],
                    resultType: "uint256",
                    keys: ["TP", ca,  tp, "allowance"]
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
                    keys: ["CA", ca, "balance"]
                });

                callRequest.push({
                    contract: CA,
                    functionName: 'allowance',
                    args: [userAddress, Moc.address],
                    resultType: "uint256",
                    keys: ["CA", ca, "allowance"]
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
                keys: ["tpLegacy", "balance"]
            });

            callRequest.push({
                contract: tpLegacy,
                functionName: 'allowance',
                args: [userAddress, tokenMigrator.address],
                resultType: "uint256",
                keys: ["tpLegacy", "allowance"]
            });
            
        }
        if(import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "voting") {
            callRequest.push({
                contract: contracts.CollateralToken[0],
                functionName: 'balanceOf',
                args: [userAddress],
                resultType: "uint256",
                keys: [0, "TC", "balance"]
            })
        }

        return callRequest

    }, [contracts, userAddress])

      
    // Pass callsRequests into your multicall hook (safe: it's a hook calling a hook)
    const multicallState = useMultiCall(callsRequests, {
      refetchInterval: refetchInterval,
      enabled: callsRequests.length > 0,
      scopeKey: ['userBalance', userAddress].join(':')  
    })
  
    return multicallState
  }
