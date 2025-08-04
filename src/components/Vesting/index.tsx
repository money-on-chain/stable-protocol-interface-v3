import React, { useContext, useEffect, useState } from "react";
import { Input } from "antd";
import BigNumber from "bignumber.js";

import VestingSchedule from "../../components/Tables/VestingSchedule";
import settings from "../../settings/settings.json";
import { useProjectTranslation } from "../../helpers/translations";
import { AuthenticateContext } from "../../context/Auth";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { formatTimestamp } from "../../helpers/staking";
import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import UseVestingAlert from "../Notification/UsingVestingAlert";
import {
    loadVesting,
    loadVestingAddressesFromLocalStorage,
    saveDefaultVestingToLocalStorage,
    saveVestingAddressesToLocalStorage,
    onValidateVestingAddress,
} from "../../helpers/vesting";
import { decodeEvents } from "../../backend/transaction";
import "./Styles.scss";

const { TextArea } = Input;
const space: string = "\u00A0";

interface VestedAmounts {
    released: BigNumber;
    vested: BigNumber;
    total: BigNumber;
    daysToRelease: number;
}

interface VestingParameters {
    percentages: (string | number)[];
    timeDeltas: (string | number)[];
}

interface VestingMachine {
    getAvailable: string | number;
    isVerified: boolean;
    getHolder: string;
    getTotal: string | number;
    getLocked: string | number;
    getParameters: VestingParameters;
    staking: {
        balance: string | number;
    };
    delay: {
        balance: string | number;
    };
}

interface VestingFactory {
    getTGETimestamp: string | number;
}

interface IncentiveV2 {
    userBalance: string | number;
}

interface UserBalanceData {
    vestingmachine: VestingMachine;
    vestingfactory: VestingFactory;
    incentiveV2: IncentiveV2;
}

interface AccountData {
    Wallet: string;
}

interface AuthContext {
    userBalanceData: UserBalanceData;
    isVestingLoaded: () => boolean;
    vestingAddress: () => string;
    accountData: AccountData;
    interfaceVestingWithdraw: (
        onTransaction: (txHash: string) => void,
        onReceipt: () => void,
        onError: (error: any) => void
    ) => Promise<any>;
    interfaceVestingVerify: (
        onTransaction: (txHash: string) => void,
        onReceipt: () => void,
        onError: (error: any) => void
    ) => Promise<any>;
    onShowModalAccountVesting: () => void;
    loadContractsStatusAndUserBalance: () => Promise<any>;
    interfaceIncentiveV2Claim: (
        claimCode: string,
        onTransaction: (txHash: string) => void,
        onReceipt: (receipt: any) => void,
        onError: (error: any) => void
    ) => Promise<any>;
    web3: {
        eth: {
            accounts: {
                recover: (message: string, signature: string) => string;
            };
            getTransactionReceipt: (hash: string) => Promise<any>;
        };
    };
}

interface FilteredEvent {
    eventName: string;
    args: Record<string, any>;
}

