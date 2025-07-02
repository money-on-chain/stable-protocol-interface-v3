import React, { useContext, useState } from "react";
import { Button } from "antd";
import BigNumber from "bignumber.js";
import Web3 from "web3";
import PropTypes from "prop-types";

import { useProjectTranslation } from "../../../helpers/translations";
import { AuthenticateContext } from "../../../context/Auth";
import TokenMigratePNG from "./../../../assets/icons/tokenmigrate.png";
import Copy from "../../Copy";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import { TokenSettings } from "../../../helpers/currencies";
import "./style.scss";

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
    const auth = useContext(AuthenticateContext);

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
        auth.interfaceMigrateToken(
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
        console.log("On transaction token migration: ", transactionHash);
        setTxID(transactionHash);
    };

    const onReceiptTokenMigration = async (receipt: any): Promise<void> => {
        // Tx is mined ok proceed with operation transaction
        console.log("On receipt token migration: ", receipt);
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

    const onErrorTokenMigration = async (error: any): Promise<void> => {
        // Tx error
        setStatus("TOKEN-MIGRATION-ERROR");
        console.log("Transaction error: ", error);
    };

    const onAuthorize = (): void => {
        // First change status to sign tx

        setStatus("ALLOWANCE-SIGN");

        if (!auth.userBalanceData || !(auth.userBalanceData as any).tpLegacy) {
            console.error("tpLegacy data not available");
            return;
        }

        const allowanceAmount = new BigNumber(
            Web3.utils.fromWei((auth.userBalanceData as any).tpLegacy.balance, "ether")
        );
        const oldAllowanceAmount = new BigNumber(
            Web3.utils.fromWei((auth.userBalanceData as any).tpLegacy.allowance, "ether")
        );

        if (oldAllowanceAmount.gte(allowanceAmount)) {
            onTokenMigration();
        } else {
            auth.interfaceAllowUseTokenMigrator(
                allowanceAmount.toString(),
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
        console.log("On transaction authorize: ", transactionHash);
        setTxID(transactionHash);
    };

    const onReceiptAuthorize = async (receipt: any): Promise<void> => {
        // Tx is mined ok proceed with operation transaction
        console.log("On receipt authorize: ", receipt);
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

    const onErrorAuthorize = async (error: any): Promise<void> => {
        // Tx Authorize error
        setStatus("TOKEN-MIGRATION-ERROR");
        console.log("Transaction error: ", error);
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
    
    if (!auth.userBalanceData || !(auth.userBalanceData as any).tpLegacy) {
        console.error("tpLegacy data not available");
        return <div>Error: Token data not available</div>;
    }
    
    const tpLegacyBalance = new BigNumber(
        Web3.utils.fromWei((auth.userBalanceData as any).tpLegacy.balance, "ether")
    );
    
    switch (status) {
        case "SUBMIT":
            title = t("swapModal.modalTitle1");
            btnLabel = t("defaultCTA.buttonSubmit");
            break;
        case "CONFIRM":
            title = t("swapModal.modalTitle2");
            btnLabel = t("defaultCTA.buttonExchange");
            if (tpLegacyBalance.eq(0)) btnDisable = true;
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
                                            amount: (auth.userBalanceData as any)
                                                .tpLegacy.balance,
                                            token: TokenSettings("TP_0"),
                                            decimals: 4,
                                            numericLabelParams: {},
                                            i18n: i18n,
                                            skipContractConvert: false,
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
                                            amount: (auth.userBalanceData as any)
                                                .tpLegacy.balance,
                                            token: TokenSettings("TP_0"),
                                            decimals: 4,
                                            numericLabelParams: {},
                                            i18n: i18n,
                                            skipContractConvert: false,
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
