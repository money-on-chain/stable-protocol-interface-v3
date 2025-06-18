import React, { createContext, useEffect, useState } from "react";
import getRLogin from "../lib/rLogin";
import Web3 from "web3";
import BigNumber from "bignumber.js";
import PropTypes from "prop-types";

import {
    ApproveTokenContract,
    exchangeMethod,
    TokenContract,
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
    //withdraw,
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

const AuthenticateContext = createContext({
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
    interfaceAllowanceAmount: async () =>
        /*currencyYouExchange,
        currencyYouReceive,
        amountAllowance,
        onTransaction,
        onReceipt*/
        {},
    interfaceTransferToken: async () =>
        /*currencyYouExchange,
        amount,
        destinationAddress,
        onTransaction,
        onReceipt*/
        {},
    interfaceTransferCoinbase: async () =>
        /*amount,
        destinationAddress,
        onTransaction,
        onReceipt*/
        {},
    interfaceExchangeMethod: async () =>
        /*currencyYouExchange,
        currencyYouReceive,
        tokenAmount,
        limitAmount,
        onTransaction,
        onReceipt*/
        {},
    disconnect: () => {},
    getTransactionReceipt: (/*hash*/) => {},
    //getSpendableBalance: async (address) => {},
    loadContractsStatusAndUserBalance: async (/*address*/) => {},
    //getReserveAllowance: async (address) => {},
    interfaceAllowUseTokenMigrator: async () =>
        /*amount,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceMigrateToken: async (/*onTransaction, onReceipt, onError*/) => {},
    //OMOC methods
    interfaceStakingAddStake: async () =>
        /*amount,
        address,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceStakingUnStake: async () =>
        /*amount,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceStakingDelayMachineWithdraw: async () =>
        /*idWithdraw,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceStakingDelayMachineCancelWithdraw: async () =>
        /*idWithdraw,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceStakingApprove: async () =>
        /*amount,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceVestingWithdraw: async () =>
        /*amount,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceVestingVerify: async (/*onTransaction, onReceipt, onError*/) => {},
    interfaceIncentiveV2Claim: async () =>
        /*signDataResponse,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceVotingPreVote: async () =>
        /*changeContractAddress,
        onTransaction,
        onReceipt,
        onError*/
        {},
    /*interfaceVotingUnregister: async (
        changeContractAddress,
        onTransaction,
        onReceipt,
        onError
    ) => {},*/
    interfaceVotingVote: async () =>
        /*inFavorAgainst,
        onTransaction,
        onReceipt,
        onError*/
        {},
    interfaceVotingPreVoteStep:
        async (/*onTransaction, onReceipt, onError*/) => {},
    interfaceVotingVoteStep:
        async (/*onTransaction, onReceipt, onError*/) => {},
    interfaceVotingAcceptedStep: async () =>
        /*
        onTransaction,
        onReceipt,
        onError*/
        {},
    isVestingLoaded: () => {},
    vestingAddress: () => {},
    onShowModalAccount: () => {},
    onShowModalAccountVesting: () => {},
});

