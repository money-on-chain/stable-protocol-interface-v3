import React, { createContext, useEffect, useState, ReactNode } from "react";
import getRLogin from "../lib/rLogin";
import Web3 from "web3";
import BigNumber from "bignumber.js";
import PropTypes from "prop-types";

import {
    ApproveTokenContract,
    exchangeMethod,
    TokenContract,
    type InterfaceContext as ExchangeInterfaceContext,
    type DContracts,
} from "../helpers/exchange";

import { readContracts } from "../lib/backend/contracts";
import { contractStatus, userBalance } from "../lib/backend/multicall";
import {
    AllowanceAmount,
    transferTokenTo,
    MigrateToken,
    AllowUseTokenMigrator,
    transferCoinbaseTo,
} from "../lib/backend/moc-base";

import {
    addStake,
    unStake,
    delayMachineWithdraw,
    delayMachineCancelWithdraw,
    approveStakingMachine,
} from "../lib/backend/omoc/staking";

import {
    addStake as addStakeVesting,
    unStake as unStakeVesting,
    delayMachineWithdraw as delayMachineWithdrawVesting,
    delayMachineCancelWithdraw as delayMachineCancelWithdrawVesting,
    approve as approveVesting,
    withdrawAll,
    vestingVerify,
    preVote as preVoteVesting,
    vote as voteVesting,
} from "../lib/backend/omoc/vesting";

import { claimV2 } from "../lib/backend/omoc/incentivev2";

import { getGasPrice } from "../lib/backend/utils";
import ModalAccount from "../components/Modals/Account";
import api from "../services/api";
import {
    loadVestingAddressesFromLocalStorage,
    saveVestingAddressesToLocalStorage,
} from "../helpers/vesting";
import {
    acceptedStep,
    preVote,
    preVoteStep,
    vote,
    voteStep,
    unRegister,
} from "../lib/backend/omoc/voting";

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN });

// Type definitions
interface AccountData {
    Wallet: string;
    Owner: string;
    Balance: number;
    GasPrice: number;
    truncatedAddress: string;
}

interface UserBalanceData {
    CA: Array<{ balance: number; allowance: number }>;
    TP: Array<Array<{ balance: number; allowance: number }>>;
    [key: number]: {
        TC: { balance: number; allowance: number };
        FeeToken: { balance: number; allowance: number };
    };
    TG: { balance: number; allowance: number };
    coinbase: number;
    vestingmachine?: {
        address: string;
        [key: string]: any;
    };
}

interface ContractStatusData {
    tcMintExecCost: string;
    tpMintExecCost: string;
    tpRedeemExecCost: string;
    tcRedeemExecCost: string;
    [key: string]: any;
}

interface RLoginResponse {
    provider: any;
    disconnect: () => void;
}

interface VestingTransaction {
    vesting: string;
    [key: string]: any;
}

interface VestingResponse {
    transactions?: VestingTransaction[];
    [key: string]: any;
}

type OnTransaction = (hash: string) => void;
type OnReceipt = (receipt: any) => void;
type OnError = (error: any) => void;

