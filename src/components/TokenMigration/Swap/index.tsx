import "./style.scss";

import { Button } from "antd";
import PropTypes from "prop-types";
import React, { useState } from "react";

import { useWalletContext } from "../../../context/Wallet";
import { TokenSettings } from "../../../helpers/currencies";
import { useProjectTranslation } from "../../../helpers/translations";
import Copy from "../../Copy";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import TokenMigratePNG from "./../../../assets/icons/tokenmigrate.png";

interface SwapTokenProps {
    onCloseModal: () => void;
}

type StatusType =
    | "SUBMIT"
    | "CONFIRM"
    | "ALLOWANCE-SIGN"
    | "ALLOWANCE-WAITING"
    | "ALLOWANCE-ERROR"
    | "TOKEN-MIGRATION-SIGN"
    | "TOKEN-MIGRATION-WAITING"
    | "TOKEN-MIGRATION-SUCCESS"
    | "TOKEN-MIGRATION-ERROR";

const SwapToken = (props: SwapTokenProps): JSX.Element => {
    const { onCloseModal } = props;

    const [status, setStatus] = useState<StatusType>("SUBMIT");
    const [txID, setTxID] = useState<string>(
        "0x0000000000000000000000000000000000000000"
    );

    const { t, i18n } = useProjectTranslation();
    const {
        interfaceMigrateToken,
        interfaceAllowUseTokenMigrator,
        userBalance,
    } = useWalletContext();

    const onClose = (): void => {
        setStatus("SUBMIT");
        onCloseModal();
    };

    const onSubmit = (): void => {
        setStatus("CONFIRM");
    };

    const onSuccess = (): void => {
        setStatus("TOKEN-MIGRATION-SUCCESS");
    };

    const TruncateAddress = (address: string): string => {
        return (
            address.substring(0, 6) +
            "..." +
            address.substring(address.length - 4, address.length)
        );
    };

    const onTokenMigration = (): void => {
        // First change status to sign tx
        setStatus("TOKEN-MIGRATION-SIGN");
        void interfaceMigrateToken(
            onTransactionTokenMigration,
            onReceiptTokenMigration,
            onErrorTokenMigration
        )
            .then((/*value*/) => {
                onSuccess();
            })
            .catch((/*response*/) => {
                onClose();
            });
    };

    const onTransactionTokenMigration = (transactionHash: string): void => {
        // Tx receipt detected change status to waiting
        setStatus("TOKEN-MIGRATION-WAITING");
        console.warn("On transaction token migration: ", transactionHash);
        setTxID(transactionHash);
    };

    const onReceiptTokenMigration = (receipt: unknown): void => {
        // Tx is mined ok proceed with operation transaction
        console.warn("On receipt token migration: ", receipt);
        /*
        // Events name list
        const filter = [
            'OperationError',
            'UnhandledError',
            'OperationQueued',
            'OperationExecuted'
        ];

        const contractName = 'MocQueue';

        const txRcp = await auth.web3.eth.getTransactionReceipt(
            receipt.transactionHash
        );
        const filteredEvents = decodeEvents(txRcp, contractName, filter);
         */
    };

    const onErrorTokenMigration = (error: unknown): void => {
        // Tx error
        setStatus("TOKEN-MIGRATION-ERROR");
        console.error("Transaction error: ", error);
    };

    const onAuthorize = (): void => {
        // First change status to sign tx

        setStatus("ALLOWANCE-SIGN");

        if (!userBalance.data || !userBalance.data.tpLegacy) {
            console.error("tpLegacy data not available");
            return;
        }

        const allowanceAmount = userBalance.data.tpLegacy.balance;
        const oldAllowanceAmount = userBalance.data.tpLegacy.allowance || 0n;

        if (oldAllowanceAmount >= allowanceAmount) {
            onTokenMigration();
        } else {
            void interfaceAllowUseTokenMigrator(
                allowanceAmount,
                onTransactionAuthorize,
                onReceiptAuthorize,
                onErrorAuthorize
            )
                .then((/*value*/) => {
                    onTokenMigration();
                })
                .catch((/*response*/) => {
                    onClose();
                });
        }
    };

    const onTransactionAuthorize = (transactionHash: string): void => {
        // Tx receipt detected change status to waiting
        setStatus("ALLOWANCE-WAITING");
        console.warn("On transaction authorize: ", transactionHash);
        setTxID(transactionHash);
    };

    const onReceiptAuthorize = (receipt: unknown): void => {
        // Tx is mined ok proceed with operation transaction
        console.warn("On receipt authorize: ", receipt);
        /*
        // Events name list
        const filter = [
            'OperationError',
            'UnhandledError',
            'OperationQueued',
            'OperationExecuted'
        ];

        const contractName = 'MocQueue';

        const txRcp = await auth.web3.eth.getTransactionReceipt(
            receipt.transactionHash
        );
        const filteredEvents = decodeEvents(txRcp, contractName, filter);
         */
    };

    const onErrorAuthorize = (error: unknown): void => {
        // Tx Authorize error
        setStatus("TOKEN-MIGRATION-ERROR");
        console.error("Transaction error: ", error);
    };

    const onConfirm = (): void => {
        switch (status) {
            case "SUBMIT":
                onSubmit();
                break;
            case "CONFIRM":
                onAuthorize();
                break;
            case "TOKEN-MIGRATION-SUCCESS":
                onClose();
                break;
            default:
                onSubmit();
        }
    };

    let title: string;
    let btnLabel: string = t("swapModal.buttonConfirm");
    let btnDisable: boolean = false;

    if (!userBalance.data || !userBalance.data.tpLegacy) {
        console.error("tpLegacy data not available");
        return <div>Error: Token data not available</div>;
    }

    const tpLegacyBalance = userBalance.data.tpLegacy.balance;

    switch (status) {
        case "SUBMIT":
            title = t("swapModal.modalTitle1");
            btnLabel = t("defaultCTA.buttonSubmit");
            break;
        case "CONFIRM":
            title = t("swapModal.modalTitle2");
            btnLabel = t("defaultCTA.buttonExchange");
            if (tpLegacyBalance === 0n) btnDisable = true;
            break;
        case "ALLOWANCE-SIGN":
        case "ALLOWANCE-WAITING":
        case "ALLOWANCE-ERROR":
            title = t("swapModal.authorizing");
            break;
        case "TOKEN-MIGRATION-SIGN":
        case "TOKEN-MIGRATION-WAITING":
        case "TOKEN-MIGRATION-ERROR":
            title = t("swapModal.migrating");
            break;
        case "TOKEN-MIGRATION-SUCCESS":
            title = t("swapModal.migrating");
            btnLabel = t("defaultCTA.buttonClose");
            break;
        default:
            title = "IMPORTANT NOTICE";
            btnLabel = t("defaultCTA.buttonSubmit");
    }

    return (
        <div className="Content">
            <div className="Title">{title}</div>
            <div className="Body">
                {status === "SUBMIT" && (
                    <div>
                        <p>{t("swapModal.explanation1")}</p>
                        <p>
                            <strong>{t("swapModal.explanation2")}</strong>
                        </p>
                        <p>{t("swapModal.explanation3")}</p>
                    </div>
                )}

                {status === "CONFIRM" && (
                    <div>
                        <div className="TokenIcon">
                            <img
                                className={""}
                                src={TokenMigratePNG}
                                alt="Token Migrate"
                            />
                        </div>
                        <div className="Summary">
                            <div className="Exchanging">
                                <div className="Label">
                                    {t("swapModal.exchanging")}{" "}
                                </div>
                                <div className="Amount">
                                    <div className="Value">
                                        {PrecisionNumbers({
                                            amount: userBalance.data.tpLegacy
                                                .balance,
                                            token: TokenSettings("TP_0"),
                                            decimals: 4,
                                            i18n: i18n,
                                        })}
                                    </div>
                                    <div className="Token">RDOC</div>
                                </div>
                            </div>
                            <div className="Receiving">
                                <div className="Label">
                                    {t("swapModal.receiving")}{" "}
                                </div>
                                <div className="Amount">
                                    <div className="Value">
                                        {PrecisionNumbers({
                                            amount: userBalance.data.tpLegacy
                                                .balance,
                                            token: TokenSettings("TP_0"),
                                            decimals: 4,
                                            i18n: i18n,
                                        })}
                                    </div>
                                    <div className="Token">USDRIF</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {status === "ALLOWANCE-SIGN" && (
                    <div>
                        <div className="tx-logo-status">
                            <i className="icon-tx-signWallet"></i>
                        </div>
                        <p className="Center">
                            {t("swapModal.allowanceSignText")}
                        </p>
                    </div>
                )}

                {status === "ALLOWANCE-WAITING" && (
                    <div>
                        {/*ALLOWANCE-WAITING*/}
                        <div className="tx-logo-status">
                            <i className="icon-tx-waiting rotate"></i>
                        </div>
                        <p>{t("swapModal.allowanceWaiting")}</p>
                        <p>
                            {t("swapModal.transactionHash")}
                            <Copy
                                textToShow={TruncateAddress(txID)}
                                textToCopy={txID}
                                typeUrl={"tx"}
                            />
                        </p>
                    </div>
                )}

                {status === "ALLOWANCE-ERROR" && (
                    <div>
                        {" "}
                        {/*ALLOWANCE-ERROR*/}
                        <div className="tx-logo-status">
                            <i className="icon-tx-error"></i>
                        </div>
                        <p className="Center">
                            {t("swapModal.operationFailed")}
                        </p>
                        <p className="Center">
                            {t("swapModal.transactionHash")}
                            <Copy
                                textToShow={TruncateAddress(txID)}
                                textToCopy={txID}
                                typeUrl={"tx"}
                            />
                        </p>
                    </div>
                )}

                {status === "TOKEN-MIGRATION-SIGN" && (
                    <div>
                        <div className="tx-logo-status">
                            <i className="icon-tx-signWallet"></i>
                        </div>
                        <p className="Center">
                            {t("swapModal.migrationTransactionSignText")}
                        </p>
                    </div>
                )}

                {status === "TOKEN-MIGRATION-WAITING" && (
                    <div>
                        {" "}
                        {/*TOKEN-MIGRATION-WAITING*/}
                        <div className="tx-logo-status">
                            <i className="icon-tx-waiting rotate"></i>
                        </div>
                        <p>{t("swapModal.tokenMigrationWaitingText")}</p>
                        <p>
                            {t("swapModal.transactionHash")}
                            <Copy
                                textToShow={TruncateAddress(txID)}
                                textToCopy={txID}
                                typeUrl={"tx"}
                            />
                        </p>
                    </div>
                )}

                {status === "TOKEN-MIGRATION-SUCCESS" && (
                    <div>
                        {" "}
                        {/* TOKEN-MIGRATION-SUCCESS */}
                        <div className="tx-logo-status">
                            <i className="icon-tx-success"></i>
                        </div>
                        <p className="Center">
                            {t("swapModal.operationSuccessful")}
                        </p>
                        <p className="Center">
                            {t("swapModal.transactionHash")}
                            <Copy
                                textToShow={TruncateAddress(txID)}
                                textToCopy={txID}
                                typeUrl={"tx"}
                            />
                        </p>
                    </div>
                )}

                {status === "TOKEN-MIGRATION-ERROR" && (
                    <div>
                        <div className="tx-logo-status">
                            <i className="icon-tx-error"></i>
                        </div>
                        <p className="Center">
                            {t("swapModal.operationFailed")}
                        </p>
                        <p className="Center">
                            {t("swapModal.transactionHash")}
                            <Copy
                                textToShow={TruncateAddress(txID)}
                                textToCopy={txID}
                                typeUrl={"tx"}
                            />
                        </p>
                    </div>
                )}
            </div>
            <div className="cta-container">
                <div className="cta-options-group">
                    {status !== "TOKEN-MIGRATION-SUCCESS" &&
                        status !== "ALLOWANCE-WAITING" &&
                        status !== "TOKEN-MIGRATION-WAITING" &&
                        status !== "TOKEN-MIGRATION-ERROR" &&
                        status !== "ALLOWANCE-ERROR" && (
                            <Button
                                type="default"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("defaultCTA.buttonClose")}
                            </Button>
                        )}
                    {(status === "SUBMIT" || status === "CONFIRM") && (
                        <Button
                            className="button"
                            type="primary"
                            disabled={btnDisable}
                            onClick={onConfirm}
                        >
                            {btnLabel}
                        </Button>
                    )}
                    {status === "TOKEN-MIGRATION-SUCCESS" && (
                        <Button
                            className="button"
                            type="primary"
                            disabled={btnDisable}
                            onClick={onConfirm}
                        >
                            {btnLabel}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SwapToken;

SwapToken.propTypes = {
    onCloseModal: PropTypes.func,
};
