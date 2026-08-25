import "./Styles.scss";

import { Tooltip } from "antd";
import React, { useState } from "react";
import { formatUnits, isAddress } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";
import InlineWarning from "../../InlineWarning";
import OperationStatusModal from "../../Modals/OperationStatusModal/OperationStatusModal";
import TextField from "../../TextField";

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
        oracleCoinPairs,
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

    // OracleManager._canRemoveOracle blocks removal only while the owner is
    // selected in the current round for at least one coin pair — surface
    // exactly which pair(s) rather than a generic warning.
    const blockingPairNames = oracleCoinPairs.data
        .filter((pair) => pair.isSelectedInCurrentRound)
        .map((pair) =>
            t(`oracles.coinpair.pairMask.${pair.pairName}`, {
                defaultValue: pair.pairName,
            })
        );

    const currentStake = stakingInfo?.getBalance;
    const minCPSubscriptionStake =
        contractStatusOmoc.data?.oraclemanager?.getMinCPSubscriptionStake;
    const isStakeKnown =
        typeof currentStake === "bigint" &&
        typeof minCPSubscriptionStake === "bigint";
    const hasEnoughStake =
        !isStakeKnown || currentStake >= minCPSubscriptionStake;

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
    const addressError =
        addressValue && !isAddressValid
            ? t("oracles.oracleSetup.invalidAddress")
            : addressValue && isAddressValid && isAddressUnchanged
              ? t("oracles.oracleSetup.addressUnchanged")
              : undefined;

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
            <div className="oracleSetup__header">
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
            </div>

            {isRegistrationKnown && !isOracleRegistered && !hasEnoughStake && (
                <InlineWarning className="oracleSetup__warning">
                    {t("oracles.oracleSetup.insufficientStakeWarning", {
                        minStake: formatUnits(minCPSubscriptionStake ?? 0n, 18),
                    })}
                </InlineWarning>
            )}

            <div className="oracleSetup__workspace">
                <div className="oracleSetup__form">
                    <div className="oracleSetup__fieldRow">
                        <TextField
                            className="oracleSetup__field"
                            data-testid="oracle-setup-address"
                            error={addressError}
                            id="oracle-setup-address"
                            label={t("oracles.oracleSetup.labelOracleAddress")}
                            onChange={(e) =>
                                setOracleAddressInput(e.target.value)
                            }
                            placeholder={t(
                                "oracles.oracleSetup.placeholderAddress"
                            )}
                            spellCheck={false}
                            value={addressValue}
                        />

                        <button
                            className="button--compact button--compact--secondary oracleSetup__fieldAction"
                            disabled={
                                isBusy ||
                                !isOracleRegistered ||
                                !isAddressValid ||
                                isAddressUnchanged
                            }
                            onClick={() => void onUpdateAddress()}
                            type="button"
                            data-testid="oracle-setup-update-address"
                        >
                            {t("oracles.oracleSetup.updateAddressButton")}
                        </button>
                    </div>

                    <div className="oracleSetup__fieldRow">
                        <TextField
                            className="oracleSetup__field"
                            data-testid="oracle-setup-url"
                            id="oracle-setup-url"
                            label={t("oracles.oracleSetup.labelOracleUrl")}
                            onChange={(e) => setOracleUrlInput(e.target.value)}
                            placeholder={t(
                                "oracles.oracleSetup.placeholderUrl"
                            )}
                            spellCheck={false}
                            value={urlValue}
                        />

                        <button
                            className="button--compact button--compact--secondary oracleSetup__fieldAction"
                            disabled={isBusy || !isOracleRegistered}
                            onClick={() => void onUpdateUrl()}
                            type="button"
                            data-testid="oracle-setup-update-url"
                        >
                            {t("oracles.oracleSetup.updateUrlButton")}
                        </button>
                    </div>

                    <div className="oracleSetup__actions">
                        <button
                            className="button--compact"
                            disabled={
                                isBusy ||
                                isOracleRegistered ||
                                !isAddressValid ||
                                !hasEnoughStake
                            }
                            onClick={() => void onRegister()}
                            type="button"
                            data-testid="oracle-setup-register"
                        >
                            {t("oracles.oracleSetup.registerButton")}
                        </button>

                        <Tooltip
                            title={
                                isOracleRegistered && !canRemoveOracle
                                    ? blockingPairNames.length > 0
                                        ? t(
                                              "oracles.oracleSetup.cannotRemoveInRound",
                                              {
                                                  pairs: blockingPairNames.join(
                                                      ", "
                                                  ),
                                              }
                                          )
                                        : t(
                                              "oracles.oracleSetup.cannotRemoveWarning"
                                          )
                                    : undefined
                            }
                        >
                            <span>
                                <button
                                    className="button--compact button--compact--secondary"
                                    disabled={
                                        isBusy ||
                                        !isOracleRegistered ||
                                        !canRemoveOracle
                                    }
                                    onClick={() => void onRemove()}
                                    type="button"
                                    data-testid="oracle-setup-remove"
                                >
                                    {t("oracles.oracleSetup.removeButton")}
                                </button>
                            </span>
                        </Tooltip>
                    </div>
                </div>

                <aside className="oracleSetup__requirements">
                    <div className="oracleSetup__requirements-title">
                        {t("oracles.oracleSetup.requirementsTitle")}
                    </div>
                    <div>
                        {t("oracles.oracleSetup.requirementUniqueAddress")}
                    </div>
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
                    <div className="oracleSetup__docLink">
                        <a
                            href="https://docs.moneyonchain.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t("oracles.oracleSetup.docsLink")}
                            <span className="icon-external-link"></span>
                        </a>
                    </div>
                </aside>
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