const Vesting: React.FC = () => {
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext) as AuthContext;

    const [status, setStatus] = useState<string>("STEP_1");
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);
    const [txHash, setTxHash] = useState<string>("");
    const [operationStatus, setOperationStatus] = useState<string>("sign");
    const [modalTitle, setModalTitle] = useState<string>("Operation status");
    const [usingVestingAddress, setUsingVestingAddress] = useState<string>("");
    const [validWithdraw, setValidWithdraw] = useState<boolean>(false);
    const [claimCode, setClaimCode] = useState<string>("");
    const [validClaimCode, setValidClaimCode] = useState<boolean>(false);
    const [validClaimCodeError, setValidClaimCodeError] = useState<string>("");
    const [validCreateVM, setValidCreateVM] = useState<boolean>(false);
    const [newVestingAddress, setNewVestingAddress] = useState<string>("");
    const [isHolderVesting, setIsHolderVesting] = useState<boolean>(false);

    useEffect(() => {
        if (auth.userBalanceData && auth.isVestingLoaded()) {
            setStatus("LOADED");
            setUsingVestingAddress(auth.vestingAddress());
            onValidateWithdraw();
            onCheckIsHolderVesting();
        } else {
            // Reset in case the previous status is Loaded, this occurs when switch off vesting in account
            if (status === "LOADED") setStatus("STEP_1");
        }

        // Validate incentive user balance
        onValidateIncentiveV2UserBalance();
    }, [auth]);

    useEffect(() => {
        onValidateClaimCode();
    }, [claimCode]);

    /*
    const truncateAddress = (address: string): string => {
        return (
            address.substring(0, 6) +
            "..." +
            address.substring(address.length - 4, address.length)
        );
    };*/

    const onValidateWithdraw = (): void => {
        if (!getIsHolderVesting()) {
            setValidWithdraw(false);
            return;
        }
        const availableForWithdraw = new BigNumber(
            auth.userBalanceData.vestingmachine.getAvailable
        );
        if (availableForWithdraw.gt(new BigNumber(0))) {
            if (auth.userBalanceData.vestingmachine.isVerified) {
                setValidWithdraw(true);
            } else {
                setValidWithdraw(false);
            }
        } else {
            setValidWithdraw(false);
        }
    };

    const getIsHolderVesting = (): boolean => {
        return (
            auth.userBalanceData.vestingmachine.getHolder.toLowerCase() ===
            auth.accountData.Wallet.toLowerCase()
        );
    };

    const onCheckIsHolderVesting = (): void => {
        const isHolder = getIsHolderVesting();
        setIsHolderVesting(isHolder);
    };

    const vestedAmounts = (): VestedAmounts => {
        const amounts: VestedAmounts = {
            released: new BigNumber(0),
            vested: new BigNumber(0),
            total: new BigNumber(0),
            daysToRelease: 0,
        };

        if (!auth.isVestingLoaded()) {
            return amounts;
        }

        const getParameters = auth.userBalanceData.vestingmachine.getParameters;
        const tgeTimestamp =
            auth.userBalanceData.vestingfactory.getTGETimestamp;
        const total = auth.userBalanceData.vestingmachine.getTotal;
        const lockedAmount = auth.userBalanceData.vestingmachine.getLocked;
        const percentMultiplier = 10000;
        const percentages = getParameters.percentages;
        const timeDeltas = getParameters.timeDeltas;
        const deltas = [...timeDeltas];

        if (timeDeltas && !new BigNumber(timeDeltas[0]).isZero()) {
            deltas.unshift(new BigNumber(0));
        }

        if (new BigNumber(percentages[0]).lt(percentMultiplier)) {
            percentages.unshift(BigInt(10000));
        }

        if (percentages && percentages.length > 0)
            percentages[percentages.length - 1] = 0;

        const percents = percentages.map((x) =>
            new BigNumber(percentMultiplier).minus(x)
        );

        let dates: (string | number)[] = [];
        if (deltas) {
            if (tgeTimestamp) {
                // Convert timestamp to date.
                dates = deltas.map((x) =>
                    formatTimestamp(
                        new BigNumber(tgeTimestamp)
                            .plus(x)
                            .times(1000)
                            .toNumber()
                    )
                );
            } else {
                dates = deltas.map((x) => x / 60 / 60 / 24);
            }
        }

        //let vestedAmount = new BigNumber(0);
        //let releasedAmount = new BigNumber(0);
        let daysToRelease = 0;
        let countVested = 0;

        auth.userBalanceData &&
            getParameters &&
            percents.forEach(function (percent, itemIndex) {
                const date_release = new Date(dates[itemIndex] as string);
                const date_now = new Date();
                const timeDifference =
                    date_release.getTime() - date_now.getTime();
                const dayLefts = Math.round(
                    timeDifference / (1000 * 3600 * 24)
                );

                /*let amount = new BigNumber(0);
                if (total && !new BigNumber(total).isZero()) {
                    amount = new BigNumber(percent)
                        .times(total)
                        .div(percentMultiplier);
                }*/

                if (dayLefts > 0) {
                    //vestedAmount = amount;
                    if (countVested === 0) {
                        daysToRelease = dayLefts;
                        countVested += 1;
                    }
                } else {
                    //releasedAmount = amount;
                }
            });

        amounts.released = new BigNumber(total).minus(
            new BigNumber(lockedAmount)
        );
        amounts.vested = lockedAmount;
        amounts.total = total;
        amounts.daysToRelease = daysToRelease;

        return amounts;
    };

    const vestingTotals: VestedAmounts = vestedAmounts();

    const onWithdraw = async (e: React.MouseEvent): Promise<void> => {
        setModalTitle("Withdraw transaction");

        e.stopPropagation();

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction withdraw...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (): void => {
            console.log("Transaction withdraw mined!...");
            setOperationStatus("success");
        };
        const onError = (error: any): void => {
            console.log("Transaction withdraw error!...:", error);
            setOperationStatus("error");
        };

        await auth
            .interfaceVestingWithdraw(onTransaction, onReceipt, onError)
            .then((/*res*/) => {
                // Refresh status
                auth.loadContractsStatusAndUserBalance().then((/*value*/) => {
                    console.log("Refresh user balance OK!");
                });
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const onVerify = async (e: React.MouseEvent): Promise<void> => {
        e.stopPropagation();

        setModalTitle("Verification transaction");

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction verify...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (): void => {
            console.log("Transaction verify mined!...");
            setOperationStatus("success");
        };
        const onError = (error: any): void => {
            console.log("Transaction verify error!...:", error);
            setOperationStatus("error");
        };

        await auth
            .interfaceVestingVerify(onTransaction, onReceipt, onError)
            .then((/*res*/) => {
                // Refresh status
                auth.loadContractsStatusAndUserBalance().then((/*value*/) => {
                    console.log("Refresh user balance OK!");
                });
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const onDisplayAccount = (): void => {
        auth.onShowModalAccountVesting();
    };

    const onValidateIncentiveV2UserBalance = (): void => {
        let valid = false;
        if (
            auth.userBalanceData &&
            typeof auth.userBalanceData.incentiveV2 !== "undefined"
        ) {
            if (
                new BigNumber(auth.userBalanceData.incentiveV2.userBalance).gt(
                    new BigNumber(0)
                )
            ) {
                valid = true;
            }
        }
        setValidCreateVM(valid);
    };

    const onClickUseClaimCode = (): void => {
        setStatus("STEP_2");
    };

    const onChangeClaimCode = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
        setClaimCode(event.target.value.substring(0, 132));
    };

    const recoverMessageClaimCode = (message: string): string => {
        const chainId = import.meta.env.REACT_APP_ENVIRONMENT_CHAIN_ID;
        const userAddress = auth.accountData.Wallet;
        const fromAddress = userAddress.slice(2);
        const code = `:OMoC:${chainId}:address:${fromAddress}`;

        let recoveredAddress = "";

        try {
            recoveredAddress = auth.web3.eth.accounts.recover(code, message);
        } catch (err) {
            console.error(err);
        }

        return recoveredAddress.toLowerCase();
    };

    const onValidateClaimCode = (): void => {
        let valid = false;

        if (claimCode.length === 132) {
            const claimAddress = recoverMessageClaimCode(claimCode);
            if (claimAddress === auth.accountData.Wallet.toLowerCase())
                valid = true;
        }

        if (!valid && claimCode === "") {
            setValidClaimCode(false);
            setValidClaimCodeError("");
        } else if (!valid) {
            setValidClaimCode(false);
            setValidClaimCodeError(
                t("vesting.vestingOnboarding.page2.feedback.notValid")
            );
        } else {
            setValidClaimCode(true);
            setValidClaimCodeError("");
        }
    };

    const onClickCreateVM = (): void => {
        setStatus("STEP_3");
    };

    const onVestingCreated = (filteredEvents: FilteredEvent[]): void => {
        filteredEvents.forEach(function (events) {
            if (events.eventName === "VestingCreated") {
                for (const [eveName, eveValue] of Object.entries(events.args)) {
                    if (eveName === "vesting") {
                        const vNewAddress = eveValue.toLowerCase();
                        setNewVestingAddress(vNewAddress);

                        // set go to step Nº 4
                        setStatus("STEP_4");

                        // Close the modal
                        setIsOperationModalVisible(false);

                        // Add vesting address to storage
                        addVesting(vNewAddress)
                            .then((/*results*/) => {})
                            .catch((error) => {
                                console.log(error);
                            });
                    }
                }
            }
        });
    };

    const onSendCreateVM = async (e: React.MouseEvent): Promise<void> => {
        setModalTitle(t("vesting.vestingOnboarding.page3.modalTitle"));

        e.stopPropagation();

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction create VM...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = async (receipt: any): Promise<void> => {
            console.log("Transaction create VM mined!...");
            setOperationStatus("success");
            // Events name list
            const filter = ["VestingCreated"];

            const contractName = "VestingFactory";

            const txRcp = await auth.web3.eth.getTransactionReceipt(
                receipt.transactionHash
            );
            const filteredEvents = decodeEvents(txRcp, contractName, filter);
            onVestingCreated(filteredEvents);
        };
        const onError = (error: any): void => {
            console.log("Transaction create VM error!...:", error);
            setOperationStatus("error");
        };

        await auth
            .interfaceIncentiveV2Claim(
                claimCode,
                onTransaction,
                onReceipt,
                onError
            )
            .then((/*res*/) => {
                // Refresh status
                /*auth.loadContractsStatusAndUserBalance().then(
                    (value) => {
                        console.log('Refresh user balance OK!');
                    }
                );*/
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const loadClaimCodeFromFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = (e.target?.result as string).substring(0, 132);
            setClaimCode(text);
        };
        if (e.target.files && e.target.files[0]) {
            reader.readAsText(e.target.files[0]);
        }
    };

    const saveAddressToFile = (address: string): void => {
        const uri =
            "data:text/plain;charset=utf-8," + encodeURIComponent(address);

        const link = document.createElement("a");
        link.href = uri;
        link.download = "VestingAddress.txt";
        document.body.appendChild(link);
        link.click();

        // Remueve el enlace del DOM después de la descarga
        document.body.removeChild(link);
    };

    const copyAddressToClipboard = (address: string): void => {
        navigator.clipboard
            .writeText(address)
            .then(() => {
                // console.log('Copied to clipboard', address);
            })
            .catch((/*err*/) => {
                // console.error('Error copying to clipboard', err);
            });
    };

    const addVesting = async (addVestingAddress: string): Promise<boolean> => {
        const isValidVesting = await onValidateVestingAddress(
            auth,
            addVestingAddress
        );
        if (isValidVesting) {
            const isLoaded = loadVesting(auth, addVestingAddress);
            if (!isLoaded) {
                return false;
            }
            //add on storage
            // get vesting addresses
            const vestingFromStorage = loadVestingAddressesFromLocalStorage(
                auth.accountData.Wallet
            );

            //Add the new one to the list
            vestingFromStorage.push(addVestingAddress);

            // Store vesting addresses
            saveVestingAddressesToLocalStorage(
                auth.accountData.Wallet.toLowerCase(),
                vestingFromStorage
            );
            saveDefaultVestingToLocalStorage(
                auth.accountData.Wallet.toLowerCase(),
                addVestingAddress
            );

            setNewVestingAddress("");

            return true;
        }
        return false;
    };

    return (
        <div className="section vesting">
            {/* {status === 'LOADED' && (
                <Alert
                    className="alert alert-info"
                    message={t('vesting.alert.title')}
                    description={
                        <div>
                            <div className="address desktop-only">
                                Using VM:{space} {usingVestingAddress}
                            </div>
                            <div className="address mobile-only">
                                Using VM:{space}
                                {truncateAddress(usingVestingAddress)}
                            </div>
                            <div>{t('vesting.alert.explanation')}</div>
                        </div>
                    }
                    type="error"
                    showIcon
                    // closable
                    action={
                        <Button
                            size="small"
                            type="custom"
                            onClick={onDisplayAccount}
                        >
                            {t('vesting.alert.cta')}
                        </Button>
                    }
                />
            )} */}

            {status === "LOADED" && (
                <UseVestingAlert address={usingVestingAddress} />
            )}
            {/*

             VESTING ONBOARDING PAGE 1

             */}
            {status === "STEP_1" && (
                <div
                    id="vesting-onboarding"
                    className="layout-card section__innerCard--big page1"
                >
                    <div className="layout-card-title">
                        <h1>{t("vesting.cardTitle")}</h1>
                    </div>
                    <div className="layout-card-content">
                        <div className="vesting-content">
                            <h2>
                                {t("vesting.vestingOnboarding.page1.stepTitle")}
                            </h2>
                            <p>
                                {t(
                                    "vesting.vestingOnboarding.page1.explanation1"
                                )}
                            </p>
                            <p id="vestingOnboardingClaimCodeExplanation">
                                {t(
                                    "vesting.vestingOnboarding.page1.explanation2"
                                )}
                            </p>
                            <div className="cta-container">
                                <div className="cta-options-group">
                                    <button
                                        className="button secondary"
                                        onClick={onDisplayAccount}
                                    >
                                        {t(
                                            "vesting.vestingOnboarding.page1.ctaSecondary"
                                        )}
                                    </button>

                                    <button
                                        id="vestingOnboardingUseClaimCode"
                                        className="button"
                                        onClick={onClickUseClaimCode}
                                    >
                                        {t(
                                            "vesting.vestingOnboarding.page1.ctaPrimary"
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div
                                id="vestingOnboardingPagination"
                                className="pagination"
                            >
                                <div className="page-indicator active"></div>
                                <div className="page-indicator"></div>
                                <div className="page-indicator"></div>
                                <div className="page-indicator"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/*

             INCENTIVE USE CLAIM CODE INPUT CLAIM CODE & VERIFICATION

             */}
            {status === "STEP_2" && (
                <div
                    id="vesting-onboarding"
                    className="layout-card section__innerCard--big page2"
                >
                    <div className="layout-card-title">
                        <h1>{t("vesting.cardTitle")}</h1>
                    </div>
                    <div className="layout-card-content">
                        <div className="vesting-content">
                            <h2>
                                {t("vesting.vestingOnboarding.page2.stepTitle")}
                            </h2>
                            <div className="input-container">
                                <label className="claim-code-input-label">
                                    {t("vesting.vestingOnboarding.page2.label")}
                                    <TextArea
                                        // rows={4}
                                        className="claim-code-input"
                                        placeholder={t(
                                            "vesting.vestingOnboarding.page2.placeholder"
                                        )}
                                        onChange={onChangeClaimCode}
                                        value={claimCode}
                                    />
                                </label>
                            </div>
                            {!validClaimCode && validClaimCodeError !== "" && (
                                <div className="input-error">
                                    {validClaimCodeError}
                                </div>
                            )}
                            <div className="options">
                                <input
                                    id="file-upload"
                                    className="button--small"
                                    type="file"
                                    onChange={loadClaimCodeFromFile}
                                    style={{ display: "none" }}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="button--small"
                                >
                                    {t(
                                        "vesting.vestingOnboarding.page2.loadButton"
                                    )}
                                </label>
                            </div>
                            <br />
                            <div className="explanation">
                                <p>
                                    {t(
                                        "vesting.vestingOnboarding.page2.explanation1"
                                    )}
                                </p>
                            </div>
                            <div className="cta-container">
                                <div className="cta-options-group">
                                    <button
                                        className="button secondary"
                                        onClick={() => setStatus("STEP_1")}
                                    >
                                        {t(
                                            "vesting.vestingOnboarding.page2.ctaSecondary"
                                        )}
                                    </button>
                                    <button
                                        className="button"
                                        onClick={onClickCreateVM}
                                        disabled={!validClaimCode}
                                    >
                                        {t(
                                            "vesting.vestingOnboarding.page2.ctaPrimary"
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="pagination">
                                <div className="page-indicator"></div>
                                <div className="page-indicator active"></div>
                                <div className="page-indicator"></div>
                                <div className="page-indicator"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/*

            INCENTIVE V2 USE CLAIM CODE CORROBORATE BALANCE

            */}
            {status === "STEP_3" && (
                <div
                    id="vesting-onboarding"
                    className="layout-card section__innerCard--big page3"
                >
                    <div className="layout-card-title">
                        <h1>{t("vesting.cardTitle")}</h1>
                    </div>
                    <div className="layout-card-content">
                        <div className="vesting-content">
                            <div className="vesting-wallet-info">
                                <h2 className="vesting-wallet-label">
                                    {t(
                                        "vesting.vestingOnboarding.page3.stepTitle"
                                    )}
                                </h2>
                                <div className="tx-amount-container">
                                    <div className="vesting-wallet-claim-amount tx-amount-data">
                                        {PrecisionNumbers({
                                            amount: !auth.userBalanceData
                                                ? "0"
                                                : auth.userBalanceData
                                                      .incentiveV2.userBalance,
                                            token: settings.tokens.TG[0],
                                            decimals: t(
                                                "staking.display_decimals"
                                            ),
                                            numericLabelParams: {},
                                            i18n: i18n,
                                        })}
                                        {t("staking.governanceToken")}
                                    </div>
                                    <div className="tx-amount-info">
                                        {t(
                                            "vesting.vestingOnboarding.page3.amountLabel"
                                        )}
                                    </div>
                                    <div className="tx-direction">
                                        <div className="swapArrow">
                                            <div className="icon-arrow-down"></div>
                                        </div>
                                    </div>
                                    <div className="tx-destination-address">
                                        {auth.accountData.Wallet}
                                    </div>
                                    <div className="tx-amount-info">
                                        {t(
                                            "vesting.vestingOnboarding.page3.ownerLabel"
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="cta-container">
                                <div className="cta-info-group">
                                    <div className="cta-info-detail">
                                        {t(
                                            "vesting.vestingOnboarding.page3.ctaInfo"
                                        )}
                                    </div>
                                </div>
                                <div className="cta-options-group">
                                    <button
                                        className="button secondary"
                                        onClick={() => setStatus("STEP_2")}
                                    >
                                        {t(
                                            "vesting.vestingOnboarding.page3.ctaSecondary"
                                        )}
                                    </button>
                                    <button
                                        className="button"
                                        disabled={!validCreateVM}
                                        onClick={onSendCreateVM}
                                    >
                                        {t(
                                            "vesting.vestingOnboarding.page3.ctaPrimary"
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="pagination">
                                <div className="page-indicator"></div>
                                <div className="page-indicator"></div>
                                <div className="page-indicator active"></div>
                                <div className="page-indicator"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {status === "STEP_4" && (
                <div
                    id="vesting-onboarding"
                    className="layout-card section__innerCard--big page4 celebrate"
                >
                    <div className="layout-card-title">
                        <h1>{t("vesting.cardTitle")}</h1>
                    </div>
                    <div className="layout-card-content ">
                        <div className="vesting-content">
                            <h2 className="">
                                {t("vesting.vestingOnboarding.page4.stepTitle")}
                            </h2>
                            <div className="success-message">
                                {t(
                                    "vesting.vestingOnboarding.page4.successMessage"
                                )}
                            </div>
                            <div className="tx-amount-container">
                                <div className="tx-destination-address">
                                    {newVestingAddress}
                                </div>
                                <div className="tx-amount-info">
                                    {t(
                                        "vesting.vestingOnboarding.page4.addressLabel"
                                    )}
                                </div>
                            </div>
                            <div className="options">
                                <input
                                    id="file-download"
                                    className="button--small"
                                    // type="file"
                                    onClick={() =>
                                        saveAddressToFile(newVestingAddress)
                                    }
                                    style={{ display: "none" }}
                                />
                                <label
                                    htmlFor="file-download"
                                    className="button--small"
                                >
                                    {t(
                                        "vesting.vestingOnboarding.page4.buttonDownloadAddress"
                                    )}
                                </label>
                                <input
                                    id="copy-code"
                                    className="button--small"
                                    // type="file"
                                    onClick={() =>
                                        copyAddressToClipboard(
                                            newVestingAddress
                                        )
                                    }
                                    style={{ display: "none" }}
                                />
                                <label
                                    htmlFor="copy-code"
                                    className="button--small"
                                >
                                    {t(
                                        "vesting.vestingOnboarding.page4.buttonCopyAddress"
                                    )}
                                </label>
                            </div>
                            <div className="cta-container">
                                <div className="cta-info-group">
                                    <div className="cta-info-detail">
                                        {t(
                                            "vesting.vestingOnboarding.page4.ctaInfo"
                                        )}
                                    </div>
                                </div>
                                <div className="cta-options-group">
                                    <button
                                        className="button secondary"
                                        onClick={() => setStatus("STEP_3")}
                                    >
                                        {t(
                                            "vesting.vestingOnboarding.page4.ctaSecondary"
                                        )}
                                    </button>
                                    <button
                                        className="button"
                                        disabled={newVestingAddress === ""}
                                    >
                                        {t(
                                            "vesting.vestingOnboarding.page4.ctaPrimary"
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="pagination">
                                <div className="page-indicator"></div>
                                <div className="page-indicator"></div>
                                <div className="page-indicator"></div>
                                <div className="page-indicator active"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/*

             VESTING SCHEDULE

             */}
            {window.dContracts.contracts.VestingMachine !== undefined &&
                status === "LOADED" && (
                    <div className="vesting">
                        <div
                            id="vesting-info"
                            className={"layout-card section__innerCard--small"}
                        >
                            {/* <div className="layout-card-title"> */}
                            {/* <div id="vesting-info" className="layout-card"> */}
                            <div className="layout-card-title">
                                <h1>{t("vesting.cardTitle")}</h1>
                                <div id="vesting-verification">
                                    {auth.userBalanceData &&
                                        auth.userBalanceData.vestingmachine
                                            .isVerified &&
                                        isHolderVesting && (
                                            <div
                                                className={
                                                    "vesting__verification__status--OwnedWallet"
                                                }
                                            >
                                                <div className="verification-icon--ownedWallet"></div>
                                                {t("vesting.status.verified")}
                                            </div>
                                        )}
                                    {!isHolderVesting && (
                                        <div
                                            className={
                                                "vesting__verification__status--notOwnedWallet"
                                            }
                                        >
                                            <div className="verification-icon--notOwnedWallet"></div>
                                            {t(
                                                "vesting.status.notFromThisUser"
                                            )}
                                        </div>
                                    )}
                                    {auth.userBalanceData &&
                                        !auth.userBalanceData.vestingmachine
                                            .isVerified &&
                                        isHolderVesting && (
                                            <div
                                                className={
                                                    "vesting__verification__status"
                                                }
                                            >
                                                <div className="verification-icon"></div>
                                                {t(
                                                    "vesting.status.notVerified"
                                                )}
                                                <a
                                                    className={"verify__button"}
                                                    onClick={onVerify}
                                                >
                                                    {t(
                                                        "vesting.status.verifyCTA"
                                                    )}
                                                </a>
                                                <div className="icon__button__arrow"></div>
                                            </div>
                                        )}
                                </div>
                            </div>
                            <div id="vesting-info-content">
                                <div>
                                    <div
                                        id="vesting-moc-available"
                                        className="vesting__data"
                                    >
                                        {PrecisionNumbers({
                                            amount: !auth.userBalanceData
                                                ? "0"
                                                : auth.userBalanceData
                                                      .vestingmachine
                                                      .getAvailable,
                                            token: settings.tokens.TG[0],
                                            decimals: t(
                                                "staking.display_decimals"
                                            ),
                                            numericLabelParams: {},
                                            i18n: i18n,
                                        })}
                                    </div>
                                    <div className="vesting__label">
                                        {t("vesting.tokensAvailableToWithdraw")}
                                    </div>
                                </div>
                                <button
                                    id="withdraw-cta"
                                    onClick={onWithdraw}
                                    disabled={!validWithdraw}
                                >
                                    {t("vesting.withdrawToWallet")}
                                    <div className="icon__button__arrow"></div>
                                </button>
                            </div>
                        </div>
                        {/* </div>{' '} */}
                        <div
                            id="vesting-distribution"
                            className="layout-card section__innerCard--small"
                        >
                            <div id="moc-ready">
                                <div
                                    id="vestingDash-readyToWithdraw"
                                    className="vesting__data"
                                >
                                    {PrecisionNumbers({
                                        amount: !auth.userBalanceData
                                            ? "0"
                                            : vestingTotals["vested"],
                                        token: settings.tokens.TG[0],
                                        decimals: t("staking.display_decimals"),
                                        numericLabelParams: {},
                                        i18n: i18n,
                                    })}
                                </div>
                                <div className="vesting__label">
                                    {t("vesting.dashDistribution.vested")}
                                </div>
                            </div>
                            <div id="dashboard">
                                <div
                                    id="vestingDash-vested"
                                    className="vesting__data"
                                >
                                    {vestingTotals["daysToRelease"]}{" "}
                                </div>
                                <div className="vesting__label">
                                    {t(
                                        "vesting.dashDistribution.daysToRelease"
                                    )}
                                </div>
                            </div>
                            <div id="moc3">
                                <div
                                    id="vestingDash-staked"
                                    className="vesting__data"
                                >
                                    {PrecisionNumbers({
                                        amount: !auth.userBalanceData
                                            ? "0"
                                            : auth.userBalanceData
                                                  .vestingmachine.staking
                                                  .balance,
                                        token: settings.tokens.TG[0],
                                        decimals: t("staking.display_decimals"),
                                        numericLabelParams: {},
                                        i18n: i18n,
                                    })}{" "}
                                </div>
                                <div className="vesting__label">
                                    {t("vesting.dashDistribution.staked")}
                                </div>
                            </div>
                            <div id="moc4">
                                <div
                                    id="estingDash-unstaking"
                                    className="vesting__data"
                                >
                                    {PrecisionNumbers({
                                        amount: !auth.userBalanceData
                                            ? "0"
                                            : auth.userBalanceData
                                                  .vestingmachine.delay.balance,
                                        token: settings.tokens.TG[0],
                                        decimals: t("staking.display_decimals"),
                                        numericLabelParams: {},
                                        i18n: i18n,
                                    })}
                                </div>
                                <div className="vesting__label">
                                    {t("vesting.dashDistribution.unstaking")}
                                </div>
                            </div>
                        </div>
                        {/* </div>{' '} */}
                        <div
                            id="vesting-schedudle"
                            className="layout-card section__innerCard--big"
                        >
                            <div className="layout-card-title">
                                <h1>
                                    {" "}
                                    {t("vesting.releaseSchedule.cardTitle")}
                                </h1>
                            </div>
                            <div id="moc-total">
                                <div className="total-data">
                                    {PrecisionNumbers({
                                        amount: !auth.userBalanceData
                                            ? "0"
                                            : auth.userBalanceData
                                                  .vestingmachine.getTotal,
                                        token: settings.tokens.TG[0],
                                        decimals: t("staking.display_decimals"),
                                        numericLabelParams: {},
                                        i18n: i18n,
                                    })}
                                    {space}
                                    {t("staking.tokens.TG.abbr", { ns: ns })}
                                </div>
                                <div className="vesting__label">
                                    {t("vesting.releaseSchedule.scheduled")}
                                </div>
                            </div>
                            <div id="vesting-schedule-table">
                                <VestingSchedule />
                            </div>
                        </div>
                    </div>
                )}
            {isOperationModalVisible && (
                <OperationStatusModal
                    title={modalTitle}
                    visible={isOperationModalVisible}
                    onCancel={() => setIsOperationModalVisible(false)}
                    operationStatus={operationStatus}
                    txHash={txHash}
                />
            )}
        </div>
    );
}

export default Vesting; 