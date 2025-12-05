import { Input, notification, Select, Switch } from "antd";
import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { readContract } from "viem/actions";

import { useWalletContext } from "../../context/Wallet";
import VestingMachine from "../../contracts/omoc/VestingMachine.json";
import { useProjectTranslation } from "../../helpers/translations";
import {
    loadDefaultVestingFromLocalStorage,
    loadVesting,
    loadVestingAddressesFromLocalStorage,
    saveDefaultVestingToLocalStorage,
    saveVestingAddressesToLocalStorage,
} from "../../helpers/vesting";

const { Option } = Select;

// Type definitions
interface AccountDialogProps {
    onCloseModal: () => void;
    vestingOn: boolean;
    setVestingOn: (checked: boolean) => void;
}

function removeAllItem<T>(arr: T[], value: T): T[] {
    let i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}

const truncateAddress = (address: string | undefined): string => {
    if (!address || address === undefined) return "";
    return (
        address.substring(0, 6) +
        "..." +
        address.substring(address.length - 4, address.length)
    );
};

export default function AccountDialog(props: AccountDialogProps): JSX.Element {
    const { onCloseModal, vestingOn, setVestingOn } = props;

    const { t } = useProjectTranslation();
    const {
        address,
        userBalance,
        vestingAddress,
        publicClient,
        disconnect,
        setVestingMachine,
    } = useWalletContext();
    const [actionVesting, setActionVesting] = useState<"select" | "add">(
        "select"
    );
    const [addVestingAddress, setAddVestingAddress] = useState<string>("");
    const [addVestingAddressError, setAddVestingAddressError] =
        useState<boolean>(false);
    const [addVestingAddressErrorText, setAddVestingAddressErrorText] =
        useState<string>("");

    const defaultVestingAddresses: string[] =
        loadVestingAddressesFromLocalStorage(address || "");
    let defaultVestingAddress: string | null =
        loadDefaultVestingFromLocalStorage(address || "");

    // Select the first one from the list of vesting if not default vesting address
    if (defaultVestingAddresses && !defaultVestingAddress)
        defaultVestingAddress = defaultVestingAddresses[0];

    const [vestingAddresses, setVestingAddresses] = useState<string[]>(
        defaultVestingAddresses
    );
    const [vestingAddressDefault, setVestingAddressDefault] = useState<
        string | null
    >(defaultVestingAddress);

    useEffect(() => {
        const run = async () => {
            if (!publicClient) return;

            if (
                vestingOn &&
                vestingAddress === undefined &&
                vestingAddressDefault
            ) {
                const isLoaded = await loadVesting(
                    publicClient,
                    vestingAddressDefault as `0x${string}`
                );
                if (isLoaded) {
                    setVestingMachine(vestingAddressDefault);
                }
            }

            if (!vestingOn && vestingAddress !== undefined) {
                setVestingMachine("");
            }
        };

        void run();
    }, [
        vestingOn,
        vestingAddress,
        vestingAddressDefault,
        publicClient,
        setVestingMachine,
    ]);

    const qrValue =
        address && import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL
            ? `${import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL}/address/${address}`
            : "";

    const onClose = (): void => {
        onCloseModal();
    };

    const onDisconnect = (): void => {
        onCloseModal();
        disconnect();
    };

    const onCopy = (e: React.MouseEvent): void => {
        e.stopPropagation();
        /*navigator.clipboard.writeText(address);
        showNotificationCopiedAddress(address);*/
    };

    const onCopyVesting = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (vestingAddressDefault) {
            void navigator.clipboard.writeText(vestingAddressDefault);
            showNotificationCopiedAddress(vestingAddressDefault);
        }
    };

    const showNotificationCopiedAddress = (copiedAddress: string): void => {
        notification.open({
            className: "notification type-temporal",
            message: t("feedback.clipboardCopy"),
            description: `${copiedAddress} ` + t("feedback.clipboardTo"),
            placement: "topRight",
            duration: 4,
            //pauseOnHover: true,
            onClose: () => {
                // destroys container when closed
                notification.destroy();
            },
        });
    };

    const onChangeInputVestingAddress = (
        e: React.ChangeEvent<HTMLInputElement>
    ): void => {
        setAddVestingAddress(e.target.value.toLowerCase());
        onValidateVestingAddressClear();
    };

    const onValidateVestingAddressClear = (): void => {
        setAddVestingAddressErrorText("");
        setAddVestingAddressError(false);
    };

    const onValidateVestingAddress = async (): Promise<boolean> => {
        if (!publicClient) return false;

        // 1. Input address valid
        if (addVestingAddress === "") {
            setAddVestingAddressErrorText("Vesting address can not be empty");
            setAddVestingAddressError(true);
            return false;
        } else if (
            addVestingAddress.length < 42 ||
            addVestingAddress.length > 42
        ) {
            setAddVestingAddressErrorText("Not valid input vesting address");
            setAddVestingAddressError(true);
            return false;
        }

        // 2. Check if not in the list
        const vestingLowerCase: string[] = vestingAddresses.map(function (
            value: string
        ) {
            return value.toLowerCase();
        });
        if (vestingLowerCase.includes(addVestingAddress.toLowerCase())) {
            setAddVestingAddressErrorText("Address is already added!");
            setAddVestingAddressError(true);
            return false;
        }

        try {
            const holder = (await readContract(publicClient, {
                address: addVestingAddress as `0x${string}`,
                abi: VestingMachine.abi,
                functionName: "getHolder",
                args: [],
            })) as string;

            return true;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            console.error("Invalid Vesting address:", errorMessage);
            setAddVestingAddressErrorText(
                "Seems that address is not valid vesting"
            );
            setAddVestingAddressError(true);
            return false;
        }
    };

    const addVesting = async (): Promise<void> => {
        if (!publicClient) return;
        if (!address) return;
        if (!addVestingAddress) return;
        const isValidVesting = await onValidateVestingAddress();
        if (isValidVesting) {
            const isLoaded = await loadVesting(
                publicClient,
                addVestingAddress as `0x${string}`
            );
            if (!isLoaded) {
                return;
            }

            // Set the vesting machine
            setVestingMachine(addVestingAddress);

            // We need to refresh the user balance
            // auth.loadContractsStatusAndUserBalance().then((/*value*/) => {
            //     console.log("Refresh user balance OK!");
            // });

            //add on storage
            // get vesting addresses
            const vestingFromStorage: string[] =
                loadVestingAddressesFromLocalStorage(address);

            //Add the new one to the list
            vestingFromStorage.push(addVestingAddress.toLowerCase());

            // Store vesting addresses
            saveVestingAddressesToLocalStorage(
                address.toLowerCase(),
                vestingFromStorage
            );
            saveDefaultVestingToLocalStorage(
                address.toLowerCase(),
                addVestingAddress
            );

            setVestingAddresses(vestingFromStorage);
            setVestingAddressDefault(addVestingAddress);

            // Close add panel
            setActionVesting("select");
        }
    };

    const onAddVesting = (e: React.MouseEvent): void => {
        e.stopPropagation();
        void addVesting();
    };

    const onUnloadVM = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (vestingAddressDefault) {
            const removeItems: string[] = removeAllItem(
                vestingAddresses,
                vestingAddressDefault
            );
            saveVestingAddressesToLocalStorage(
                address?.toLowerCase() || "",
                removeItems
            );
            setVestingAddressDefault(null);
            setVestingAddresses(removeItems);

            // Disable using vesting machine
            onChangeShowVesting(false);
        }
    };

    const onShowAddVesting = (e: React.MouseEvent): void => {
        e.stopPropagation();
        setActionVesting("add");
    };

    const onCloseAddVesting = (e: React.MouseEvent): void => {
        e.stopPropagation();
        setActionVesting("select");
    };

    const onChangeSelectVesting = async (
        selectAddress: string
    ): Promise<boolean> => {
        if (!publicClient) return false;
        if (!selectAddress) return false;
        if (vestingAddressDefault === selectAddress) return false;
        const isLoaded = await loadVesting(
            publicClient,
            selectAddress as `0x${string}`
        );
        setVestingAddressDefault(selectAddress);
        saveDefaultVestingToLocalStorage(
            address?.toLowerCase() || "",
            selectAddress
        );
        setVestingMachine(selectAddress);

        return isLoaded;
    };

    const onChangeShowVesting = (checked: boolean): void => {
        setVestingOn(checked);
    };

    return (
        <div className="wallet__settings">
            <div className="ant-modal-header">
                <h1>{t("wallet.modalTitle")}</h1>
            </div>
            <div className="ant-modal-body tx-amount-group">
                <div className="address wallet__columns">
                    <div className="tx-id-container">
                        <div className="tx-id-data">
                            <div className="tx-id-label">
                                {t("wallet.userAddress")}
                            </div>
                            <div
                                className="tx-id-address"
                                style={{
                                    cursor: qrValue ? "pointer" : "default",
                                }}
                                onClick={() => {
                                    if (!qrValue) return;
                                    window.open(
                                        qrValue,
                                        "_blank",
                                        "noopener,noreferrer"
                                    );
                                }}
                            >
                                <div className="truncate-address">
                                    {truncateAddress(address)}
                                </div>
                                <div onClick={onCopy}>
                                    <div className="icon-copy"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="qr">
                        <QRCode
                            size={256}
                            style={{
                                height: "auto",
                                maxWidth: "100%",
                                width: "100%",
                            }}
                            value={qrValue ?? ""}
                            viewBox={`0 0 256 256`}
                        />
                    </div>
                </div>
            </div>

            {typeof import.meta.env.REACT_APP_CONTRACT_IREGISTRY !==
                "undefined" && (
                <div className="switch switch__vesting">
                    <Switch
                        checked={vestingOn}
                        onChange={onChangeShowVesting}
                    />
                    <p>{t("wallet.useVesting")}</p>
                </div>
            )}

            {vestingOn && actionVesting === "select" && (
                <div className="wallet__vesting__options">
                    <div className="wallet__vesting__address__label">
                        {t("wallet.inputLabel")}
                    </div>
                    <div className="wallet__vesting__address__dropdown">
                        <Select
                            className="wallet__vesting__address__selector"
                            onChange={(value) =>
                                void onChangeSelectVesting(value)
                            }
                            value={vestingAddressDefault}
                        >
                            {vestingAddresses.map((possibleOption: string) => (
                                <Option
                                    key={possibleOption}
                                    value={possibleOption}
                                >
                                    {possibleOption}
                                </Option>
                            ))}
                        </Select>
                        <div
                            className="icon-copy"
                            onClick={onCopyVesting}
                        ></div>
                    </div>
                    <div className="wallet__vesting__options__cta">
                        <div className="wallet__vesting__options__buttons">
                            <button
                                className="button secondary button__small"
                                onClick={onShowAddVesting}
                            >
                                {t("wallet.loadVM")}
                            </button>
                            <button
                                className="button secondary button__small"
                                onClick={onUnloadVM}
                            >
                                {t("wallet.unloadVM")}
                            </button>
                        </div>{" "}
                        <div className="wallet__vesting__options__explanation">
                            {t("wallet.disclaimer")}
                        </div>{" "}
                    </div>
                </div>
            )}
            {vestingOn && actionVesting === "add" && (
                <div className="wallet__vesting__options">
                    <div className=".wallet__vesting__address__label">
                        Add Vesting
                    </div>
                    <div className="wallet__vesting__address__dropdown">
                        <Input
                            type="text"
                            placeholder="vesting address"
                            className="wallet__vesting__address__input"
                            onChange={onChangeInputVestingAddress}
                        />
                        {addVestingAddressError &&
                            addVestingAddressErrorText !== "" && (
                                <div className={"input-error"}>
                                    {addVestingAddressErrorText}
                                </div>
                            )}
                    </div>
                    <div className="wallet__vesting__options__buttons">
                        <button
                            type="button"
                            className="button secondary button__small btn-clear"
                            onClick={onCloseAddVesting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="button secondary button__small btn-confirm"
                            onClick={onAddVesting}
                        >
                            Add
                        </button>
                    </div>
                    <div className="additional-text">
                        {t("wallet.disclaimer")}
                    </div>
                </div>
            )}
            <div className="cta-container">
                <div className="cta-options-group">
                    <button
                        type="button"
                        className="button secondary btn-clear"
                        onClick={onDisconnect}
                    >
                        {t("wallet.cta.disconnect")}
                    </button>
                    <button
                        type="button"
                        className="button btn-confirm"
                        onClick={onClose}
                    >
                        {t("wallet.cta.close")}
                    </button>
                </div>
            </div>
        </div>
    );
}