const AuthenticateProvider = ({ children }) => {
    const [contractStatusData, setContractStatusData] = useState(null);
    //const [provider, setProvider] = useState(null);
    const [web3, setWeb3] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [account, setAccount] = useState(null);
    const [userBalanceData, setUserBalanceData] = useState(null);
    const [accountData, setAccountData] = useState({
        Wallet: "",
        Owner: "",
        Balance: 0,
        GasPrice: 0,
        truncatedAddress: "0x0000..0000",
    });
    const [showModalAccount, setShowModalAccount] = useState(false);
    const [vestingOn, setVestingOn] = useState(false);
    const [web3Error, setWeb3Error] = useState(false);

    async function loadCss() {
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

    const disableLogin = () => {
        document
            .querySelectorAll(".rlogin-modal-hitbox")[0]
            .addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
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

    const connect = () =>
        window.rLogin
            .connect()
            .then((rLoginResponse) => {
                const { provider, disconnect } = rLoginResponse;
                //setProvider(provider);

                const web3 = new Web3(provider);
                provider.on("accountsChanged", function (/*accounts*/) {
                    disconnect();
                    window.location.reload();
                    /*if ( accounts.length==0 ){
                    disconnect()
                    window.location.reload()
                }*/
                });
                provider.on("chainChanged", function (/*accounts*/) {
                    disconnect();
                    window.location.reload();
                });

                setWeb3(web3);
                window.rLoginDisconnect = disconnect;

                // request user's account
                provider
                    .request({ method: "eth_accounts" })
                    .then(([account]) => {
                        setAccount(account);
                        setIsLoggedIn(true);
                    });
            })
            .catch((e) => {
                disconnect();
                console.error(e);
            });

    const disconnect = async () => {
        await disconnect;
        //setProvider(null);
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
            await window?.rLoginDisconnect();
        }
        connect();
        disableLogin();
    };

    const buildInterfaceContext = () => {
        return {
            web3,
            contractStatusData,
            userBalanceData,
            account,
        };
    };

    const interfaceAllowanceAmount = async (
        currencyYouExchange,
        currencyYouReceive,
        amountAllowance,
        onTransaction,
        onReceipt
    ) => {
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
        currencyYouExchange,
        amount,
        destinationAddress,
        onTransaction,
        onReceipt
    ) => {
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
        amount,
        destinationAddress,
        onTransaction,
        onReceipt
    ) => {
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
        currencyYouExchange,
        currencyYouReceive,
        tokenAmount,
        limitAmount,
        onTransaction,
        onReceipt
    ) => {
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
        amount,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        return AllowUseTokenMigrator(
            interfaceContext,
            amount,
            onTransaction,
            onReceipt,
            onError
        );
    };

    const interfaceMigrateToken = async (onTransaction, onReceipt, onError) => {
        const interfaceContext = buildInterfaceContext();
        return MigrateToken(
            interfaceContext,
            onTransaction,
            onReceipt,
            onError
        );
    };

    const initContractsConnection = async () => {
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

    const loadContractsStatusAndUserBalance = async () => {
        if (!window.dContracts) return;

        // Read info from different contract
        // in one call through Multicall

        let error = false;
        let dataContractStatus;
        let accountBalance;

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

        if (!error) {
            setContractStatusData(dataContractStatus);
            setUserBalanceData(accountBalance);
        } else {
            setWeb3Error(true);
        }
    };

    const loadAccountData = async () => {
        const owner = await getAccount();
        const truncateAddress =
            owner.substring(0, 6) +
            "..." +
            owner.substring(owner.length - 4, owner.length);
        const accountData = {
            Wallet: account,
            Owner: owner,
            Balance: await getBalance(account),
            GasPrice: await interfaceGasPrice(),
            truncatedAddress: truncateAddress,
        };

        window.address = owner;
        setAccountData(accountData);
        onAfterLoadAccountData();
    };

    const onAfterLoadAccountData = () => {
        readUserVesting();
    };

    const saveUserVesting = (response) => {
        if (
            response.transactions !== undefined &&
            response.transactions.length > 0
        ) {
            const vFromStorage = loadVestingAddressesFromLocalStorage(
                window.address
            );
            let vLowerFromStorage = vFromStorage.map((v) => v.toLowerCase());

            const newVesting = [];
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

    const readUserVesting = () => {
        const baseUrl = `${import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS}omoc/vesting_created/`;
        const queryParams = new URLSearchParams({
            holder: window.address,
            limit: 20,
            skip: 0,
        }).toString();
        const url = `${baseUrl}?${queryParams}`;

        api("get", url)
            .then((response) => {
                saveUserVesting(response);
            })
            .catch((error) => {
                console.error(error);
            });
    };

    const getAccount = async () => {
        const [owner] = await web3.eth.getAccounts();
        return owner;
    };
    const getBalance = async (address) => {
        try {
            let balance = await web3.eth.getBalance(address);
            balance = web3.utils.fromWei(balance, "ether");
            return balance;
        } catch (e) {
            console.log(e);
        }
    };

    const getSpendableBalance = async (address) => {
        const from = address || account;
        return await web3.eth.getBalance(from);
    };

    const getReserveAllowance = async (address) => {
        const from = address || account;
        return await web3.eth.getBalance(from);
    };

    const getTransactionReceipt = async (hash /*, callback*/) => {
        //const web3 = new Web3(provider);
        let transactionReceipt = false;
        let transaction = await web3.eth.getTransactionReceipt(hash);
        if (transaction) {
            transactionReceipt = true;
        }
        return transactionReceipt;
    };

    const interfaceGasPrice = async () => {
        return getGasPrice(web3);
    };

    const onShowModalAccount = () => {
        setShowModalAccount(true);
    };

    const onShowModalAccountVesting = () => {
        setVestingOn(true);
        setShowModalAccount(true);
    };

    const onHideModalAccount = () => {
        setShowModalAccount(false);
    };

    // OMOC

    const interfaceStakingApprove = async (
        amount,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return approveVesting(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt,
                onError
            );
        } else {
            return approveStakingMachine(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt,
                onError
            );
        }
    };

    const interfaceStakingAddStake = async (
        amount,
        address,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const from = address || account;
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return addStakeVesting(
                interfaceContext,
                amount,
                from,
                onTransaction,
                onReceipt,
                onError
            );
        } else {
            return addStake(
                interfaceContext,
                amount,
                from,
                onTransaction,
                onReceipt,
                onError
            );
        }
    };

    const interfaceStakingDelayMachineWithdraw = async (
        idWithdraw,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return delayMachineWithdrawVesting(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt,
                onError
            );
        } else {
            return delayMachineWithdraw(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt,
                onError
            );
        }
    };

    const interfaceStakingDelayMachineCancelWithdraw = async (
        idWithdraw,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return delayMachineCancelWithdrawVesting(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt,
                onError
            );
        } else {
            return delayMachineCancelWithdraw(
                interfaceContext,
                idWithdraw,
                onTransaction,
                onReceipt,
                onError
            );
        }
    };

    //  Incentive V2
    const interfaceIncentiveV2Claim = async (
        signDataResponse,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        return claimV2(
            interfaceContext,
            signDataResponse,
            onTransaction,
            onReceipt,
            onError
        );
    };

    const isVestingLoaded = () => {
        return !!(
            userBalanceData &&
            typeof userBalanceData.vestingmachine !== "undefined"
        );
    };

    const vestingAddress = () => {
        if (isVestingLoaded()) {
            return userBalanceData.vestingmachine.address;
        }
    };

    const interfaceStakingUnStake = async (
        amount,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return unStakeVesting(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt,
                onError
            );
        } else {
            return unStake(
                interfaceContext,
                amount,
                onTransaction,
                onReceipt,
                onError
            );
        }
    };

    const interfaceVestingWithdraw = async (
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        return withdrawAll(interfaceContext, onTransaction, onReceipt, onError);
    };

    const interfaceVestingVerify = async (
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        return vestingVerify(
            interfaceContext,
            onTransaction,
            onReceipt,
            onError
        );
    };

    // OMOC Voting
    const interfaceVotingPreVote = async (
        changeContractAddress,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return preVoteVesting(
                interfaceContext,
                changeContractAddress,
                onTransaction,
                onReceipt,
                onError
            );
        } else {
            return preVote(
                interfaceContext,
                changeContractAddress,
                onTransaction,
                onReceipt,
                onError
            );
        }
    };

    const interfaceVotingVote = async (
        inFavorAgainst,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        if (isVestingLoaded()) {
            return voteVesting(
                interfaceContext,
                inFavorAgainst,
                onTransaction,
                onReceipt,
                onError
            );
        } else {
            return vote(
                interfaceContext,
                inFavorAgainst,
                onTransaction,
                onReceipt,
                onError
            );
        }
    };

    const interfaceVotingPreVoteStep = async (
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        return preVoteStep(interfaceContext, onTransaction, onReceipt, onError);
    };

    const interfaceVotingVoteStep = async (
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        return voteStep(interfaceContext, onTransaction, onReceipt, onError);
    };

    const interfaceVotingAcceptedStep = async (
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        return acceptedStep(
            interfaceContext,
            onTransaction,
            onReceipt,
            onError
        );
    };

    const interfaceVotingUnRegister = async (
        changeContractAddress,
        onTransaction,
        onReceipt,
        onError
    ) => {
        const interfaceContext = buildInterfaceContext();
        return unRegister(
            interfaceContext,
            changeContractAddress,
            onTransaction,
            onReceipt,
            onError
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
            ></ModalAccount>
        </AuthenticateContext.Provider>
    );
};

export { AuthenticateContext, AuthenticateProvider };

AuthenticateProvider.propTypes = {
    children: PropTypes.object,
};
