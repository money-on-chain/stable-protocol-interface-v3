// src/hooks/userReadContracts.ts
import type { PublicClient } from "viem";
import { readContract } from "viem/actions";

import { runMulticallSync } from "../backend/runMulticallSync";
import CollateralAsset from "../contracts/CollateralAsset.json";
import CollateralToken from "../contracts/CollateralToken.json";
import FeeToken from "../contracts/FeeToken.json";
import IPriceProvider from "../contracts/IPriceProvider.json";
import MocCACoinbase from "../contracts/MocCACoinbase.json";
import MocCARC20 from "../contracts/MocCARC20.json";
import MocMultiCollateralGuard from "../contracts/MocMultiCollateralGuard.json";
import MocQueue from "../contracts/MocQueue.json";
import MocVendors from "../contracts/MocVendors.json";
import DelayMachine from "../contracts/omoc/DelayMachine.json";
import IERC20 from "../contracts/omoc/IERC20.json";
import IncentiveV2 from "../contracts/omoc/IncentiveV2.json";
import IRegistry from "../contracts/omoc/IRegistry.json";
import StakingMachine from "../contracts/omoc/StakingMachine.json";
import Supporters from "../contracts/omoc/Supporters.json";
import VestingFactory from "../contracts/omoc/VestingFactory.json";
import VestingMachine from "../contracts/omoc/VestingMachine.json";
import VetoMachine from "../contracts/omoc/VetoMachine.json";
import VotingMachine from "../contracts/omoc/VotingMachine.json";
import TokenMigrator from "../contracts/TokenMigrator.json";
import TokenPegged from "../contracts/TokenPegged.json";
import settings from "../settings";
import omoc from "../settings/omoc/omoc.json";
import type {
    Address,
    CallRequest,
    CallRequestWithOnError,
    ContractInfo,
    DContracts,
    MocAddressesData,
    RegistryAddressesData,
    SyncMulticallInput,
} from "../types/hooks";

// Reuse ABI as readonly unknown[] (no `any`)
const ABI_IPriceProvider = IPriceProvider.abi as readonly unknown[];
const ABI_MocMultiCollateralGuard =
    MocMultiCollateralGuard.abi as readonly unknown[];
const ABI_MocCARC20 = MocCARC20.abi as readonly unknown[];
const ABI_MocCACoinbase = MocCACoinbase.abi as readonly unknown[];
const ABI_CollateralAsset = CollateralAsset.abi as readonly unknown[];
const ABI_CollateralToken = CollateralToken.abi as readonly unknown[];
const ABI_MocVendors = MocVendors.abi as readonly unknown[];
const ABI_MocQueue = MocQueue.abi as readonly unknown[];
const ABI_FeeToken = FeeToken.abi as readonly unknown[];
const ABI_IERC20 = IERC20.abi as readonly unknown[];
const ABI_IncentiveV2 = IncentiveV2.abi as readonly unknown[];
const ABI_StakingMachine = StakingMachine.abi as readonly unknown[];
const ABI_DelayMachine = DelayMachine.abi as readonly unknown[];
const ABI_Supporters = Supporters.abi as readonly unknown[];
const ABI_VestingFactory = VestingFactory.abi as readonly unknown[];
const ABI_VestingMachine = VestingMachine.abi as readonly unknown[];
const ABI_VetoMachine = VetoMachine.abi as readonly unknown[];
const ABI_VotingMachine = VotingMachine.abi as readonly unknown[];
const ABI_TokenMigrator = TokenMigrator.abi as readonly unknown[];
const ABI_TokenPegged = TokenPegged.abi as readonly unknown[];

const EVM_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

/** onError handler used by some multicall entries */
const onErrorTP = () => ({ value: null });

/**
 * Read all protocol contracts/addresses based on settings + registry.
 * Returns a typed bag (DContracts) consumable by your hooks/UI.
 */
