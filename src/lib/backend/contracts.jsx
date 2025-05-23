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


const readContracts = async (web3) => {
    // Store contracts to later use
    const dContracts = {};
    dContracts.json = {};
    dContracts.contracts = {};
    dContracts.contractsAddresses = {};

    console.log(
        "Reading Multicall2 Contract... address: ",
        import.meta.env.REACT_APP_CONTRACT_MULTICALL2
    );
    dContracts.contracts.multicall = new web3.eth.Contract(
        Multicall2.abi,
        import.meta.env.REACT_APP_CONTRACT_MULTICALL2
    );

    dContracts.contracts.PP_CA = [];
    const contractPPCA =
        import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_CA.split(",");
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        console.log(
            `Reading Price Provider Pair ${settings.tokens.CA[ca].name} /USD Tokens Contract... address: `,
            contractPPCA[ca]
        );
        dContracts.contracts.PP_CA.push(
            new web3.eth.Contract(IPriceProvider.abi, contractPPCA[ca])
        );
    }

    console.log(
        `Reading Price Provider ${settings.tokens.COINBASE.name} Contract... address: `,
        import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE
    );
    dContracts.contracts.PP_COINBASE = new web3.eth.Contract(
        IPriceProvider.abi,
        import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE
    );

    console.log(
        "Reading MocMultiCollateralGuard Contract... address: ",
        import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD
    );
    dContracts.contracts.MocMultiCollateralGuard = new web3.eth.Contract(
        MocMultiCollateralGuard.abi,
        import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD
    );

    dContracts.contracts.Moc = []
    dContracts.contracts.CA = []
    dContracts.contracts.CollateralToken = []
    dContracts.contracts.MocVendors = []
    dContracts.contracts.MocQueue = []
    dContracts.contracts.FeeToken = []
    dContracts.contracts.PP_FeeToken = []
    dContracts.contracts.FC_MAX_ABSOLUTE_OP_PROVIDER = []
    dContracts.contracts.FC_MAX_OP_DIFFERENCE_PROVIDER = []
    let collateralMoCAbi = MocCARC20
    let contractMocAddress;
    let contractMoc
    let contractMocType
    let contractCA = []
    const tpAddresses = [];
    dContracts.contracts.PP_TP = {}

    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {

        // Get MoC Bucket address from multi-collateral guard
        contractMocAddress = await dContracts.contracts.MocMultiCollateralGuard.methods.buckets(ca).call()
        contractMocType = settings.tokens.CA[ca].type
        if (contractMocType === "coinbase") collateralMoCAbi = MocCACoinbase
        console.log('Reading Moc Contract... address: ', contractMocAddress)

        contractMoc = new web3.eth.Contract(
            collateralMoCAbi.abi,
            contractMocAddress
        );

        dContracts.contracts.Moc.push(contractMoc)

        // Read contracts addresses from MoC
        const mocAddr = await mocAddresses(web3, dContracts, contractMoc, contractMocType);

        if (contractMocType !== 'coinbase') {
            if (!contractCA.includes(mocAddr['acToken'])) {
                console.log(
                    `Reading ${settings.tokens.CA[ca].name} Token Contract... address: `,
                    mocAddr['acToken']
                );
                dContracts.contracts.CA.push(
                    new web3.eth.Contract(CollateralAsset.abi, mocAddr['acToken'])
                );
                contractCA.push(mocAddr['acToken'])
            }
        }

        let tpAddress;
        let tpIndex;
        let tpItem;
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
            tpAddress = mocAddr["tpTokens"][tp];
            if (!tpAddress || tpAddress === "0x") continue;
            tpIndex = await contractMoc.methods
                .peggedTokenIndex(tpAddress)
                .call();
            if (!tpIndex.exists) continue;
            tpItem = await contractMoc.methods
                .pegContainer(tpIndex.index)
                .call();

            if (!tpAddresses.includes(tpAddress)) {
                tpAddresses.push(tpAddress);
                //tpAddressesProviders.push(tpItem.priceProvider);
            }

            console.log(
                `Reading Price Provider Pair ${settings.tokens.TP[tp].name}/${settings.tokens.CA[ca].name} Contract... address: `,
                tpItem.priceProvider
            );
            if (!dContracts.contracts.PP_TP[ca]) dContracts.contracts.PP_TP[ca] = {}
            dContracts.contracts.PP_TP[ca][tp] = new web3.eth.Contract(IPriceProvider.abi, tpItem.priceProvider);

        }

        console.log(
            "Reading Collateral Token Contract... address: ",
            mocAddr["tcToken"]
        );
        dContracts.contracts.CollateralToken.push(new web3.eth.Contract(
            CollateralToken.abi,
            mocAddr["tcToken"]
        ));

        console.log(
            "Reading Moc Vendors Contract... address: ",
            mocAddr["mocVendors"]
        );
        dContracts.contracts.MocVendors.push(new web3.eth.Contract(
            MocVendors.abi,
            mocAddr["mocVendors"]
        ));

        console.log("Reading MocQueue Contract... address: ", mocAddr["mocQueue"]);
        dContracts.contracts.MocQueue.push(new web3.eth.Contract(
            MocQueue.abi,
            mocAddr["mocQueue"]
        ));

        console.log("Reading FeeToken Contract... address: ", mocAddr["feeToken"]);
        dContracts.contracts.FeeToken.push(new web3.eth.Contract(
            FeeToken.abi,
            mocAddr["feeToken"]
        ));

        console.log(
            "Reading Fee Token PP Contract... address: ",
            mocAddr["feeTokenPriceProvider"]
        );
        dContracts.contracts.PP_FeeToken.push(new web3.eth.Contract(
            IPriceProvider.abi,
            mocAddr["feeTokenPriceProvider"]
        ));

        console.log(
            "Reading FC_MAX_ABSOLUTE_OP_PROVIDER Contract... address: ",
            mocAddr["maxAbsoluteOpProvider"]
        );
        dContracts.contracts.FC_MAX_ABSOLUTE_OP_PROVIDER.push(new web3.eth.Contract(
            IPriceProvider.abi,
            mocAddr["maxAbsoluteOpProvider"]
        ));

        console.log(
            "Reading FC_MAX_OP_DIFFERENCE_PROVIDER Contract... address: ",
            mocAddr["maxOpDiffProvider"]
        );
        dContracts.contracts.FC_MAX_OP_DIFFERENCE_PROVIDER.push(new web3.eth.Contract(
            IPriceProvider.abi,
            mocAddr["maxOpDiffProvider"]
        ));

    }

    dContracts.contracts.TP = [];
    for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
        console.log(
            `Reading ${settings.tokens.TP[tp].name} Token Contract... address: `,
            tpAddresses[tp]
        );
        dContracts.contracts.TP.push(
            new web3.eth.Contract(TokenPegged.abi, tpAddresses[tp])
        );
    }

    /*
    dContracts.contracts.PP_TP = [];
    for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
        console.log(
            `Reading Price Provider ${settings.tokens.TP[tp].name} Contract... address: `,
            tpAddressesProviders[tp]
        );
        dContracts.contracts.PP_TP.push(
            new web3.eth.Contract(IPriceProvider.abi, tpAddressesProviders[tp])
        );
    }*/


    if (typeof import.meta.env.REACT_APP_CONTRACT_IREGISTRY !== "undefined") {
        console.log(
            "Reading IRegistry Contract... address: ",
            import.meta.env.REACT_APP_CONTRACT_IREGISTRY
        );
        dContracts.contracts.IRegistry = new web3.eth.Contract(
            IRegistry.abi,
            import.meta.env.REACT_APP_CONTRACT_IREGISTRY
        );

        // Read contracts addresses from registry
        const registryAddr = await registryAddresses(web3, dContracts);

        console.log(
            "Reading StakingMachine Contract... address: ",
            registryAddr["MOC_STAKING_MACHINE"]
        );
        dContracts.contracts.StakingMachine = new web3.eth.Contract(
            StakingMachine.abi,
            registryAddr["MOC_STAKING_MACHINE"]
        );

        console.log(
            "Reading Delay Machine Contract... address: ",
            registryAddr["MOC_DELAY_MACHINE"]
        );
        dContracts.contracts.DelayMachine = new web3.eth.Contract(
            DelayMachine.abi,
            registryAddr["MOC_DELAY_MACHINE"]
        );

        console.log(
            "Reading Supporters Contract... address: ",
            registryAddr["SUPPORTERS_ADDR"]
        );
        dContracts.contracts.Supporters = new web3.eth.Contract(
            Supporters.abi,
            registryAddr["SUPPORTERS_ADDR"]
        );

        console.log(
            "Reading Vesting Factory Contract... address: ",
            registryAddr["MOC_VESTING_MACHINE"]
        );
        dContracts.contracts.VestingFactory = new web3.eth.Contract(
            VestingFactory.abi,
            registryAddr["MOC_VESTING_MACHINE"]
        );

        // reading Incentive V2 from environment address
        if (
            typeof import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2 !==
            "undefined"
        ) {
            console.log(
                "Reading Incentive V2 Contract... address: ",
                import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2
            );
            dContracts.contracts.IncentiveV2 = new web3.eth.Contract(
                IncentiveV2.abi,
                import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2
            );
        }

        console.log(
            "Reading Voting Machine Contract... address: ",
            registryAddr["MOC_VOTING_MACHINE"]
        );
        dContracts.contracts.VotingMachine = new web3.eth.Contract(
            VotingMachine.abi,
            registryAddr["MOC_VOTING_MACHINE"]
        );

        console.log(
            "Reading Token Govern Contract... address: ",
            registryAddr["MOC_TOKEN"]
        );
        dContracts.contracts.TG = new web3.eth.Contract(
            IERC20.abi,
            registryAddr["MOC_TOKEN"]
        );
    }

    // Token migrator & Legacy token
    let tpLegacy
    let tokenMigrator
    if (import.meta.env.REACT_APP_CONTRACT_LEGACY_TP) {
        tpLegacy = new web3.eth.Contract(
            TokenPegged.abi,
            import.meta.env.REACT_APP_CONTRACT_LEGACY_TP
        );
        dContracts.contracts.tp_legacy = tpLegacy;

        if (!import.meta.env.REACT_APP_CONTRACT_TOKEN_MIGRATOR)
            console.log("Error: Please set token migrator address!");

        tokenMigrator = new web3.eth.Contract(
            TokenMigrator.abi,
            import.meta.env.REACT_APP_CONTRACT_TOKEN_MIGRATOR
        );
        dContracts.contracts.token_migrator = tokenMigrator;
    }

    return dContracts;
};

export { readContracts };
