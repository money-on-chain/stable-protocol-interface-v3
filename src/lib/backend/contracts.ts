import Multicall2 from "../../contracts/Multicall2.json";
import CollateralAsset from "../../contracts/CollateralAsset.json";
import TokenPegged from "../../contracts/TokenPegged.json";
import CollateralToken from "../../contracts/CollateralToken.json";
import IPriceProvider from "../../contracts/IPriceProvider.json";
import IDataProvider from "../../contracts/IDataProvider.json";
import MocMultiCollateralGuard from "../../contracts/MocMultiCollateralGuard.json";
import MocCACoinbase from "../../contracts/MocCACoinbase.json";
import MocCARC20 from "../../contracts/MocCARC20.json";
import MocVendors from "../../contracts/MocVendors.json";
import FeeToken from "../../contracts/FeeToken.json";
import MocQueue from "../../contracts/MocQueue.json";
import TokenMigrator from "../../contracts/TokenMigrator.json";

// OMOC
import IRegistry from "../../contracts/omoc/IRegistry.json";
import StakingMachine from "../../contracts/omoc/StakingMachine.json";
import DelayMachine from "../../contracts/omoc/DelayMachine.json";
import Supporters from "../../contracts/omoc/Supporters.json";
//import VestingMachine from "../../contracts/omoc/VestingMachine.json";
import VotingMachine from "../../contracts/omoc/VotingMachine.json";
import VestingFactory from "../../contracts/omoc/VestingFactory.json";
import IERC20 from "../../contracts/omoc/IERC20.json";
import IncentiveV2 from "../../contracts/omoc/IncentiveV2.json";

import { registryAddresses, mocAddresses } from "./multicall";
import settings from "../../settings/settings.json";
import Web3 from "web3";
import { readContract } from 'viem/actions'

// Type definitions for dContracts
interface DContracts {
    json: Record<string, any>;
    contracts: Record<string, any> & {
        multicall?: any;
        PP_CA?: any[];
        PP_COINBASE?: any;
        MocMultiCollateralGuard?: any;
        Moc?: any[];
        CA?: any[];
        CollateralToken?: any[];
        MocVendors?: any[];
        MocQueue?: any[];
        FeeToken?: any[];
        PP_FeeToken?: any[];
        FC_MAX_ABSOLUTE_OP_PROVIDER?: any[];
        FC_MAX_OP_DIFFERENCE_PROVIDER?: any[];
        PP_TP?: Record<number, Record<number, any>>;
        TP?: any[];
        IRegistry?: any;
        StakingMachine?: any;
        DelayMachine?: any;
        Supporters?: any;
        VestingFactory?: any;
        IncentiveV2?: any;
        VotingMachine?: any;
        TG?: any;
        tp_legacy?: any;
        token_migrator?: any;
    };
    contractsAddresses: Record<string, any>;
}