const readContracts = async (
    publicClient: PublicClient
): Promise<DContracts> => {
    // Settings slice used here with proper typing
    const s = (settings).tokens;
    if (!s) return {};

    const contracts: DContracts = {
        Moc: [],
        CA: [],
        CollateralToken: [],
        MocVendors: [],
        MocQueue: [],
        FeeToken: [],
        PP_FeeToken: [],
        FC_MAX_ABSOLUTE_OP_PROVIDER: [],
        FC_MAX_OP_DIFFERENCE_PROVIDER: [],
        TP: [],
        PP_CA: [],
        PP_TP: {} as Record<number, ContractInfo[]>,
    };

    // Single collateral (voting project) convenience
    if (import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "voting") {
        const tcAddress = import.meta.env.REACT_APP_CONTRACT_VETO_TC as
            | Address
            | undefined;
        if (tcAddress) {
            contracts.CollateralToken!.push({
                address: tcAddress,
                abi: ABI_CollateralToken,
                name: "CollateralToken",
                type: "",
            });
        }
    }

    // ---- Registry-based contracts ----
    if (import.meta.env.REACT_APP_CONTRACT_IREGISTRY) {
        contracts.IRegistry = {
            address: import.meta.env.REACT_APP_CONTRACT_IREGISTRY as Address,
            abi: IRegistry.abi as readonly unknown[],
            name: "IRegistry",
            type: "",
        };

        const registryAddr = await registryAddresses(
            publicClient,
            contracts.IRegistry
        );

        contracts.StakingMachine = {
            address: registryAddr.data.MOC_STAKING_MACHINE,
            abi: ABI_StakingMachine,
            name: "StakingMachine",
            type: "",
        };

        contracts.DelayMachine = {
            address: registryAddr.data.MOC_DELAY_MACHINE,
            abi: ABI_DelayMachine,
            name: "DelayMachine",
            type: "",
        };

        contracts.Supporters = {
            address: registryAddr.data.SUPPORTERS_ADDR,
            abi: ABI_Supporters,
            name: "Supporters",
            type: "",
        };

        contracts.VestingFactory = {
            address: registryAddr.data.MOC_VESTING_MACHINE,
            abi: ABI_VestingFactory,
            name: "VestingFactory",
            type: "",
        };

        contracts.VotingMachine = {
            address: registryAddr.data.MOC_VOTING_MACHINE,
            abi: ABI_VotingMachine,
            name: "VotingMachine",
            type: "",
        };

        contracts.VetoMachine = {
            address: registryAddr.data.MOC_VETO_MACHINE,
            abi: ABI_VetoMachine,
            name: "VetoMachine",
            type: "",
        };

        contracts.TG = {
            address: registryAddr.data.MOC_TOKEN,
            abi: ABI_IERC20,
            name: "TG",
            type: "",
        };

        // Placeholder VestingMachine (address filled when user selects a vesting)
        contracts.VestingMachine = {
            address: "0x0000000000000000000000000000000000000000",
            abi: ABI_VestingMachine,
            name: "VestingMachine",
            type: "",
        };
    }

    // ---- Incentive V2 ----
    if (import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2) {
        contracts.IncentiveV2 = {
            address: import.meta.env.REACT_APP_CONTRACT_INCENTIVE_V2 as Address,
            abi: ABI_IncentiveV2,
            name: "IncentiveV2",
            type: "",
        };
    }

    // If voting project, return contracts here because it does not use the price providers
    if (import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "voting")
        return contracts;

    // ---- Price Providers (CA/USD) from env (comma-separated) ----
    const ppcaRaw = import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_CA as
        | string
        | undefined;
    // Validate each address before using it as a contract target
    const ppca: Address[] = ppcaRaw
        ? (ppcaRaw
              .split(",")
              .filter((a) => EVM_ADDR_RE.test(a.trim())) as Address[])
        : [];

    for (let ca = 0; ca < s.CA.length; ca++) {
        const ppAddr = ppca[ca];
        if (!ppAddr) continue;
        const pp: ContractInfo = {
            address: ppAddr,
            abi: ABI_IPriceProvider,
            name: "PP",
            type: "",
        };
        contracts.PP_CA!.push(pp);
    }

    // ---- Price Provider for COINBASE (single) ----
    if (import.meta.env.REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE) {
        contracts.PP_COINBASE = {
            address: import.meta.env
                .REACT_APP_CONTRACT_PRICE_PROVIDER_COINBASE as Address,
            abi: ABI_IPriceProvider,
            name: "PP_COINBASE",
            type: "",
        };
    }

    // ---- MultiCollateral Guard (discover buckets) ----
    if (import.meta.env.REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD) {
        contracts.MocMultiCollateralGuard = {
            address: import.meta.env
                .REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD as Address,
            abi: ABI_MocMultiCollateralGuard,
            name: "MocMultiCollateralGuard",
            type: "",
        };

        // Iterate buckets (CA list)
        for (let ca = 0; ca < s.CA.length; ca++) {
            const bucketAddr = (await readContract(publicClient, {
                address: contracts.MocMultiCollateralGuard.address,
                abi: ABI_MocMultiCollateralGuard,
                functionName: "buckets",
                args: [ca],
            })) as Address;

            const caType = s.CA[ca]?.type;
            const isCoinbase = caType === "coinbase";
            const mocAbi = isCoinbase ? ABI_MocCACoinbase : ABI_MocCARC20;

            const moc: ContractInfo & { contractMocType?: string } = {
                address: bucketAddr,
                abi: mocAbi,
                name: "Moc",
                type: caType,
                contractMocType: caType,
            };
            contracts.Moc!.push(moc);

            // Read per-bucket contracts/addresses
            const mocAddr = await mocAddresses(publicClient, moc);

            if (!isCoinbase && mocAddr.data.acToken) {
                if (
                    !contracts.CA!.some(
                        (caItem) =>
                            caItem.address.toLowerCase() ===
                            mocAddr.data.acToken!.toLowerCase()
                    )
                ) {
                    contracts.CA!.push({
                        address: mocAddr.data.acToken,
                        abi: ABI_CollateralAsset,
                        name: "CollateralAsset",
                        type: "",
                    });
                }
            }

            // TP list (via pegContainer/peggedTokenIndex)
            const tpAddresses: Address[] = [];

            for (let tp = 0; tp < s.TP.length; tp++) {
                const tpAddress = (await readContract(publicClient, {
                    address: moc.address,
                    abi: mocAbi,
                    functionName: "tpTokens",
                    args: [tp],
                })) as Address | undefined;
                if (
                    !tpAddress ||
                    tpAddress === "0x0000000000000000000000000000000000000000"
                )
                    continue;

                // index: [index, enabled]
                const tpIndex = (await readContract(publicClient, {
                    address: moc.address,
                    abi: mocAbi,
                    functionName: "peggedTokenIndex",
                    args: [tpAddress],
                })) as readonly [bigint, boolean] | undefined;
                if (!tpIndex) continue;

                // pegContainer(index) -> [price, priceProvider]
                const tpItem = (await readContract(publicClient, {
                    address: moc.address,
                    abi: mocAbi,
                    functionName: "pegContainer",
                    args: [tpIndex[0]],
                })) as readonly [unknown, Address] | undefined;

                if (!tpItem) continue;
                if (!tpAddresses.includes(tpAddress))
                    tpAddresses.push(tpAddress);

                if (!contracts.PP_TP![ca]) contracts.PP_TP![ca] = [];

                contracts.PP_TP![ca].push({
                    address: tpItem[1],
                    abi: ABI_IPriceProvider,
                    name: "PP",
                    type: "",
                });
            }

            contracts.CollateralToken!.push({
                address: mocAddr.data.tcToken,
                abi: ABI_CollateralToken,
                name: "CollateralToken",
                type: "",
            });

            contracts.MocVendors!.push({
                address: mocAddr.data.mocVendors,
                abi: ABI_MocVendors,
                name: "MocVendors",
                type: "",
            });

            contracts.MocQueue!.push({
                address: mocAddr.data.mocQueue,
                abi: ABI_MocQueue,
                name: "MocQueue",
                type: "",
            });

            contracts.FeeToken!.push({
                address: mocAddr.data.feeToken,
                abi: ABI_FeeToken,
                name: "FeeToken",
                type: "",
            });

            contracts.PP_FeeToken!.push({
                address: mocAddr.data.feeTokenPriceProvider,
                abi: ABI_IPriceProvider,
                name: "PP",
                type: "",
            });

            contracts.FC_MAX_ABSOLUTE_OP_PROVIDER!.push({
                address: mocAddr.data.maxAbsoluteOpProvider,
                abi: ABI_IPriceProvider,
                name: "FC_MAX_ABSOLUTE_OP_PROVIDER",
                type: "",
            });

            contracts.FC_MAX_OP_DIFFERENCE_PROVIDER!.push({
                address: mocAddr.data.maxOpDiffProvider,
                abi: ABI_IPriceProvider,
                name: "FC_MAX_OP_DIFFERENCE_PROVIDER",
                type: "",
            });

            // After iterating CA buckets, export TP token contracts
            for (let tp = 0; tp < s.TP.length; tp++) {
                const tpAddr = tpAddresses[tp];
                if (!tpAddr) continue;
                contracts.TP!.push({
                    address: tpAddr,
                    abi: ABI_TokenPegged,
                    name: "TP",
                    type: "",
                });
            }
        }
    }

    // ---- Custom price providers (pair:ppAddress[:tokenAddress],...) ----
    // Format: "MOC/USD:0xPPAddress:0xTokenAddress" (token address is optional)
    const ppCustomRaw = import.meta.env
        .REACT_APP_CONTRACT_PRICE_PROVIDER_CUSTOM as string | undefined;
    if (ppCustomRaw) {
        contracts.PP_CUSTOM = [];
        contracts.CUSTOM_TOKENS = [];
        for (const entry of ppCustomRaw.split(",")) {
            const parts = entry.split(":");
            // parts[0] = pair, parts[1] = PP address, parts[2] = token address (optional)
            if (parts.length < 2) continue;
            const pair = parts[0].trim();
            const ppAddr = parts[1].trim();
            const tokenAddr = parts[2]?.trim();
            if (!pair || !EVM_ADDR_RE.test(ppAddr)) continue;
            contracts.PP_CUSTOM.push({
                address: ppAddr as Address,
                abi: ABI_IPriceProvider,
                name: pair,
                type: "custom",
            });
            if (tokenAddr && EVM_ADDR_RE.test(tokenAddr)) {
                contracts.CUSTOM_TOKENS.push({
                    address: tokenAddr as Address,
                    abi: IERC20.abi as readonly unknown[],
                    name: pair,
                    type: "custom",
                });
            }
        }
    }

    // ---- Token migrator & legacy TP ----
    if (import.meta.env.REACT_APP_CONTRACT_LEGACY_TP) {
        contracts.tp_legacy = {
            address: import.meta.env.REACT_APP_CONTRACT_LEGACY_TP as Address,
            abi: ABI_TokenPegged,
            name: "tp_legacy",
            type: "",
        };

        if (!import.meta.env.REACT_APP_CONTRACT_TOKEN_MIGRATOR) {
            console.error(
                "Please set REACT_APP_CONTRACT_TOKEN_MIGRATOR env var"
            );
        } else {
            contracts.token_migrator = {
                address: import.meta.env
                    .REACT_APP_CONTRACT_TOKEN_MIGRATOR as Address,
                abi: ABI_TokenMigrator,
                name: "tokenMigrator",
                type: "",
            };
        }
    }

    return contracts;
};

