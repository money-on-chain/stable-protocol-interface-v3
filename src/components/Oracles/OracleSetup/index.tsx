import "./Styles.scss";

import { Alert, Button, Input, Tooltip } from "antd";
import React, { useState } from "react";
import { formatUnits, isAddress } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";
import OperationStatusModal from "../../Modals/OperationStatusModal/OperationStatusModal";

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

type PendingAction = "register" | "remove" | "setName" | "setAddress" | null;

type OperationHandlers = {
    onTransaction: (hash: string) => void;
    onReceipt: () => void;
    onError: (error: unknown) => void;
};

export default function OracleSetup(): React.ReactElement {
    const { t } = useProjectTranslation();
    const {
        userOmocBalance,
        contractStatusOmoc,
        interfaceOracleRegister,
        interfaceOracleRemove,
        interfaceOracleSetName,
        interfaceOracleSetAddress,
    } = useWalletContext();

    const stakingInfo = userOmocBalance.data?.stakingmachine;
    const isRegistrationKnown =
        typeof stakingInfo?.isOracleRegistered === "boolean";
    const isOracleRegistered = stakingInfo?.isOracleRegistered ?? false;
    const canRemoveOracle = stakingInfo?.canRemoveOracle ?? false;

    const registrationInfo = stakingInfo?.getOracleRegistrationInfo;
    const currentOracleUrl = isOracleRegistered
        ? (registrationInfo?.[0] ?? "")
        : "";
    const currentOracleAddr = isOracleRegistered
        ? (registrationInfo?.[2] ?? "")
        : "";

    const currentStake = stakingInfo?.getBalance;
    const minCPSubscriptionStake =
        contractStatusOmoc.data?.oraclemanager?.getMinCPSubscriptionStake;
    const isStakeKnown =
        typeof currentStake === "bigint" &&
        typeof minCPSubscriptionStake === "bigint";
    const hasEnoughStake = !isStakeKnown || currentStake >= minCPSubscriptionStake;

    const [oracleAddressInput, setOracleAddressInput] = useState<string>("");
    const [oracleUrlInput, setOracleUrlInput] = useState<string>("");
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [operationModalInfo, setOperationModalInfo] =
        useState<OperationModalInfo>({ operationStatus: "", txHash: "" });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);

    const addressValue = oracleAddressInput || currentOracleAddr;
    const urlValue = oracleUrlInput || currentOracleUrl;
    const isAddressValid = isAddress(addressValue);
    const isAddressUnchanged =
        isOracleRegistered &&
        !!currentOracleAddr &&
        addressValue.toLowerCase() === currentOracleAddr.toLowerCase();

    const runAction = async (
        action: PendingAction,
        call: (handlers: OperationHandlers) => Promise<unknown>
    ): Promise<void> => {
        setPendingAction(action);
        setOperationModalInfo({ operationStatus: "sign", txHash: "" });
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            setOperationModalInfo({ operationStatus: "pending", txHash });
        };
        const onReceipt = (): void => {
            setOperationModalInfo((prev) => ({
                ...prev,
                operationStatus: "success",
            }));
        };
        const onError = (error: unknown): void => {
            console.error("Oracle setup error!...:", error);
            setOperationModalInfo((prev) => ({
                ...prev,
                operationStatus: "error",
            }));
        };

        await call({ onTransaction, onReceipt, onError })
            .then(() => {
                void userOmocBalance.refetch();
            })
            .catch((error) => {
                console.error(error);
                setOperationModalInfo((prev) => ({
                    ...prev,
                    operationStatus: "error",
                }));
            })
            .finally(() => {
                setPendingAction(null);
            });
    };

    const onRegister = (): Promise<void> =>
        runAction("register", ({ onTransaction, onReceipt, onError }) =>
            interfaceOracleRegister(
                addressValue as `0x${string}`,
                urlValue,
                onTransaction,
                onReceipt,
                onError
            )
        );

    const onRemove = (): Promise<void> =>
        runAction("remove", ({ onTransaction, onReceipt, onError }) =>
            interfaceOracleRemove(onTransaction, onReceipt, onError)
        );

    const onUpdateAddress = (): Promise<void> =>
        runAction("setAddress", ({ onTransaction, onReceipt, onError }) =>
            interfaceOracleSetAddress(
                addressValue as `0x${string}`,
                onTransaction,
                onReceipt,
                onError
            )
        );

    const onUpdateUrl = (): Promise<void> =>
        runAction("setName", ({ onTransaction, onReceipt, onError }) =>
            interfaceOracleSetName(urlValue, onTransaction, onReceipt, onError)
        );

    const isBusy = pendingAction !== null;

    return (
        <div className="layout-card oracleSetup">
            <div className="layout-card-title">
                <h1>{t("oracles.oracleSetup.cardTitle")}</h1>
            </div>

            {isRegistrationKnown && (
                <span
                    className={
                        isOracleRegistered
                            ? "oracleSetup__status oracleSetup__status--registered"
                            : "oracleSetup__status oracleSetup__status--notRegistered"
                    }
                >
                    {isOracleRegistered
                        ? t("oracles.oracleSetup.statusRegistered")
                        : t("oracles.oracleSetup.statusNotRegistered")}
                </span>
            )}

            <div className="oracleSetup__requirements">
                <div className="oracleSetup__requirements-title">
                    {t("oracles.oracleSetup.requirementsTitle")}
                </div>
                <div>{t("oracles.oracleSetup.requirementUniqueAddress")}</div>
                <div>
                    {t("oracles.oracleSetup.requirementStake", {
                        minStake: isStakeKnown
                            ? formatUnits(minCPSubscriptionStake, 18)
                            : "…",
                    })}
                </div>
                {isStakeKnown && (
                    <div className="oracleSetup__requirements-current">
                        {t("oracles.oracleSetup.currentStakeLabel", {
                            amount: formatUnits(currentStake, 18),
                        })}
                    </div>
                )}
            </div>

            {isRegistrationKnown && !isOracleRegistered && !hasEnoughStake && (
                <Alert
                    className="oracleSetup__warning"
                    type="warning"
                    showIcon
                    message={t("oracles.oracleSetup.insufficientStakeWarning", {
                        minStake: formatUnits(minCPSubscriptionStake ?? 0n, 18),
                    })}
                />
            )}

            <div className="oracleSetup__field">
                <label>{t("oracles.oracleSetup.labelOracleAddress")}</label>
                <Input
                    data-testid="oracle-setup-address"
                    value={addressValue}
                    placeholder={t("oracles.oracleSetup.placeholderAddress")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setOracleAddressInput(e.target.value)
                    }
                    status={addressValue && !isAddressValid ? "error" : undefined}
                />
                {addressValue && !isAddressValid && (
                    <div className="oracleSetup__field-error">
                        {t("oracles.oracleSetup.invalidAddress")}
                    </div>
                )}
                {addressValue && isAddressValid && isAddressUnchanged && (
                    <div className="oracleSetup__field-error">
                        {t("oracles.oracleSetup.addressUnchanged")}
                    </div>
                )}
            </div>

            <div className="oracleSetup__field">
                <label>{t("oracles.oracleSetup.labelOracleUrl")}</label>
                <Input
                    data-testid="oracle-setup-url"
                    value={urlValue}
                    placeholder={t("oracles.oracleSetup.placeholderUrl")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setOracleUrlInput(e.target.value)
                    }
                />
            </div>

            <div className="oracleSetup__actions">
                <Button
                    type="primary"
                    className="button"
                    disabled={
                        isBusy ||
                        isOracleRegistered ||
                        !isAddressValid ||
                        !hasEnoughStake
                    }
                    onClick={() => void onRegister()}
                    data-testid="oracle-setup-register"
                >
                    {t("oracles.oracleSetup.registerButton")}
                </Button>

                <Button
                    className="button"
                    disabled={
                        isBusy ||
                        !isOracleRegistered ||
                        !isAddressValid ||
                        isAddressUnchanged
                    }
                    onClick={() => void onUpdateAddress()}
                    data-testid="oracle-setup-update-address"
                >
                    {t("oracles.oracleSetup.updateAddressButton")}
                </Button>

                <Button
                    className="button"
                    disabled={isBusy || !isOracleRegistered}
                    onClick={() => void onUpdateUrl()}
                    data-testid="oracle-setup-update-url"
                >
                    {t("oracles.oracleSetup.updateUrlButton")}
                </Button>

                <Tooltip
                    title={
                        isOracleRegistered && !canRemoveOracle
                            ? t("oracles.oracleSetup.cannotRemoveWarning")
                            : undefined
                    }
                >
                    <span>
                        <Button
                            danger
                            className="button"
                            disabled={
                                isBusy || !isOracleRegistered || !canRemoveOracle
                            }
                            onClick={() => void onRemove()}
                            data-testid="oracle-setup-remove"
                        >
                            {t("oracles.oracleSetup.removeButton")}
                        </Button>
                    </span>
                </Tooltip>
            </div>

            {isOperationModalVisible && (
                <OperationStatusModal
                    visible={isOperationModalVisible}
                    onCancel={() => setIsOperationModalVisible(false)}
                    operationStatus={operationModalInfo.operationStatus}
                    txHash={operationModalInfo.txHash}
                    title={t("oracles.oracleSetup.modalTitle")}
                />
            )}
        </div>
    );
}