interface AuthenticateContextType {
    isLoggedIn: boolean;
    account: string | null;
    accountData: AccountData;
    userBalanceData: UserBalanceData | null;
    contractStatusData: ContractStatusData[] | null;
    web3: Web3 | null;
    showModalAccount: boolean;
    web3Error: boolean;
    connect: () => void;
    interfaceAllowanceAmount: (
        currencyYouExchange: string,
        currencyYouReceive: string,
        amountAllowance: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<void>;
    interfaceTransferToken: (
        currencyYouExchange: string,
        amount: string | number,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<void>;
    interfaceTransferCoinbase: (
        amount: string | number,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<void>;
    interfaceExchangeMethod: (
        currencyYouExchange: string,
        currencyYouReceive: string,
        tokenAmount: string | number,
        limitAmount: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ) => Promise<any>;
    disconnect: () => Promise<void>;
    getTransactionReceipt: (hash: string) => Promise<boolean>;
    getSpendableBalance: (address?: string) => Promise<string>;
    getReserveAllowance: (address?: string) => Promise<string>;
    loadContractsStatusAndUserBalance: () => Promise<void>;
    interfaceAllowUseTokenMigrator: (
        amount: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceMigrateToken: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceStakingAddStake: (
        amount: string | number,
        address: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceStakingUnStake: (
        amount: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceStakingDelayMachineWithdraw: (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceStakingDelayMachineCancelWithdraw: (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceStakingApprove: (
        amount: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceVestingWithdraw: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceVestingVerify: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceIncentiveV2Claim: (
        signDataResponse: any,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceVotingPreVote: (
        changeContractAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceVotingVote: (
        inFavorAgainst: boolean,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceVotingPreVoteStep: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceVotingVoteStep: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceVotingAcceptedStep: (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    interfaceVotingUnRegister: (
        changeContractAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ) => Promise<any>;
    isVestingLoaded: () => boolean;
    vestingAddress: () => string | undefined;
    onShowModalAccount: () => void;
    onShowModalAccountVesting: () => void;
}

interface AuthenticateProviderProps {
    children: ReactNode;
}

// Extend Window interface for global variables
declare global {
    interface Window {
        rLogin: any;
        rLoginDisconnect: () => void;
        dContracts: DContracts;
        address: string;
    }
}

const AuthenticateContext = createContext<AuthenticateContextType>({
    isLoggedIn: false,
    account: null,
    accountData: {
        Wallet: "",
        Owner: "",
        Balance: 0,
        GasPrice: 0,
        truncatedAddress: "0x0000..0000",
    },
    userBalanceData: null,
    contractStatusData: null,
    web3: null,
    showModalAccount: false,
    web3Error: false,
    connect: () => {},
    interfaceAllowanceAmount: async () => {},
    interfaceTransferToken: async () => {},
    interfaceTransferCoinbase: async () => {},
    interfaceExchangeMethod: async () => Promise.resolve(),
    disconnect: async () => {},
    getTransactionReceipt: async () => false,
    getSpendableBalance: async () => "",
    getReserveAllowance: async () => "",
    loadContractsStatusAndUserBalance: async () => {},
    interfaceAllowUseTokenMigrator: async () => Promise.resolve(),
    interfaceMigrateToken: async () => Promise.resolve(),
    interfaceStakingAddStake: async () => Promise.resolve(),
    interfaceStakingUnStake: async () => Promise.resolve(),
    interfaceStakingDelayMachineWithdraw: async () => Promise.resolve(),
    interfaceStakingDelayMachineCancelWithdraw: async () => Promise.resolve(),
    interfaceStakingApprove: async () => Promise.resolve(),
    interfaceVestingWithdraw: async () => Promise.resolve(),
    interfaceVestingVerify: async () => Promise.resolve(),
    interfaceIncentiveV2Claim: async () => Promise.resolve(),
    interfaceVotingPreVote: async () => Promise.resolve(),
    interfaceVotingVote: async () => Promise.resolve(),
    interfaceVotingPreVoteStep: async () => Promise.resolve(),
    interfaceVotingVoteStep: async () => Promise.resolve(),
    interfaceVotingAcceptedStep: async () => Promise.resolve(),
    interfaceVotingUnRegister: async () => Promise.resolve(),
    isVestingLoaded: () => false,
    vestingAddress: () => undefined,
    onShowModalAccount: () => {},
    onShowModalAccountVesting: () => {},
});

const AuthenticateProvider: React.FC<AuthenticateProviderProps> = ({ children }) => {
    const [contractStatusData, setContractStatusData] = useState<ContractStatusData[] | null>(null);
    const [web3, setWeb3] = useState<Web3 | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [account, setAccount] = useState<string | null>(null);
    const [userBalanceData, setUserBalanceData] = useState<UserBalanceData | null>(null);
    const [accountData, setAccountData] = useState<AccountData>({
        Wallet: "",
        Owner: "",
        Balance: 0,
        GasPrice: 0,
        truncatedAddress: "0x0000..0000",
    });
    const [showModalAccount, setShowModalAccount] = useState<boolean>(false);
    const [vestingOn, setVestingOn] = useState<boolean>(false);
    const [web3Error, setWeb3Error] = useState<boolean>(false);

    async function loadCss(): Promise<void> {
        // let css_logout = await import("../assets/css/logout.scss");
    }

    useEffect(() => {
        if (!window.rLogin) {
            window.rLogin = getRLogin(
                import.meta.env.REACT_APP_ENVIRONMENT_CHAIN_ID
            );
            if (window.rLogin.cachedProvider) {
                connect();
            } else {
                connect();
                disableLogin();
            }
        }
    });

    const disableLogin = (): void => {
        const modalHitbox = document.querySelectorAll(".rlogin-modal-hitbox")[0];
        if (modalHitbox) {
            modalHitbox.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
        loadCss();
    };

    useEffect(() => {
        if (account) {
            initContractsConnection();
            loadAccountData();
        }
    }, [account]);

    useEffect(() => {
        const interval = setInterval(
            () => {
                if (account) {
                    loadContractsStatusAndUserBalance();
                }
            },
            import.meta.env.REACT_APP_WAIT_REFRESH_BLOCKCHAIN
        );
        return () => clearInterval(interval);
    }, [account]);

    const connect = (): void => {
        window.rLogin
            .connect()
            .then((rLoginResponse: RLoginResponse) => {
                const { provider, disconnect } = rLoginResponse;

                const web3Instance = new Web3(provider);
                provider.on("accountsChanged", function () {
                    disconnect();
                    window.location.reload();
                });
                provider.on("chainChanged", function () {
                    disconnect();
                    window.location.reload();
                });

                setWeb3(web3Instance);
                window.rLoginDisconnect = disconnect;

                // request user's account
                provider
                    .request({ method: "eth_accounts" })
                    .then((accounts: string[]) => {
                        const [accountAddress] = accounts;
                        setAccount(accountAddress);
                        setIsLoggedIn(true);
                    });
            })
            .catch((e: Error) => {
                console.error(e);
            });
    };

    const disconnect = async (): Promise<void> => {
        setAccount(null);
        setAccountData({
            Wallet: "",
            Owner: "",
            Balance: 0,
            GasPrice: 0,
            truncatedAddress: "",
        });
        setUserBalanceData(null);
        setIsLoggedIn(false);
        if (window?.rLoginDisconnect) {
            await window.rLoginDisconnect();
        }
        connect();
        disableLogin();
    };

    const buildInterfaceContext = (): ExchangeInterfaceContext => {
        return {
            web3,
            contractStatusData,
            userBalanceData,
            account,
        };
    };

    const interfaceAllowanceAmount = async (
        currencyYouExchange: string,
        currencyYouReceive: string,
        amountAllowance: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<void> => {
        if (!window.dContracts) return;

        const approveInfo = ApproveTokenContract(
            window.dContracts,
            currencyYouExchange,
            currencyYouReceive
        );
        if (approveInfo.token) {
            const interfaceContext = buildInterfaceContext();
            await AllowanceAmount(
                interfaceContext,
                approveInfo.token,
                approveInfo.contractAllow,
                amountAllowance,
                approveInfo.decimals,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceTransferToken = async (
        currencyYouExchange: string,
        amount: string | number,
        destinationAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<void> => {
        if (!window.dContracts) return;

        const tContract = TokenContract(window.dContracts, currencyYouExchange);
        if (tContract.token) {
            const interfaceContext = buildInterfaceContext();
            await transferTokenTo(
                interfaceContext,
                tContract.token,
                tContract.decimals,
                destinationAddress,
                amount,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceTransferCoinbase = async (
        amount: string | number,
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

    const interfaceExchangeMethod = async (
        currencyYouExchange: string,
        currencyYouReceive: string,
        tokenAmount: string | number,
        limitAmount: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return exchangeMethod(
            interfaceContext,
            currencyYouExchange,
            currencyYouReceive,
            tokenAmount,
            limitAmount,
            onTransaction,
            onReceipt
        );
    };

    const interfaceAllowUseTokenMigrator = async (
        amount: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
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
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return MigrateToken(
            interfaceContext,
            onTransaction,
            onReceipt,
            onError
        );
    };

    const initContractsConnection = async (): Promise<void> => {
        let error = false;

        try {
            window.dContracts = await readContracts(web3);
        } catch (e) {
            console.error(e);
            error = true;
        }

        if (!error) {
            await loadContractsStatusAndUserBalance();
        } else {
            setWeb3Error(true);
        }
    };

    const loadContractsStatusAndUserBalance = async (): Promise<void> => {
        if (!window.dContracts) return;

        let error = false;
        let dataContractStatus: ContractStatusData[] | undefined;
        let accountBalance: UserBalanceData | undefined;

        try {
            dataContractStatus = await contractStatus(web3, window.dContracts);
        } catch (e) {
            console.error(e);
            error = true;
        }

        try {
            accountBalance = await userBalance(
                web3,
                window.dContracts,
                account
            );
        } catch (e) {
            console.error(e);
            error = true;
        }

        if (!error && dataContractStatus && accountBalance) {
            setContractStatusData(dataContractStatus);
            setUserBalanceData(accountBalance);
        } else {
            setWeb3Error(true);
        }
    };

    const loadAccountData = async (): Promise<void> => {
        const owner = await getAccount();
        const truncateAddress =
            owner.substring(0, 6) +
            "..." +
            owner.substring(owner.length - 4, owner.length);
        const newAccountData: AccountData = {
            Wallet: account!,
            Owner: owner,
            Balance: await getBalance(account!),
            GasPrice: await interfaceGasPrice(),
            truncatedAddress: truncateAddress,
        };

        window.address = owner;
        setAccountData(newAccountData);
        onAfterLoadAccountData();
    };

    const onAfterLoadAccountData = (): void => {
        readUserVesting();
    };

    const saveUserVesting = (response: VestingResponse): void => {
        if (
            response.transactions !== undefined &&
            response.transactions.length > 0
        ) {
            const vFromStorage = loadVestingAddressesFromLocalStorage(
                window.address
            );
            let vLowerFromStorage = vFromStorage.map((v: string) => v.toLowerCase());

            const newVesting: string[] = [];
            response.transactions.forEach((data) => {
                if (!vLowerFromStorage.includes(data.vesting.toLowerCase())) {
                    newVesting.push(data.vesting.toLowerCase());
                }
            });

            if (newVesting.length > 0) {
                vLowerFromStorage.push(...newVesting);
                saveVestingAddressesToLocalStorage(
                    window.address,
                    vLowerFromStorage
                );
            }
        }
    };

    const readUserVesting = (): void => {
        const baseUrl = `${import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS}omoc/vesting_created/`;
        const queryParams = new URLSearchParams({
            holder: window.address,
            limit: "20",
            skip: "0",
        }).toString();
        const url = `${baseUrl}?${queryParams}`;

        api("get", url)
            .then((response: VestingResponse) => {
                saveUserVesting(response);
            })
            .catch((error: Error) => {
                console.error(error);
            });
    };

    const getAccount = async (): Promise<string> => {
        const [owner] = await web3!.eth.getAccounts();
        return owner;
    };

    const getBalance = async (address: string): Promise<number> => {
        try {
            let balance = await web3!.eth.getBalance(address);
            const balanceInEther = web3!.utils.fromWei(balance, "ether");
            return parseFloat(balanceInEther);
        } catch (e) {
            console.log(e);
            return 0;
        }
    };

    const getSpendableBalance = async (address?: string): Promise<string> => {
        const from = address || account!;
        const balance = await web3!.eth.getBalance(from);
        return balance.toString();
    };

    const getReserveAllowance = async (address?: string): Promise<string> => {
        const from = address || account!;
        const balance = await web3!.eth.getBalance(from);
        return balance.toString();
    };

    const getTransactionReceipt = async (hash: string): Promise<boolean> => {
        let transactionReceipt = false;
        let transaction = await web3!.eth.getTransactionReceipt(hash);
        if (transaction) {
            transactionReceipt = true;
        }
        return transactionReceipt;
    };

    const interfaceGasPrice = async (): Promise<number> => {
        return getGasPrice(web3!);
    };

    const onShowModalAccount = (): void => {
        setShowModalAccount(true);
    };

    const onShowModalAccountVesting = (): void => {
        setVestingOn(true);
        setShowModalAccount(true);
    };

    const onHideModalAccount = (): void => {
        setShowModalAccount(false);
    };

    // OMOC methods
    const interfaceStakingApprove = async (
        amount: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return approveVesting(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt
            );
        } else {
            return approveStakingMachine(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceStakingAddStake = async (
        amount: string | number,
        address: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const from = address || account!;
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return addStakeVesting(
                interfaceContext,
                amount,
                from,
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

    const interfaceStakingDelayMachineWithdraw = async (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return delayMachineWithdrawVesting(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt
            );
        } else {
            return delayMachineWithdraw(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceStakingDelayMachineCancelWithdraw = async (
        idWithdraw: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return delayMachineCancelWithdrawVesting(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt
            );
        } else {
            return delayMachineCancelWithdraw(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceIncentiveV2Claim = async (
        signDataResponse: any,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return claimV2(
            interfaceContext,
            signDataResponse,
            onTransaction,
            onReceipt
        );
    };

    const isVestingLoaded = (): boolean => {
        return !!(
            userBalanceData &&
            typeof userBalanceData.vestingmachine !== "undefined"
        );
    };

    const vestingAddress = (): string | undefined => {
        if (isVestingLoaded()) {
            return userBalanceData!.vestingmachine!.address;
        }
        return undefined;
    };

    const interfaceStakingUnStake = async (
        amount: string | number,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return unStakeVesting(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt
            );
        } else {
            return unStake(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceVestingWithdraw = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return withdrawAll(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVestingVerify = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return vestingVerify(
            interfaceContext,
            onTransaction,
            onReceipt
        );
    };

    // OMOC Voting
    const interfaceVotingPreVote = async (
        changeContractAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return preVoteVesting(
                interfaceContext,
                changeContractAddress,
                onTransaction,
                onReceipt
            );
        } else {
            return preVote(
                interfaceContext,
                changeContractAddress,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceVotingVote = async (
        inFavorAgainst: boolean,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return voteVesting(
                interfaceContext,
                inFavorAgainst,
                onTransaction,
                onReceipt
            );
        } else {
            return vote(
                interfaceContext,
                inFavorAgainst,
                onTransaction,
                onReceipt
            );
        }
    };

    const interfaceVotingPreVoteStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return preVoteStep(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVotingVoteStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return voteStep(interfaceContext, onTransaction, onReceipt);
    };

    const interfaceVotingAcceptedStep = async (
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return acceptedStep(
            interfaceContext,
            onTransaction,
            onReceipt
        );
    };

    const interfaceVotingUnRegister = async (
        changeContractAddress: string,
        onTransaction: OnTransaction,
        onReceipt: OnReceipt,
        onError: OnError
    ): Promise<any> => {
        const interfaceContext = buildInterfaceContext();
        return unRegister(
            interfaceContext,
            changeContractAddress,
            onTransaction,
            onReceipt
        );
    };

    return (
        <AuthenticateContext.Provider
            value={{
                account,
                accountData,
                userBalanceData,
                contractStatusData,
                isLoggedIn,
                web3,
                web3Error,
                showModalAccount,
                connect,
                disconnect,
                interfaceAllowanceAmount,
                interfaceTransferToken,
                interfaceTransferCoinbase,
                interfaceExchangeMethod,
                getTransactionReceipt,
                getSpendableBalance,
                getReserveAllowance,
                loadContractsStatusAndUserBalance,
                interfaceAllowUseTokenMigrator,
                interfaceMigrateToken,
                interfaceStakingApprove,
                interfaceStakingAddStake,
                interfaceStakingUnStake,
                interfaceStakingDelayMachineWithdraw,
                interfaceStakingDelayMachineCancelWithdraw,
                isVestingLoaded,
                vestingAddress,
                interfaceVestingWithdraw,
                interfaceVestingVerify,
                interfaceIncentiveV2Claim,
                onShowModalAccount,
                onShowModalAccountVesting,
                interfaceVotingPreVote,
                interfaceVotingVote,
                interfaceVotingPreVoteStep,
                interfaceVotingVoteStep,
                interfaceVotingAcceptedStep,
                interfaceVotingUnRegister,
            }}
        >
            {children}
            <ModalAccount
                truncatedAddress={accountData.truncatedAddress}
                show={showModalAccount}
                onShow={onShowModalAccount}
                onHide={onHideModalAccount}
                vestingOn={vestingOn}
                setVestingOn={setVestingOn}
            />
        </AuthenticateContext.Provider>
    );
};

export { AuthenticateContext, AuthenticateProvider };

AuthenticateProvider.propTypes = {
    children: PropTypes.node as any,
}; 