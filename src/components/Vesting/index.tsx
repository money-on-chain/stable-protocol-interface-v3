import "./Styles.scss";

import { Input } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { recoverMessageAddress, type TransactionReceipt } from "viem";

import { decodeEvents } from "../../backend/transaction";
import VestingStatusAlert from "../../components/Notification/VestingStatusAlert";
import VestingSchedule from "../../components/Tables/VestingSchedule";
import { useWalletContext } from "../../context/Wallet";
import { formatTimestamp } from "../../helpers/staking";
import { useProjectTranslation } from "../../helpers/translations";
import {
    loadVesting,
    loadVestingAddressesFromLocalStorage,
    onValidateVestingAddress,
    saveDefaultVestingToLocalStorage,
    saveVestingAddressesToLocalStorage,
} from "../../helpers/vesting";
import settings from "../../settings/settings.json";
import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import { PrecisionNumbers } from "../PrecisionNumbers";

const { TextArea } = Input;
const space: string = "\u00A0";

interface VestedAmounts {
    released: bigint;
    vested: bigint;
    total: bigint;
    daysToRelease: number;
}

interface FilteredEvent {
    eventName: string;
    args: Record<string, unknown>;
}

const Vesting: React.FC = () => {
    const { t, i18n, ns } = useProjectTranslation();

    const {
        address,
        userOmocBalance,
        userVesting,
        vestingAddress,
        publicClient,
        isVestingLoaded,
        interfaceVestingVerify,
        interfaceVestingWithdraw,
        interfaceIncentiveV2Claim,
        onShowModalAccountVesting,
    } = useWalletContext();

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

    const getIsHolderVestingCallback = useCallback((): boolean => {
        if (!address || !userVesting.data) return false;
        return (
            userVesting.data.vestingmachine.getHolder.toLowerCase() ===
            address.toLowerCase()
        );
    }, [address, userVesting.data]);

    const onValidateWithdrawCallback = useCallback((): void => {
        if (!userVesting.data || !getIsHolderVestingCallback()) {
            setValidWithdraw(false);
            return;
        }
        const availableForWithdraw =
            userVesting.data.vestingmachine.getAvailable;
        if (availableForWithdraw > 0) {
            if (userVesting.data.vestingmachine.isVerified) {
                setValidWithdraw(true);
            } else {
                setValidWithdraw(false);
            }
        } else {
            setValidWithdraw(false);
        }
    }, [userVesting.data, getIsHolderVestingCallback]);

    const onCheckIsHolderVestingCallback = useCallback((): void => {
        const isHolder = getIsHolderVestingCallback();
        setIsHolderVesting(isHolder);
    }, [getIsHolderVestingCallback]);

    const onValidateIncentiveV2UserBalanceCallback = useCallback((): void => {
        let valid = false;
        if (
            userOmocBalance.data &&
            typeof userOmocBalance.data.incentiveV2 !== "undefined" &&
            userOmocBalance.data.incentiveV2 !== null
        ) {
            if (userOmocBalance.data.incentiveV2.userBalance > 0) {
                valid = true;
            }
        }
        setValidCreateVM(valid);
    }, [userOmocBalance.data]);

    useEffect(() => {
        if (userVesting.data && isVestingLoaded()) {
            setStatus("LOADED");
            setUsingVestingAddress(vestingAddress || "");
            onValidateWithdrawCallback();
            onCheckIsHolderVestingCallback();
        } else {
            // Reset in case the previous status is Loaded, this occurs when switch off vesting in account
            if (status === "LOADED") setStatus("STEP_1");
        }

        // Validate incentive user balance
        onValidateIncentiveV2UserBalanceCallback();
    }, [
        userVesting.data,
        isVestingLoaded,
        vestingAddress,
        status,
        onValidateWithdrawCallback,
        onCheckIsHolderVestingCallback,
        onValidateIncentiveV2UserBalanceCallback,
    ]);

    const recoverMessageClaimCode = useCallback(
        async (message: string): Promise<string> => {
            if (!address) return "";
            const chainId = import.meta.env
                .REACT_APP_ENVIRONMENT_CHAIN_ID as string;
            const userAddress = address;
            const fromAddress = userAddress.slice(2);
            const code = `:OMoC:${chainId}:address:${fromAddress}`;

            let recoveredAddress = "";

            try {
                recoveredAddress = await recoverMessageAddress({
                    message: code,
                    signature: message as `0x${string}`,
                });
            } catch (err) {
                console.error(err);
            }

            return recoveredAddress.toLowerCase();
        },
        [address]
    );

    const onValidateClaimCodeCallback = useCallback(async (): Promise<void> => {
        let valid = false;

        if (claimCode.length === 132) {
            const claimAddress = await recoverMessageClaimCode(claimCode);
            if (claimAddress === address?.toLowerCase()) valid = true;
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
    }, [claimCode, address, t, recoverMessageClaimCode]);

    useEffect(() => {
        void onValidateClaimCodeCallback();
    }, [onValidateClaimCodeCallback]);

    /*
    const truncateAddress = (address: string): string => {
        return (
            address.substring(0, 6) +
            "..." +
            address.substring(address.length - 4, address.length)
        );
    };*/

    const vestedAmounts = (): VestedAmounts => {
        const amounts: VestedAmounts = {
            released: 0n,
            vested: 0n,
            total: 0n,
            daysToRelease: 0,
        };

        if (!isVestingLoaded() || !userVesting.data) {
            return amounts;
        }

        const getParameters = userVesting.data.vestingmachine.getParameters;
        const tgeTimestamp = userVesting.data.vestingfactory.getTGETimestamp;
        const total = userVesting.data.vestingmachine.getTotal;
        const lockedAmount = userVesting.data.vestingmachine.getLocked;
        const percentMultiplier = 10000n;
        const [percentages, timeDeltas] = getParameters;

        const deltas = [...timeDeltas];

        if (timeDeltas && timeDeltas[0] !== 0n) {
            deltas.unshift(0n);
        }

        if (percentages[0] < percentMultiplier) {
            percentages.unshift(percentMultiplier);
        }

        if (percentages && percentages.length > 0)
            percentages[percentages.length - 1] = 0n;

        const percents = percentages.map((x: bigint) => {
            return percentMultiplier - x;
        });

        let dates: (string | number)[] = [];
        if (deltas) {
            if (tgeTimestamp) {
                // Convert timestamp to date.
                dates = deltas.map((x) =>
                    formatTimestamp((Number(tgeTimestamp) + Number(x)) * 1000)
                );
            } else {
                dates = deltas.map((x) => Number(x) / 60 / 60 / 24);
            }
        }

        let daysToRelease = 0;
        let countVested = 0;

        if (getParameters) {
            percents.forEach(function (percent: bigint, itemIndex: number) {
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
        }

        amounts.released = BigInt(total - lockedAmount);
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
            console.warn("Sent transaction withdraw...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (): void => {
            console.warn("Transaction withdraw mined!...");
            setOperationStatus("success");
        };
        const onError = (error: unknown): void => {
            console.error("Transaction withdraw error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVestingWithdraw(onTransaction, onReceipt, onError)
            .then((/*res*/) => {
                // Refresh status
                void userOmocBalance.refetch();
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
            console.warn("Sent transaction verify...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (): void => {
            console.warn("Transaction verify mined!...");
            setOperationStatus("success");
        };
        const onError = (error: unknown): void => {
            console.error("Transaction verify error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVestingVerify(onTransaction, onReceipt, onError)
            .then((/*res*/) => {
                // Refresh status
                void userVesting.refetch();
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const onDisplayAccount = (): void => {
        onShowModalAccountVesting();
    };

    const onClickUseClaimCode = (): void => {
        setStatus("STEP_2");
    };

    const onChangeClaimCode = (
        event: React.ChangeEvent<HTMLTextAreaElement>
    ): void => {
        setClaimCode(event.target.value.substring(0, 132));
    };

    const onClickCreateVM = (): void => {
        setStatus("STEP_3");
    };

    const onVestingCreated = (filteredEvents: FilteredEvent[]): void => {
        filteredEvents.forEach(function (events) {
            if (events.eventName === "VestingCreated") {
                for (const [eveName, eveValue] of Object.entries(events.args)) {
                    if (eveName === "vesting") {
                        const vNewAddress = (eveValue as string).toLowerCase();
                        setNewVestingAddress(vNewAddress);

                        // set go to step Nº 4
                        setStatus("STEP_4");

                        // Close the modal
                        setIsOperationModalVisible(false);

                        // Add vesting address to storage
                        void addVesting(vNewAddress)
                            .then((/*results*/) => {})
                            .catch((error) => {
                                console.error(error);
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
            console.warn("Sent transaction create VM...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (receipt: unknown): void => {
            console.warn("Transaction create VM mined!...");
            setOperationStatus("success");
            // Events name list
            const filter = ["VestingCreated"];

            const contractName = "VestingFactory";

            //const txRcp = await auth.web3.eth.getTransactionReceipt(
            //    receipt.transactionHash
            //);
            const txRcp = receipt;
            const filteredEvents: FilteredEvent[] =
                decodeEvents(
                    txRcp as TransactionReceipt,
                    contractName,
                    filter
                ) || [];

            onVestingCreated(filteredEvents);
        };
        const onError = (error: unknown): void => {
            console.error("Transaction create VM error!...:", error);
            setOperationStatus("error");
        };

        await interfaceIncentiveV2Claim(
            claimCode,
            onTransaction,
            onReceipt,
            onError
        )
            .then((/*res*/) => {
                // Refresh status
                void userOmocBalance.refetch();
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const loadClaimCodeFromFile = (
        e: React.ChangeEvent<HTMLInputElement>
    ): void => {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (e) => {
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
        if (!address) return false;

        const isValidVesting = await onValidateVestingAddress(
            publicClient!,
            addVestingAddress as `0x${string}`
        );
        if (isValidVesting) {
            const isLoaded = await loadVesting(
                publicClient!,
                addVestingAddress as `0x${string}`
            );
            if (!isLoaded) {
                return false;
            }
            //add on storage
            // get vesting addresses
            const vestingFromStorage =
                loadVestingAddressesFromLocalStorage(address);

            //Add the new one to the list
            vestingFromStorage.push(addVestingAddress);

            // Store vesting addresses
            saveVestingAddressesToLocalStorage(
                address.toLowerCase(),
                vestingFromStorage
            );
            saveDefaultVestingToLocalStorage(
                address.toLowerCase(),
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

            <VestingStatusAlert />
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
                                            amount: !userOmocBalance.data || !userOmocBalance.data.incentiveV2.userBalance
                                                ? 0n
                                                : userOmocBalance.data
                                                      .incentiveV2.userBalance,
                                            token: settings.tokens.TG[0],
                                            decimals: Number(
                                                t("staking.display_decimals")
                                            ),
                                            //numericLabelParams: {},
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
                                        {address}
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
                                        onClick={() => void onSendCreateVM}
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
            {vestingAddress !== undefined && status === "LOADED" && (
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
                                {userVesting.data &&
                                    userVesting.data.vestingmachine &&
                                    userVesting.data.vestingmachine
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
                                        {t("vesting.status.notFromThisUser")}
                                    </div>
                                )}
                                {userVesting.data &&
                                    userVesting.data.vestingmachine &&
                                    !userVesting.data.vestingmachine
                                        .isVerified &&
                                    isHolderVesting && (
                                        <div
                                            className={
                                                "vesting__verification__status"
                                            }
                                        >
                                            <div className="verification-icon"></div>
                                            {t("vesting.status.notVerified")}
                                            <a
                                                className={"verify__button"}
                                                onClick={() => void onVerify}
                                            >
                                                {t("vesting.status.verifyCTA")}
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
                                        amount: !userVesting.data || !userVesting.data.vestingmachine
                                            ? 0n
                                            : userVesting.data.vestingmachine
                                                  .getAvailable,
                                        token: settings.tokens.TG[0],
                                        decimals: Number(
                                            t("staking.display_decimals")
                                        ),
                                        //numericLabelParams: {},
                                        i18n: i18n,
                                    })}
                                </div>
                                <div className="vesting__label">
                                    {t("vesting.tokensAvailableToWithdraw")}
                                </div>
                            </div>
                            <button
                                id="withdraw-cta"
                                onClick={() => void onWithdraw}
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
                                    amount: !userVesting.data || !userVesting.data.vestingmachine
                                        ? 0n
                                        : vestingTotals["vested"],
                                    token: settings.tokens.TG[0],
                                    decimals: Number(
                                        t("staking.display_decimals")
                                    ),
                                    //numericLabelParams: {},
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
                                {t("vesting.dashDistribution.daysToRelease")}
                            </div>
                        </div>
                        <div id="moc3">
                            <div
                                id="vestingDash-staked"
                                className="vesting__data"
                            >
                                {PrecisionNumbers({
                                    amount: !userVesting.data || !userVesting.data.vestingmachine
                                        ? 0n
                                        : userVesting.data.vestingmachine
                                              .staking.balance,
                                    token: settings.tokens.TG[0],
                                    decimals: Number(
                                        t("staking.display_decimals")
                                    ),
                                    //numericLabelParams: {},
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
                                    amount: !userVesting.data || !userVesting.data.vestingmachine
                                        ? 0n
                                        : userVesting.data.vestingmachine.delay
                                              .getBalance,
                                    token: settings.tokens.TG[0],
                                    decimals: Number(
                                        t("staking.display_decimals")
                                    ),
                                    //numericLabelParams: {},
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
                            <h1> {t("vesting.releaseSchedule.cardTitle")}</h1>
                        </div>
                        <div id="moc-total">
                            <div className="total-data">
                                {PrecisionNumbers({
                                    amount: !userVesting.data || !userVesting.data.vestingmachine
                                        ? 0n
                                        : userVesting.data.vestingmachine
                                              .getTotal,
                                    token: settings.tokens.TG[0],
                                    decimals: Number(
                                        t("staking.display_decimals")
                                    ),
                                    //numericLabelParams: {},
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
};

export default Vesting;