const readContracts = async (publicClient: PublicClient): Promise<DContracts> => {
    // Store contracts to later use
    const dContracts: DContracts = {
        json: {},
        contracts: {},
        contractsAddresses: {},
    };
        
    dContracts.contracts.Moc = []
    dContracts.contracts.CA = []
    dContracts.contracts.CollateralToken = []
    dContracts.contracts.MocVendors = []
    dContracts.contracts.MocQueue = []
    dContracts.contracts.FeeToken = []
    dContracts.contracts.PP_FeeToken = []
    dContracts.contracts.FC_MAX_ABSOLUTE_OP_PROVIDER = []
    dContracts.contracts.FC_MAX_OP_DIFFERENCE_PROVIDER = []
    let collateralMoCAbi = MocCARC20 as any;    
    let contractMoc: any;    
    let contractMocType: string; 
    let contractMocAddress: string;
    let contractDict: any;
        
    const tpAddresses: string[] = [];
    dContracts.contracts.PP_TP = {};

    const contracts = {
        MocMultiCollateralGuard: {},
        Moc: [],
        CA: [],
        CollateralToken: [],
        MocVendors: [],
        MocQueue: [],
        FeeToken: [],
        PP_FeeToken: [],
        PP_TP: [],
        FC_MAX_ABSOLUTE_OP_PROVIDER: [],
        FC_MAX_OP_DIFFERENCE_PROVIDER: [],
        TP: [],
        PP_CA: [],
        PP_COINBASE: {},
        VotingMachine: {},
        IRegistry: {},
        StakingMachine: {},
        DelayMachine: {},
        Supporters: {},
        VestingFactory: {},
        IncentiveV2: {},    
        TG: {},
    };
        
    const contractPPCA =
        import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_CA.split(",");
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        console.log(
            `Price Provider Pair ${settings.tokens.CA[ca].name} /USD Tokens Contract... address: `,
            contractPPCA[ca]
        );
        contractDict = {
            address: contractPPCA[ca],
            abi: IPriceProvider.abi,
            name: 'PP',
            type: ''
        }
        contracts.PP_CA.push(contractDict)
    }
       
    console.log(
        `Price Provider ${(settings.tokens.COINBASE as any).name} Contract... address: `,
        import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE
    );
    contractDict = {
        address: import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE,
        abi: IPriceProvider.abi,
        name: 'PP_COINBASE',
        type: ''
    }
    contracts.PP_COINBASE = contractDict
    
    
    console.log(
        "MocMultiCollateralGuard Contract... address: ",
        import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD
    );
    contractDict = {
        address: import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD,
        abi: MocMultiCollateralGuard.abi,
        name: 'MocMultiCollateralGuard',
        type: ''
    }
    contracts.MocMultiCollateralGuard = contractDict
    
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        // Get MoC Bucket address from multi-collateral guard
        //contractMocAddress = await dContracts.contracts.MocMultiCollateralGuard.methods.buckets(ca).call();

        contractMocAddress = await readContract(publicClient, {
            address: import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD,
            abi: MocMultiCollateralGuard.abi,
            functionName: 'buckets',
            args: [ca],
        }) as string;
        
        contractMocType = (settings.tokens.CA[ca] as any).type;
        if (contractMocType === "coinbase") collateralMoCAbi = MocCACoinbase as any;
        console.log('Moc Contract... address: ', contractMocAddress);

        contractMoc = {
            address: contractMocAddress,
            abi: collateralMoCAbi.abi,
            name: 'Moc',
            type: contractMocType
        }

        contracts.Moc.push(contractMoc)
                
        // Read contracts addresses from MoC
        const mocAddr = await mocAddresses(publicClient, contractMoc) as any;
        
        if (contractMocType !== 'coinbase') {
            if (!contracts.CA.includes(mocAddr['acToken'])) {
                console.log(
                    `${(settings.tokens.CA[ca] as any).name} Token Contract... address: `,
                    mocAddr['acToken']
                );
                
                contractDict = {
                    address: mocAddr['acToken'],
                    abi: CollateralAsset.abi,
                    name: 'CollateralAsset',
                    type: ''
                }
                contracts.CA.push(contractDict);
            }
        }

        let tpAddress: string;
        let tpIndex: any;
        let tpItem: any;
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
            tpAddress = mocAddr["tpTokens"][tp];
            if (!tpAddress || tpAddress === "0x") continue;
            // tpIndex = await contractMoc.methods
            //     .peggedTokenIndex(tpAddress)
            //     .call();

            tpIndex = await readContract(publicClient, {
                address: contractMoc.address,
                abi: collateralMoCAbi.abi,
                functionName: 'peggedTokenIndex',
                args: [tpAddress],
                })
        
            // tpIndex:  [ 1n, true ]
            if (!tpIndex) continue

            // tpItem:  [price, priceProvider]
            tpItem = await readContract(publicClient, {
                address: contractMoc.address,
                abi: collateralMoCAbi.abi,
                functionName: 'pegContainer',
                args: [tpIndex[0]],
                })

            if (!tpAddresses.includes(tpAddress)) {
                tpAddresses.push(tpAddress);
                //tpAddressesProviders.push(tpItem.priceProvider);
            }

            console.log(
                `Reading Price Provider Pair ${(settings.tokens.TP[tp] as any).name}/${(settings.tokens.CA[ca] as any).name} Contract... address: `,
                tpItem[1]
            );
            if (!contracts.PP_TP[ca]) contracts.PP_TP[ca] = [];

            contractDict = {
                address: tpItem[1],
                abi: IPriceProvider.abi,
                name: 'PP',
                type: ''
            }
            contracts.PP_TP[ca].push(contractDict)
            
        }

        console.log(
            "Collateral Token Contract... address: ",
            mocAddr["tcToken"]
        );
        contractDict = {
            address: mocAddr["tcToken"],
            abi: CollateralToken.abi,
            name: 'CollateralToken',
            type: ''
        }
        contracts.CollateralToken.push(contractDict)

        console.log(
            "Moc Vendors Contract... address: ",
            mocAddr["mocVendors"]
        );
        contractDict = {
            address: mocAddr["mocVendors"],
            abi: MocVendors.abi,
            name: 'MocVendors',
            type: ''
        }
        contracts.MocVendors.push(contractDict)

        console.log("MocQueue Contract... address: ", mocAddr["mocQueue"]);
        contractDict = {
            address: mocAddr["mocQueue"],
            abi: MocQueue.abi,
            name: 'MocQueue',
            type: ''
        }
        contracts.MocQueue.push(contractDict)

        console.log("FeeToken Contract... address: ", mocAddr["feeToken"]);
        contractDict = {
            address: mocAddr["feeToken"],
            abi: FeeToken.abi,
            name: 'FeeToken',
            type: ''
        }
        contracts.FeeToken.push(contractDict)

        console.log(
            "Fee Token PP Contract... address: ",
            mocAddr["feeTokenPriceProvider"]
        );
        contractDict = {
            address: mocAddr["feeTokenPriceProvider"],
            abi: IPriceProvider.abi,
            name: 'PP',
            type: ''
        }
        contracts.PP_FeeToken.push(contractDict)

        console.log(
            "FC_MAX_ABSOLUTE_OP_PROVIDER Contract... address: ",
            mocAddr["maxAbsoluteOpProvider"]
        );
        contractDict = {
            address: mocAddr["maxAbsoluteOpProvider"],
            abi: IPriceProvider.abi,
            name: 'FC_MAX_ABSOLUTE_OP_PROVIDER',
            type: ''
        }
        contracts.FC_MAX_ABSOLUTE_OP_PROVIDER.push(contractDict)

        console.log(
            "FC_MAX_OP_DIFFERENCE_PROVIDER Contract... address: ",
            mocAddr["maxOpDiffProvider"]
        );
        contractDict = {
            address: mocAddr["maxOpDiffProvider"],
            abi: IPriceProvider.abi,
            name: 'FC_MAX_OP_DIFFERENCE_PROVIDER',
            type: ''
        }
        contracts.FC_MAX_OP_DIFFERENCE_PROVIDER.push(contractDict)
    }
    
    for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
        console.log(
            `${settings.tokens.TP[tp].name} Token Contract... address: `,
            tpAddresses[tp]
        );
        contractDict = {
            address: tpAddresses[tp],
            abi: TokenPegged.abi,
            name: 'TP',
            type: ''
        }
        contracts.TP.push(contractDict)
    }

    
    if (typeof import.meta.env.REACT_APP_CONTRACT_IREGISTRY !== "undefined") {
        console.log(
            "IRegistry Contract... address: ",
            import.meta.env.REACT_APP_CONTRACT_IREGISTRY
        );
        contractDict = {
            address: import.meta.env.REACT_APP_CONTRACT_IREGISTRY,
            abi: IRegistry.abi,
            name: 'IRegistry',
            type: ''
        }
        contracts.IRegistry = contractDict

        // Read contracts addresses from registry
        const registryAddr = await registryAddresses(publicClient, contractDict) as any;
        
        console.log(
            "StakingMachine Contract... address: ",
            registryAddr["MOC_STAKING_MACHINE"]
        );
        contractDict = {
            address: registryAddr["MOC_STAKING_MACHINE"],
            abi: StakingMachine.abi,
            name: 'StakingMachine',
            type: ''
        }
        contracts.StakingMachine = contractDict

        console.log(
            "Delay Machine Contract... address: ",
            registryAddr["MOC_DELAY_MACHINE"]
        );
        contractDict = {
            address: registryAddr["MOC_DELAY_MACHINE"],
            abi: DelayMachine.abi,
            name: 'DelayMachine',
            type: ''
        }
        contracts.DelayMachine = contractDict

        console.log(
            "Supporters Contract... address: ",
            registryAddr["SUPPORTERS_ADDR"]
        );
        contractDict = {
            address: registryAddr["SUPPORTERS_ADDR"],
            abi: Supporters.abi,
            name: 'Supporters',
            type: ''
        }
        contracts.Supporters = contractDict

        console.log(
            "Vesting Factory Contract... address: ",
            registryAddr["MOC_VESTING_MACHINE"]
        );
        contractDict = {
            address: registryAddr["MOC_VESTING_MACHINE"],
            abi: VestingFactory.abi,
            name: 'VestingFactory',
            type: ''
        }
        contracts.VestingFactory = contractDict

        // reading Incentive V2 from environment address
        if (
            typeof import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2 !==
            "undefined"
        ) {
            console.log(
                "Incentive V2 Contract... address: ",
                import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2
            );
            contractDict = {
                address: import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2,
                abi: IncentiveV2.abi,
                name: 'IncentiveV2',
                type: ''
            }
            contracts.IncentiveV2 = contractDict
        }

        console.log(
            "Voting Machine Contract... address: ",
            registryAddr["MOC_VOTING_MACHINE"]
        );
        contractDict = {
            address: registryAddr["MOC_VOTING_MACHINE"],
            abi: VotingMachine.abi,
            name: 'VotingMachine',
            type: ''
        }
        contracts.VotingMachine = contractDict

        console.log(
            "Token Govern Contract... address: ",
            registryAddr["MOC_TOKEN"]
        );
        contractDict = {
            address: registryAddr["MOC_TOKEN"],
            abi: IERC20.abi,
            name: 'TG',
            type: ''
        }
        contracts.TG = contractDict
    }

    // // Token migrator & Legacy token
    // let tpLegacy
    // let tokenMigrator
    // if (import.meta.env.REACT_APP_CONTRACT_LEGACY_TP) {
    //     tpLegacy = new web3.eth.Contract(
    //         TokenPegged.abi,
    //         import.meta.env.REACT_APP_CONTRACT_LEGACY_TP
    //     );
    //     dContracts.contracts.tp_legacy = tpLegacy;

    //     if (!import.meta.env.REACT_APP_CONTRACT_TOKEN_MIGRATOR)
    //         console.log("Error: Please set token migrator address!");

    //     tokenMigrator = new web3.eth.Contract(
    //         TokenMigrator.abi,
    //         import.meta.env.REACT_APP_CONTRACT_TOKEN_MIGRATOR
    //     );
    //     dContracts.contracts.token_migrator = tokenMigrator;
    // }

    return contracts;
};

export { readContracts };