const registryAddresses = async (
    publicClient: PublicClient,
    contractRegistry: ContractInfo
): Promise<{ data: RegistryAddressesData }> => {
    const callRequest: CallRequest[] = [
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.MOC_STAKING_MACHINE],
            resultType: "address",
            keys: ["MOC_STAKING_MACHINE"],
        },
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.SUPPORTERS_ADDR],
            resultType: "address",
            keys: ["SUPPORTERS_ADDR"],
        },
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.MOC_DELAY_MACHINE],
            resultType: "address",
            keys: ["MOC_DELAY_MACHINE"],
        },
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.MOC_VESTING_MACHINE],
            resultType: "address",
            keys: ["MOC_VESTING_MACHINE"],
        },
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.MOC_VOTING_MACHINE],
            resultType: "address",
            keys: ["MOC_VOTING_MACHINE"],
        },
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.MOC_VETO_MACHINE],
            resultType: "address",
            keys: ["MOC_VETO_MACHINE"],
        },
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.MOC_PRICE_PROVIDER_REGISTRY],
            resultType: "address",
            keys: ["MOC_PRICE_PROVIDER_REGISTRY"],
        },
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.ORACLE_MANAGER_ADDR],
            resultType: "address",
            keys: ["ORACLE_MANAGER_ADDR"],
        },
        {
            contract: contractRegistry,
            functionName: "getAddress",
            args: [omoc.RegistryConstants.MOC_TOKEN],
            resultType: "address",
            keys: ["MOC_TOKEN"],
        },
    ];

    const result = await runMulticallSync(
        publicClient,
        callRequest as SyncMulticallInput[]
    );
    return { data: result.data as RegistryAddressesData };
};

