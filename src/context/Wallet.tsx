import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import type { TransactionReceipt } from "viem";
import {
    useAccount,
    useConnect,
    useDisconnect,
    usePublicClient,
    useWalletClient,
} from "wagmi";

import {
    AllowanceAmount,
    AllowUseTokenMigrator,
    MigrateRifPro,
    MigrateToken,
    transferCoinbaseTo,
    transferTokenTo,
} from "../backend/moc-base";
import { claimV2 } from "../backend/omoc/incentivev2";
import {
    addStake,
    approveStakingMachine,
    delayMachineCancelWithdraw,
    delayMachineWithdraw,
    registerOracle,
    removeOracle,
    setOracleAddress,
    setOracleName,
    subscribeToCoinPair,
    switchRound,
    unStake,
    unsubscribeFromCoinPair,
} from "../backend/omoc/staking";
import {
    addStake as addStakeVesting,
    approve as approveVesting,
    delayMachineCancelWithdraw as delayMachineCancelWithdrawVesting,
    delayMachineWithdraw as delayMachineWithdrawVesting,
    preVote as preVoteVesting,
    registerOracle as registerOracleVesting,
    removeOracle as removeOracleVesting,
    setOracleAddress as setOracleAddressVesting,
    setOracleName as setOracleNameVesting,
    subscribeToCoinPair as subscribeToCoinPairVesting,
    unStake as unStakeVesting,
    unsubscribeFromCoinPair as unsubscribeFromCoinPairVesting,
    vestingVerify,
    vote as voteVesting,
    withdrawAll as withdrawAllVesting,
} from "../backend/omoc/vesting";
import { vetoVote, vetoWithdraw } from "../backend/omoc/veto";
import {
    acceptedStep,
    preVote,
    preVoteStep,
    unRegister,
    vote,
    voteStep,
} from "../backend/omoc/voting";
import {
    allowanceMoc as allowanceMocV1,
    mintBPro as mintBProV1,
    mintDoc as mintDocV1,
    redeemBPro as redeemBProV1,
    redeemFreeDoc as redeemFreeDocV1,
    transferCoinbase as transferCoinbaseV1,
    transferToken as transferTokenV1,
} from "../backend/v1/moc-v1";
import ModalAccount from "../components/Modals/Account";
import ModalProviders from "../components/Modals/Providers";
import { ALLOWED_CHAIN } from "../constants/chain";
import {
    ApproveTokenContract,
    exchangeMethod,
    exchangeMethodCombined,
    TokenContract,
} from "../helpers/exchange";
import {
    loadVestingAddressesFromLocalStorage,
    saveVestingAddressesToLocalStorage,
} from "../helpers/vesting";
import { useBaseCoinBalance } from "../hooks/useBaseCoinBalance";
import { useContractLendingStatus } from "../hooks/useContractLendingStatus";
import { useContractOmocStatus } from "../hooks/useContractOmocStatus";
import { useContractProtocolStatus } from "../hooks/useContractProtocolStatus";
import { useContractProtocolStatusV1 } from "../hooks/useContractProtocolStatusV1";
import { useIncentiveV2 } from "../hooks/useIncentiveV2";
import { useLatestBlockNumber } from "../hooks/useLatestBlockNumber";
import { useOffchainPrices } from "../hooks/useOffchainPrices";
import { useOnchainPrices } from "../hooks/useOnchainPrices";
import { useOracleCoinPairs } from "../hooks/useOracleCoinPairs";
import { usePriceProvider } from "../hooks/usePriceProvider";
import { readContracts } from "../hooks/useReadContracts";
import { readContractsV1 } from "../hooks/useReadContractsV1";
import { useRegisteredOracles } from "../hooks/useRegisteredOracles";
import { useRpcErrorHandler } from "../hooks/useRpcErrorHandler";
import { useRpcErrorIntegration } from "../hooks/useRpcErrorIntegration";
import { useUserBalance } from "../hooks/useUserBalance";
import { useUserBalanceV1 } from "../hooks/useUserBalanceV1";
import { useUserLending } from "../hooks/useUserLending";
import { useUserOmocBalance } from "../hooks/useUserOmocBalance";
import { useUserVesting } from "../hooks/useUserVesting";
import { useUserVeto } from "../hooks/useUserVeto";
import api from "../services/api";
import { API_OPERATIONS_BASE } from "../services/apiConfig";
import type { DContracts, ParsedPrices } from "../types/hooks";
import type { DContractsV1, InterfaceContextV1 } from "../types/hooks-v1";
import type {
    InterfaceContext,
    OnReceipt,
    OnTransaction,
    WalletContextType,
} from "../types/wallets";

