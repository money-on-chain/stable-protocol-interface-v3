// Discovery flow for the legacy v1 MoC contracts (main-RBTC-contract).
// Connector-based discovery, single collateral bucket — no caIndex, no MocQueue.
// Called imperatively (not a React hook) from WalletV1Provider, same pattern as
// `readContracts` in useReadContracts.ts.
import type { PublicClient } from "viem";
import { readContract } from "viem/actions";

import { runMulticallSync } from "../backend/runMulticallSync";
import { MOC_V1_ADDRESS } from "../constants/v1";
import BProToken from "../contracts/v1/BProToken.json";
import DocToken from "../contracts/v1/DocToken.json";
import MoC from "../contracts/v1/MoC.json";
import MoCConnector from "../contracts/v1/MoCConnector.json";
import MoCInrate from "../contracts/v1/MoCInrate.json";
import MoCState from "../contracts/v1/MoCState.json";
import MoCToken from "../contracts/v1/MoCToken.json";
import MoCVendors from "../contracts/v1/MoCVendors.json";
import type { Address, ContractInfo, SyncMulticallInput } from "../types/hooks";
import type { DContractsV1 } from "../types/hooks-v1";

const ABI_MoC = MoC.abi as readonly unknown[];
const ABI_MoCConnector = MoCConnector.abi as readonly unknown[];
const ABI_MoCState = MoCState.abi as readonly unknown[];
const ABI_MoCInrate = MoCInrate.abi as readonly unknown[];
const ABI_MoCVendors = MoCVendors.abi as readonly unknown[];
const ABI_BProToken = BProToken.abi as readonly unknown[];
const ABI_DocToken = DocToken.abi as readonly unknown[];
const ABI_MoCToken = MoCToken.abi as readonly unknown[];

export const readContractsV1 = async (
    publicClient: PublicClient
): Promise<DContractsV1> => {
    if (!MOC_V1_ADDRESS) {
        throw new Error("Please set REACT_APP_CONTRACT_MOC_V1 env var");
    }

    const moc: ContractInfo = {
        address: MOC_V1_ADDRESS,
        abi: ABI_MoC,
        name: "Moc",
        type: "",
    };

    const connectorAddress = (await readContract(publicClient, {
        address: moc.address,
        abi: ABI_MoC,
        functionName: "connector",
        args: [],
    })) as Address;

    const connector: ContractInfo = {
        address: connectorAddress,
        abi: ABI_MoCConnector,
        name: "MoCConnector",
        type: "",
    };

    // MoCConnector public getters: docToken, bproToken, bproxManager, mocState,
    // mocSettlement, mocExchange, mocInrate. Only the ones the frontend actually
    // needs are read here — mocExchange/mocSettlement are never called directly
    // by the frontend (mint/redeem entry points live on MoC.sol itself, which
    // calls MoCExchange internally; settlement queue is out of scope for v1).
    const connectorResult = await runMulticallSync(publicClient, [
        {
            contract: connector,
            functionName: "docToken",
            args: [],
            resultType: "address",
            keys: ["docToken"],
        },
        {
            contract: connector,
            functionName: "bproToken",
            args: [],
            resultType: "address",
            keys: ["bproToken"],
        },
        {
            contract: connector,
            functionName: "mocState",
            args: [],
            resultType: "address",
            keys: ["mocState"],
        },
        {
            contract: connector,
            functionName: "mocInrate",
            args: [],
            resultType: "address",
            keys: ["mocInrate"],
        },
    ] as SyncMulticallInput[]);

    const docTokenAddress = connectorResult.data?.docToken as Address;
    const bproTokenAddress = connectorResult.data?.bproToken as Address;
    const mocStateAddress = connectorResult.data?.mocState as Address;
    const mocInrateAddress = connectorResult.data?.mocInrate as Address;

    const mocState: ContractInfo = {
        address: mocStateAddress,
        abi: ABI_MoCState,
        name: "MoCState",
        type: "",
    };

    // MoCVendors is NOT exposed by the connector — it's read from
    // MoCState.getMoCVendors() (correction from the original draft plan, which
    // assumed it came from the connector multicall).
    const mocStateResult = await runMulticallSync(publicClient, [
        {
            contract: mocState,
            functionName: "getMoCVendors",
            args: [],
            resultType: "address",
            keys: ["mocVendors"],
        },
        {
            contract: mocState,
            functionName: "getMoCToken",
            args: [],
            resultType: "address",
            keys: ["mocToken"],
        },
    ] as SyncMulticallInput[]);

    const mocVendorsAddress = mocStateResult.data?.mocVendors as Address;
    const mocTokenAddress = mocStateResult.data?.mocToken as Address;

    return {
        Moc: moc,
        MoCState: mocState,
        MoCInrate: {
            address: mocInrateAddress,
            abi: ABI_MoCInrate,
            name: "MoCInrate",
            type: "",
        },
        MoCVendors: {
            address: mocVendorsAddress,
            abi: ABI_MoCVendors,
            name: "MoCVendors",
            type: "",
        },
        BProToken: {
            address: bproTokenAddress,
            abi: ABI_BProToken,
            name: "BProToken",
            type: "",
        },
        DocToken: {
            address: docTokenAddress,
            abi: ABI_DocToken,
            name: "DocToken",
            type: "",
        },
        MoCToken: {
            address: mocTokenAddress,
            abi: ABI_MoCToken,
            name: "MoCToken",
            type: "",
        },
    };
};