const mocAddresses = async (
    publicClient: PublicClient,
    contractMoc: ContractInfo & { contractMocType?: string }
): Promise<{ data: MocAddressesData }> => {
    const calls: CallRequestWithOnError[] = [
        {
            contract: contractMoc,
            functionName: "feeToken",
            args: [],
            resultType: "address",
            keys: ["feeToken"],
        },
        {
            contract: contractMoc,
            functionName: "feeTokenPriceProvider",
            args: [],
            resultType: "address",
            keys: ["feeTokenPriceProvider"],
        },
    ];

    if (contractMoc.contractMocType !== "coinbase") {
        calls.push({
            contract: contractMoc,
            functionName: "acToken",
            args: [],
            resultType: "address",
            keys: ["acToken"],
        });
    }

    calls.push(
        {
            contract: contractMoc,
            functionName: "tcToken",
            args: [],
            resultType: "address",
            keys: ["tcToken"],
        },
        {
            contract: contractMoc,
            functionName: "maxAbsoluteOpProvider",
            args: [],
            resultType: "address",
            keys: ["maxAbsoluteOpProvider"],
        },
        {
            contract: contractMoc,
            functionName: "maxOpDiffProvider",
            args: [],
            resultType: "address",
            keys: ["maxOpDiffProvider"],
        },
        {
            contract: contractMoc,
            functionName: "mocQueue",
            args: [],
            resultType: "address",
            keys: ["mocQueue"],
        },
        {
            contract: contractMoc,
            functionName: "mocVendors",
            args: [],
            resultType: "address",
            keys: ["mocVendors"],
        }
    );

    // tpTokens[i]
    for (let i = 0; i < (settings).tokens.TP.length; i++) {
        calls.push({
            contract: contractMoc,
            functionName: "tpTokens",
            args: [i],
            resultType: "address",
            keys: ["tpTokens", i],
            onError: onErrorTP,
        });
    }

    const res = await runMulticallSync(
        publicClient,
        calls as SyncMulticallInput[]
    );
    // Normalize tpTokens array if your multicall flattens keys
    const tpTokens: Address[] = [];
    for (let i = 0; i < (settings).tokens.TP.length; i++) {
        const key = ["tpTokens", i].join(",");
        const addr: Address | undefined =
            (res.data?.tpTokens as Address[] | undefined)?.[i] ??
            (res.data?.[key] as Address | undefined);
        if (addr) tpTokens.push(addr);
    }
    return { data: { ...res.data, tpTokens } as MocAddressesData };
};

export { readContracts };