// Callback types — avoid `any`

interface VestingTransaction {
    vesting: string;
    [key: string]: unknown;
}

interface VestingResponse {
    transactions?: VestingTransaction[];
    [key: string]: unknown;
}

export const WalletContext = createContext<WalletContextType | null>(null);

export const useWalletContext = () => {
    const ctx = useContext(WalletContext);
    if (!ctx) {
        throw new Error("useWalletContext must be used inside WalletProvider");
    }
    return ctx;
};

const REFRESH_INTERVAL_BLOCKS_NUMBER = 5_000;
const REFRESH_INTERVAL_OFFCHAIN_PRICES = 20_000;
const REFRESH_INTERVAL_ONCHAIN_PRICES = 20_000;
const REFRESH_INTERVAL_CONTRACT_PROTOCOL_STATUS = 30_000;
const REFRESH_INTERVAL_CONTRACT_STATUS_OMOC = 30_000;
const REFRESH_INTERVAL_USER_BALANCE = 30_000;
const REFRESH_INTERVAL_CONTRACT_LENDING_MANAGER = 30_000;

// moc-v1 (legacy) uses a different, incompatible contract generation (no
// caIndex/MocQueue) — see feedback memory "shared wallet context". Rather than
// forking this provider, contract discovery/status/balance branch on this flag
// and expose their results as separate fields alongside the v3 ones.
const IS_MOC_V1 =
    import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "moc-v1";

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { address, isConnected, chainId } = useAccount();
    const isOnCorrectChain = isConnected && chainId === ALLOWED_CHAIN.id;
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    // Always use the public client for ALLOWED_CHAIN regardless of what chain the
    // wallet is currently on. This prevents ChainDisconnectedError when the wallet
    // is on a different chain (e.g. Ethereum mainnet) while reads target RSK.
    const publicClient = usePublicClient({ chainId: ALLOWED_CHAIN.id });
    const walletClient = useWalletClient();

    const [contractsAddress, setContractsAddress] = useState<DContracts | null>(
        null
    );
    const [contractsAddressV1, setContractsAddressV1] =
        useState<DContractsV1 | null>(null);
    const [contractsAddressLoaded, setContractsAddressLoaded] = useState(false);
    const [contractsLoadRetryCount, setContractsLoadRetryCount] = useState(0);
    const MAX_CONTRACTS_LOAD_RETRIES = 3;
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [vestingAddress, setVestingAddress] = useState<string | undefined>(
        undefined
    );

    const [showModalAccount, setShowModalAccount] = useState<boolean>(false);
    const [showModalProviders, setShowModalProviders] =
        useState<boolean>(false);
    const [vestingOn, setVestingOn] = useState<boolean>(false);
    const toggleVesting = useCallback(() => {
        setVestingOn((prev) => !prev);
    }, []);

    // RPC error handling
    const {
        rpcError,
        handleRpcError,
        retryConnection,
        clearError: clearRpcError,
        isRpcHealthy,
        checkConnectivityNow,
    } = useRpcErrorHandler();

    // Integrate RPC error handling globally
    useRpcErrorIntegration();

    // Hooks for contract data
    const { blockNumber } = useLatestBlockNumber(
        publicClient ?? undefined,
        REFRESH_INTERVAL_BLOCKS_NUMBER
    );

    const offChainPricesAPI = useOffchainPrices(
        REFRESH_INTERVAL_OFFCHAIN_PRICES
    );

    const onChainPricesHook = useOnchainPrices(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        REFRESH_INTERVAL_ONCHAIN_PRICES
    );
    const offChainPrices =
        (offChainPricesAPI.parsedPrices as ParsedPrices[]) ?? undefined;
    const onChainPrices =
        (onChainPricesHook.data as unknown as ParsedPrices[]) ?? undefined;

    const contractProtocolStatus = useContractProtocolStatus(
        contractsAddressLoaded && !IS_MOC_V1
            ? (contractsAddress ?? undefined)
            : undefined,
        Number(blockNumber),
        offChainPrices,
        onChainPrices,
        REFRESH_INTERVAL_CONTRACT_PROTOCOL_STATUS
    );

    const contractProtocolStatusV1 = useContractProtocolStatusV1(
        contractsAddressLoaded && IS_MOC_V1
            ? (contractsAddressV1 ?? undefined)
            : undefined,
        REFRESH_INTERVAL_CONTRACT_PROTOCOL_STATUS
    );

    const priceProvider = usePriceProvider(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        undefined, // pass PriceProviderData here to override with offchain prices
        REFRESH_INTERVAL_CONTRACT_PROTOCOL_STATUS
    );

    const contractStatusOmoc = useContractOmocStatus(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        REFRESH_INTERVAL_CONTRACT_STATUS_OMOC
    );

    const contractLendingStatus = useContractLendingStatus(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        REFRESH_INTERVAL_CONTRACT_LENDING_MANAGER
    );

    // Hooks for user data

    const userBaseCoinBalance = useBaseCoinBalance(
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userBalance = useUserBalance(
        // Was gated to `!IS_MOC_V1` back when contractsAddress.TP/.Moc were
        // always empty for moc-v1 (no calls would've been generated anyway).
        // Now that those arrays are bridged from the v1 discovery above,
        // Lending & Borrowing (useLendingBorrowingData) needs this to run so
        // DOC/RBTC wallet balances populate for moc-v1 too.
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userBalanceV1 = useUserBalanceV1(
        contractsAddressLoaded && IS_MOC_V1
            ? (contractsAddressV1 ?? undefined)
            : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userOmocBalance = useUserOmocBalance(
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    // When vesting is in use, oracle ownership (subscriptions, round
    // selection) lives on the vesting contract's account, not the connected
    // wallet — same "vesting acts as the account" rule Staking/Voting follow.
    const oracleCoinPairs = useOracleCoinPairs(
        publicClient,
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        (vestingAddress as `0x${string}` | undefined) ?? address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const registeredOracles = useRegisteredOracles(
        publicClient,
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userVesting = useUserVesting(
        contractsAddressLoaded ? (contractsAddress ?? undefined) : undefined,
        address,
        vestingAddress as `0x${string}` | undefined,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userIncentiveV2 = useIncentiveV2(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userVeto = useUserVeto(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        userBalance.data,
        contractStatusOmoc.data,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const userLending = useUserLending(
        contractsAddressLoaded && contractsAddress
            ? contractsAddress
            : undefined,
        address,
        REFRESH_INTERVAL_USER_BALANCE
    );

    const readContractsAddresses = useCallback(async (): Promise<void> => {
        if (
            !isConnected ||
            !isOnCorrectChain ||
            contractsAddressLoaded ||
            !publicClient
        )
            return;

        try {
            if (IS_MOC_V1) {
                // moc-v1's own Exchange/Send flow needs the v1-shaped bag, but
                // Staking/Vesting/Voting are reused as-is from the v3 flavors
                // (see router/projects/moc-v1) and read exclusively from the
                // v3 `contractsAddress` state — so both must be loaded. With
                // no REACT_APP_CONTRACT_MULTICOLLATERAL_GUARD configured for
                // moc-v1, readContracts()'s caIndex/bucket-discovery loop is
                // skipped entirely; it only resolves the IRegistry-derived
                // governance contracts (StakingMachine, VestingFactory,
                // VotingMachine, VetoMachine, TG/MOC token, etc.).
                const [contractsAddressesV1, contractsAddresses] =
                    await Promise.all([
                        readContractsV1(publicClient),
                        readContracts(publicClient),
                    ]);
                setContractsAddressV1(contractsAddressesV1);

                // Lending & Borrowing (useContractLendingStatus, useUserLending,
                // useLendingBorrowingData) reads exclusively from the shared
                // `contracts.TP`/`.Moc` arrays, never from `contractsAddressV1`.
                // The MoC V1 lending-and-borrowing-sc adapter (MocAdapterV1)
                // is deployed against the legacy MoC.sol contract itself as its
                // single "moc bucket" (see validateAndGetPACtp: mocBucket_ must
                // equal MOC_V1), so it maps 1:1 onto contracts.Moc[0], and the
                // legacy DOC token maps onto contracts.TP[0] — matching
                // settings tokens.TP[0]/CA[0] for the moc-v1 project.
                contractsAddresses.TP = [contractsAddressesV1.DocToken];
                contractsAddresses.Moc = [contractsAddressesV1.Moc];

                setContractsAddress(contractsAddresses);
            } else {
                const contractsAddresses = await readContracts(publicClient);
                setContractsAddress(contractsAddresses);
            }
            setContractsAddressLoaded(true);
        } catch (e) {
            console.error("Error loading contracts:", e);
            handleRpcError(e);
            if (contractsLoadRetryCount < MAX_CONTRACTS_LOAD_RETRIES) {
                const delay = 2000 * (contractsLoadRetryCount + 1);
                retryTimerRef.current = setTimeout(() => {
                    setContractsLoadRetryCount((c) => c + 1);
                }, delay);
            }
        }
    }, [
        isConnected,
        isOnCorrectChain,
        contractsAddressLoaded,
        publicClient,
        handleRpcError,
        contractsLoadRetryCount,
    ]);

    useEffect(() => {
        if (!contractsAddressLoaded) {
            void readContractsAddresses();
        }
    }, [contractsAddressLoaded, readContractsAddresses]);

    // Reset loaded contracts when the wallet switches to a different chain so that
    // they are re-fetched when the user switches back to the correct chain.
    useEffect(() => {
        if (isConnected && !isOnCorrectChain) {
            setContractsAddress(null);
            setContractsAddressV1(null);
            setContractsAddressLoaded(false);
            setContractsLoadRetryCount(0);
        }
    }, [isConnected, isOnCorrectChain]);

    useEffect(() => {
        return () => {
            if (retryTimerRef.current !== null) {
                clearTimeout(retryTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isConnected && !showModalProviders) {
            setShowModalProviders(true);
        }
    }, [isConnected, showModalProviders]);

    // Auto-close the providers modal once the wallet is connected (handles the
    // case where wagmi silently auto-reconnects from a stored session before the
    // user explicitly clicks a wallet button).
    useEffect(() => {
        if (isConnected && showModalProviders) {
            setShowModalProviders(false);
        }
    }, [isConnected, showModalProviders]);

    // Use refs so the effect always calls the latest refetch without re-running on every render
    const refetchBaseCoinBalanceRef = useRef(userBaseCoinBalance?.refetch);
    refetchBaseCoinBalanceRef.current = userBaseCoinBalance?.refetch;
    const refetchUserBalanceRef = useRef(userBalance?.refetch);
    refetchUserBalanceRef.current = userBalance?.refetch;
    const refetchUserBalanceV1Ref = useRef(userBalanceV1?.refetch);
    refetchUserBalanceV1Ref.current = userBalanceV1?.refetch;
    const refetchOmocBalanceRef = useRef(userOmocBalance?.refetch);
    refetchOmocBalanceRef.current = userOmocBalance?.refetch;
    const refetchVestingRef = useRef(userVesting?.refetch);
    refetchVestingRef.current = userVesting?.refetch;
    const refetchIncentiveV2Ref = useRef(userIncentiveV2?.refetch);
    refetchIncentiveV2Ref.current = userIncentiveV2?.refetch;
    const refetchLendingRef = useRef(userLending?.refetch);
    refetchLendingRef.current = userLending?.refetch;

    useEffect(() => {
        // Refetch user data when address changes
        if (!address) return;
        void refetchBaseCoinBalanceRef.current?.();
        void refetchUserBalanceRef.current?.();
        void refetchUserBalanceV1Ref.current?.();
        void refetchOmocBalanceRef.current?.();
        void refetchVestingRef.current?.();
        void refetchIncentiveV2Ref.current?.();
        void refetchLendingRef.current?.();
    }, [address]); // refs are intentionally omitted — they never change identity

    const onDisconnect = (): void => {
        disconnect();
    };

    const onShowModalAccount = (): void => {
        setShowModalAccount(true);
    };

    const onShowModalProviders = (): void => {
        setShowModalProviders(true);
    };

    const onShowModalAccountVesting = (): void => {
        setVestingOn(true);
        setShowModalAccount(true);
    };

    const onHideModalAccount = (): void => {
        setShowModalAccount(false);
    };

    const onHideModalProviders = (): void => {
        setShowModalProviders(false);
    };

    const buildInterfaceContext = (): InterfaceContext => {
        return {
            publicClient,
            walletClient,
            contractProtocolStatus,
            userBalance,
            address: address,
            contracts: contractsAddress,
        };
    };

    const buildInterfaceContextV1 = (): InterfaceContextV1 => {
        return {
            publicClient,
            address,
            contracts: contractsAddressV1,
            contractProtocolStatus: contractProtocolStatusV1,
        };
    };

    const interfaceMintBProV1 = async (
        btcAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const interfaceContext = buildInterfaceContextV1();
        return mintBProV1(interfaceContext, btcAmount, onTransaction, onReceipt);
    };

    const interfaceMintDocV1 = async (
        btcAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const interfaceContext = buildInterfaceContextV1();
        return mintDocV1(interfaceContext, btcAmount, onTransaction, onReceipt);
    };

    const interfaceRedeemBProV1 = async (
        bproAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const interfaceContext = buildInterfaceContextV1();
        return redeemBProV1(
            interfaceContext,
            bproAmount,
            onTransaction,
            onReceipt
        );
    };

    const interfaceRedeemFreeDocV1 = async (
        docAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const interfaceContext = buildInterfaceContextV1();
        return redeemFreeDocV1(
            interfaceContext,
            docAmount,
            onTransaction,
            onReceipt
        );
    };

    const interfaceAllowanceMocV1 = async (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const interfaceContext = buildInterfaceContextV1();
        return allowanceMocV1(interfaceContext, amount, onTransaction, onReceipt);
    };

    // Resolves which v1 ERC20 contract backs a given Send token symbol —
    // v1's flat DContractsV1 has no caIndex to dispatch on, unlike TokenContract
    // (helpers/exchange.ts) which is tied to the v3 CA-indexed contracts bag.
    const interfaceTransferTokenV1 = async (
        currencyYouExchange: string,
        amount: bigint,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const interfaceContext = buildInterfaceContextV1();
        const { contracts } = interfaceContext;
        if (!contracts) throw new Error("Contracts not found");

        let token;
        switch (currencyYouExchange) {
            case "TC_0":
                token = contracts.BProToken;
                break;
            case "TP_0":
                token = contracts.DocToken;
                break;
            case "TG":
                token = contracts.MoCToken;
                break;
            default:
                throw new Error(`Unsupported token: ${currencyYouExchange}`);
        }

        return transferTokenV1(
            interfaceContext,
            token,
            destinationAddress,
            amount,
            onTransaction,
            onReceipt
        );
    };

    const interfaceTransferCoinbaseV1 = async (
        amount: bigint,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const interfaceContext = buildInterfaceContextV1();
        return transferCoinbaseV1(
            interfaceContext,
            destinationAddress,
            amount,
            onTransaction,
            onReceipt
        );
    };

    /* VESTING */

    const setVestingMachine = useCallback((vAddress: string): void => {
        if (vAddress !== "" && !/^0x[0-9a-fA-F]{40}$/.test(vAddress)) {
            console.error(`Invalid vesting address format: ${vAddress}`);
            return;
        }
        setVestingAddress(vAddress === "" ? undefined : vAddress);
    }, []);

    const saveUserVesting = (response: VestingResponse): void => {
        if (!address) return;
        if (
            response.transactions !== undefined &&
            response.transactions.length > 0
        ) {
            const vFromStorage = loadVestingAddressesFromLocalStorage(address);
            const vLowerFromStorage = vFromStorage.map((v: string) =>
                v.toLowerCase()
            );

            const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
            const newVesting: string[] = [];
            response.transactions.forEach((data) => {
                const addr = data.vesting.toLowerCase();
                if (
                    EVM_ADDRESS_RE.test(data.vesting) &&
                    !vLowerFromStorage.includes(addr)
                ) {
                    newVesting.push(addr);
                }
            });

            if (newVesting.length > 0) {
                vLowerFromStorage.push(...newVesting);
                saveVestingAddressesToLocalStorage(address, vLowerFromStorage);
            }
        }
    };

    const readUserVesting = (): void => {
        if (!API_OPERATIONS_BASE) {
            console.warn(
                "readUserVesting: REACT_APP_ENVIRONMENT_API_OPERATIONS is not set"
            );
            return;
        }
        const url = new URL(API_OPERATIONS_BASE);
        url.pathname = "/v1/omoc/vesting_created/";
        url.search = new URLSearchParams({
            holder: address || "",
            limit: "20",
            skip: "0",
        }).toString();

        api<VestingResponse>("get", url.toString())
            .then((response) => {
                saveUserVesting(response as VestingResponse);
            })
            .catch((error: Error) => {
                console.error(error);
            });
    };

    const isVestingLoaded = (): boolean => {
        return !!vestingAddress;
    };

    const interfaceTransferToken = async (
        currencyYouExchange: string,
        amount: bigint,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<void> => {
        if (!contractsAddress) return;

        const tContract = TokenContract(contractsAddress, currencyYouExchange);
        if (tContract.token) {
            const interfaceContext = buildInterfaceContext();
            await transferTokenTo(
                interfaceContext,
                tContract.token,
                destinationAddress,
                amount,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceTransferCoinbase = async (
        amount: bigint,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<void> => {
        const interfaceContext = buildInterfaceContext();
        await transferCoinbaseTo(
            interfaceContext,
            destinationAddress,
            amount,
            onTransaction,
            onReceipt
        );
    };

    const interfaceAllowanceAmount = async (
        currencyYouExchange: string,
        currencyYouReceive: string,
        amountAllowance: bigint,
        caIndex: number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<void> => {
        if (!contractsAddress) return;

        const approveInfo = ApproveTokenContract(
            contractsAddress,
            currencyYouExchange,
            currencyYouReceive,
            caIndex
        );
        if (approveInfo.token) {
            const interfaceContext = buildInterfaceContext();
            await AllowanceAmount(
                interfaceContext,
                approveInfo.token,
                approveInfo.contractAllow,
                amountAllowance,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceExchangeMethod = async (
        currencyYouExchange: string,
        currencyYouReceive: string,
        tokenAmount: bigint,
        limitAmount: bigint,
        qAssetMaxFees: bigint,
        caIndex: number,
        tpIndex: number,
        operationType: string,
        anotherTokenAmount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<unknown> => {
        if (!isOnCorrectChain)
            throw new Error(
                `Wrong network — please switch your wallet to ${ALLOWED_CHAIN.name} before signing`
            );
        const interfaceContext = buildInterfaceContext();
        if (
            operationType === "COMBINED_MINT" ||
            operationType === "COMBINED_REDEEM"
        ) {
            return exchangeMethodCombined(
                interfaceContext,
                tokenAmount,
                limitAmount,
                caIndex,
                tpIndex,
                operationType,
                anotherTokenAmount,
                onTransaction,
                onReceipt
            );
        } else {
            return exchangeMethod(
                interfaceContext,
                currencyYouExchange,
                currencyYouReceive,
                tokenAmount,
                limitAmount,
                qAssetMaxFees,
                caIndex,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceAllowUseTokenMigrator = async (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return AllowUseTokenMigrator(
            interfaceContext,
            amount,
            onTransaction,
            onReceipt,
            onError
        );
    };

    const interfaceMigrateToken = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        return MigrateToken(
            interfaceContext,
            onTransaction,
            onReceipt,
            onError
        );
    };

    const interfaceAllowUseRifProMigrator = async (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const interfaceContext = buildInterfaceContext();
        const legacyRifPro = interfaceContext.contracts?.legacy_rifpro;
        const rifProMigrator = interfaceContext.contracts?.rifpro_migrator;

        if (!legacyRifPro || !rifProMigrator) {
            const error = new Error("RIFPRO migration contracts are not configured");
            onError(error);
            throw error;
        }

        return AllowanceAmount(
            interfaceContext,
            legacyRifPro,
            rifProMigrator,
            amount,
            onTransaction,
            onReceipt
        );
    };

    const interfaceMigrateRifPro = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        const receipt = await MigrateRifPro(
            buildInterfaceContext(),
            onTransaction,
            onReceipt,
            onError
        );
        void refetchUserBalanceRef.current?.();
        return receipt;
    };

    // OMOC methods
    const interfaceStakingApprove = async (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await approveVesting(
                    interfaceContext,
                    amount,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            } else {
                return await approveStakingMachine(
                    interfaceContext,
                    amount,
                    onTransaction,
                    onReceipt
                );
            }
        } catch (error) {
            onError(error);
        }
    };

    const interfaceStakingAddStake = async (
        amount: bigint,
        from: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<TransactionReceipt | undefined> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded() && vestingAddress) {
            return addStakeVesting(
                interfaceContext,
                amount,
                from,
                vestingAddress as `0x${string}`,
                onTransaction,
                onReceipt
            );
        } else {
            return addStake(
                interfaceContext,
                amount,
                from,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceOracleSubscribeCoinPair = async (
        coinPair: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await subscribeToCoinPairVesting(
                    interfaceContext,
                    coinPair,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            }
            return await subscribeToCoinPair(
                interfaceContext,
                coinPair,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceOracleUnsubscribeCoinPair = async (
        coinPair: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await unsubscribeFromCoinPairVesting(
                    interfaceContext,
                    coinPair,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            }
            return await unsubscribeFromCoinPair(
                interfaceContext,
                coinPair,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceOracleRegister = async (
        oracleAddr: `0x${string}`,
        url: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await registerOracleVesting(
                    interfaceContext,
                    oracleAddr,
                    url,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            }
            return await registerOracle(
                interfaceContext,
                oracleAddr,
                url,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceOracleRemove = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await removeOracleVesting(
                    interfaceContext,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            }
            return await removeOracle(interfaceContext, onTransaction, onReceipt);
        } catch (error) {
            onError(error);
        }
    };

    const interfaceOracleSetName = async (
        url: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await setOracleNameVesting(
                    interfaceContext,
                    url,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            }
            return await setOracleName(
                interfaceContext,
                url,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceOracleSwitchRound = async (
        coinPairPriceAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await switchRound(
                interfaceContext,
                coinPairPriceAddress,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceOracleSetAddress = async (
        oracleAddr: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await setOracleAddressVesting(
                    interfaceContext,
                    oracleAddr,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            }
            return await setOracleAddress(
                interfaceContext,
                oracleAddr,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceStakingDelayMachineWithdraw = async (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await delayMachineWithdrawVesting(
                    interfaceContext,
                    idWithdraw,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            } else {
                return await delayMachineWithdraw(
                    interfaceContext,
                    idWithdraw,
                    onTransaction,
                    onReceipt
                );
            }
        } catch (error) {
            onError(error);
        }
    };

    const interfaceStakingDelayMachineCancelWithdraw = async (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await delayMachineCancelWithdrawVesting(
                    interfaceContext,
                    idWithdraw,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            } else {
                return await delayMachineCancelWithdraw(
                    interfaceContext,
                    idWithdraw,
                    onTransaction,
                    onReceipt
                );
            }
        } catch (error) {
            onError(error);
        }
    };

    const interfaceIncentiveV2Claim = async (
        signDataResponse: string | { signature: string },
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await claimV2(
                interfaceContext,
                signDataResponse,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceStakingUnStake = async (
        amount: bigint,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await unStakeVesting(
                    interfaceContext,
                    amount,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            } else {
                return await unStake(
                    interfaceContext,
                    amount,
                    onTransaction,
                    onReceipt
                );
            }
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVestingWithdraw = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await withdrawAllVesting(
                interfaceContext,
                vestingAddress as `0x${string}`,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVestingVerify = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await vestingVerify(
                interfaceContext,
                vestingAddress as `0x${string}`,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    // OMOC Voting
    const interfaceVotingPreVote = async (
        changeContractAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await preVoteVesting(
                    interfaceContext,
                    changeContractAddress,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            } else {
                return await preVote(
                    interfaceContext,
                    changeContractAddress,
                    onTransaction,
                    onReceipt
                );
            }
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVotingVote = async (
        inFavorAgainst: boolean,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            if (isVestingLoaded() && vestingAddress) {
                return await voteVesting(
                    interfaceContext,
                    inFavorAgainst,
                    vestingAddress as `0x${string}`,
                    onTransaction,
                    onReceipt
                );
            } else {
                return await vote(
                    interfaceContext,
                    inFavorAgainst,
                    onTransaction,
                    onReceipt
                );
            }
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVotingPreVoteStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await preVoteStep(
                interfaceContext,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVotingVoteStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await voteStep(interfaceContext, onTransaction, onReceipt);
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVotingAcceptedStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await acceptedStep(
                interfaceContext,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVotingUnRegister = async (
        changeContractAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await unRegister(
                interfaceContext,
                changeContractAddress,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVetoVote = async (
        proposalAddress: `0x${string}`,
        caIndex: number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await vetoVote(
                interfaceContext,
                proposalAddress,
                caIndex,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    const interfaceVetoWithdraw = async (
        proposalAddress: `0x${string}`,
        tcAddress: `0x${string}`,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: (error: unknown) => void
    ): Promise<unknown> => {
        try {
            const interfaceContext = buildInterfaceContext();
            return await vetoWithdraw(
                interfaceContext,
                proposalAddress,
                tcAddress,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            onError(error);
        }
    };

    return (
        <WalletContext.Provider
            value={{
                vestingOn,
                toggleVesting,
                isConnected,
                isOnCorrectChain,
                address,
                contractsAddress,
                contractsAddressLoaded,
                contractStatusOmoc,
                contractProtocolStatus,
                contractLendingStatus,
                userBalance,
                contractsAddressV1,
                contractProtocolStatusV1,
                userBalanceV1,
                interfaceMintBProV1,
                interfaceMintDocV1,
                interfaceRedeemBProV1,
                interfaceRedeemFreeDocV1,
                interfaceAllowanceMocV1,
                interfaceTransferTokenV1,
                interfaceTransferCoinbaseV1,
                blockNumber,
                offChainPrices,
                priceProvider,
                userBaseCoinBalance,
                vestingAddress,
                publicClient,
                walletClient,
                userVesting,
                userOmocBalance,
                oracleCoinPairs,
                registeredOracles,
                userIncentiveV2,
                userVeto,
                userLending,
                connect,
                disconnect,
                readContractsAddresses,
                interfaceTransferToken,
                interfaceTransferCoinbase,
                interfaceAllowanceAmount,
                interfaceExchangeMethod,
                interfaceAllowUseTokenMigrator,
                interfaceMigrateToken,
                isVestingLoaded,
                interfaceAllowUseRifProMigrator,
                interfaceMigrateRifPro,
                interfaceStakingApprove,
                interfaceStakingAddStake,
                interfaceOracleSubscribeCoinPair,
                interfaceOracleUnsubscribeCoinPair,
                interfaceOracleRegister,
                interfaceOracleRemove,
                interfaceOracleSetName,
                interfaceOracleSetAddress,
                interfaceOracleSwitchRound,
                interfaceStakingDelayMachineWithdraw,
                interfaceStakingDelayMachineCancelWithdraw,
                onShowModalAccount,
                onShowModalAccountVesting,
                onHideModalAccount,
                setVestingMachine,
                interfaceIncentiveV2Claim,
                interfaceStakingUnStake,
                interfaceVestingWithdraw,
                interfaceVestingVerify,
                interfaceVotingPreVote,
                interfaceVotingVote,
                interfaceVotingPreVoteStep,
                interfaceVotingVoteStep,
                interfaceVotingAcceptedStep,
                interfaceVotingUnRegister,
                interfaceVetoVote,
                interfaceVetoWithdraw,
                readUserVesting,
                onShowModalProviders,
                onHideModalProviders,
                // RPC error handling
                rpcError,
                handleRpcError,
                retryConnection,
                clearRpcError,
                isRpcHealthy,
                checkConnectivityNow,
            }}
        >
            {children}
            <ModalAccount
                show={showModalAccount}
                onShow={onShowModalAccount}
                onHide={onHideModalAccount}
                vestingOn={vestingOn}
                setVestingOn={setVestingOn}
            />
            <ModalProviders
                show={showModalProviders}
                onShow={onShowModalProviders}
                onHide={onHideModalProviders}
            />
        </WalletContext.Provider>
    );
}
