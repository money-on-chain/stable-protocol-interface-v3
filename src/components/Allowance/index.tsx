import { Checkbox } from "antd";
import PropTypes from "prop-types";
import React, { useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { useProjectTranslation } from "../../helpers/translations";

const PRECISION_DECIMALS = 18n;
const DECIMALS_18 = 10n ** PRECISION_DECIMALS;

interface AllowanceDialogProps {
    onCloseModal: () => void;
    currencyYouExchange: string;
    currencyYouReceive: string;
    amountYouExchangeLimit: bigint;
    //amountYouReceiveLimit: BigNumber;
    onRealSendTransaction: () => void;
    disAllowance?: boolean;
}

type StatusType = "SUBMIT" | "SIGN" | "WAITING" | "ERROR";

export default function AllowanceDialog(
    props: AllowanceDialogProps
): JSX.Element {
    const {
        onCloseModal,
        currencyYouExchange,
        currencyYouReceive,
        amountYouExchangeLimit,
        //amountYouReceiveLimit,
        onRealSendTransaction,
        disAllowance,
    } = props;

    const { t } = useProjectTranslation();
    const { interfaceAllowanceAmount } = useWalletContext();

    const [status, setStatus] = useState<StatusType>("SUBMIT");
    let infinityAllowance: boolean = false;

    let sentIcon: string = "";
    let statusLabel: string = "";
    switch (status) {
        case "SUBMIT":
            sentIcon = "icon-tx-waiting";
            statusLabel = t("allowance.feedback.submit");
            break;
        case "SIGN":
            sentIcon = "icon-tx-signWallet";
            statusLabel = t("allowance.feedback.sign");
            break;
        case "WAITING":
            sentIcon = "icon-tx-waiting";
            statusLabel = t("allowance.feedback.waiting");
            break;
        case "ERROR":
            sentIcon = "icon-tx-error";
            statusLabel = t("allowance.feedback.error");
            break;
        default:
            sentIcon = "icon-tx-waiting";
            statusLabel = t("allowance.feedback.default");
    }

    const onChange = (e: { target: { checked: boolean } }): void => {
        infinityAllowance = e.target.checked;
    };

    const reset = (): void => {
        setStatus("SUBMIT");
        infinityAllowance = false;
    };

    const onClose = (): void => {
        reset();
        onCloseModal();
    };

    const onAuthorize = (): void => {
        // First change status to sign tx
        //amountAllowance = new BigNumber(1000) //Number.MAX_SAFE_INTEGER.toString()
        let amountAllowance: bigint;
        if (infinityAllowance) {
            amountAllowance = 100000000n * DECIMALS_18; // very high value
        } else {
            amountAllowance = amountYouExchangeLimit;
        }

        if (disAllowance) {
            // Disallow to use the Token with amount 0
            amountAllowance = 0n;
        }

        setStatus("SIGN");
        void interfaceAllowanceAmount(
            currencyYouExchange,
            currencyYouReceive,
            amountAllowance,
            onTransaction,
            onReceipt
        )
            .then((/*value*/) => {
                onClose();
            })
            .catch((error: unknown) => {
                console.error("Allowance error:", error);
                setStatus("ERROR");
            });
    };

    const onTransaction = (transactionHash: string): void => {
        // Tx receipt detected change status to waiting
        setStatus("WAITING");
    };

    const onReceipt = (receipt: unknown): void => {
        // Tx is mined ok proceed with operation transaction
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
        onRealSendTransaction();
    };

    return (
        <div className="AllowanceDialog">
            <div className="tx-amount-group">
                {status === "SUBMIT" && (
                    <div className="tx-feedback-container">
                        {disAllowance ? (
                            <div className="tx-feedback-text">
                                {t("allowance.statusDisallowanceText")}
                            </div>
                        ) : (
                            <div className="tx-feedback-text">
                                {t("allowance.statusText1")}
                                <br />
                                {t("allowance.statusText2")}
                            </div>
                        )}
                        <div className="option-checkbox">
                            {!disAllowance && (
                                <Checkbox
                                    className="check-unlimited"
                                    onChange={onChange}
                                >
                                    {t("allowance.setUnlimited")}
                                </Checkbox>
                            )}
                        </div>
                        <div className="cta-container">
                            <div className="cta-options-group">
                                <button
                                    type="button"
                                    className="button secondary"
                                    onClick={onClose}
                                >
                                    {t("allowance.confirm.cancel")}
                                </button>
                                <button
                                    type="button"
                                    className="button"
                                    onClick={onAuthorize}
                                >
                                    {t("allowance.confirm.authorize")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {(status === "SIGN" ||
                    status === "WAITING" ||
                    status === "ERROR") && (
                    <div className="tx-amount-group">
                        <div className="tx-feedback-container">
                            <div className="tx-feedback-text">
                                {statusLabel}
                            </div>
                            <div className="tx-feedback-icon tx-logo-status">
                                <div className={sentIcon}></div>
                            </div>
                        </div>
                        <div className="cta-container">
                            <div className="cta-options-group">
                                <button
                                    type="button"
                                    className="button secondary"
                                    onClick={onClose}
                                >
                                    {t("allowance.confirm.cancel")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>{" "}
        </div>
    );
}

AllowanceDialog.propTypes = {
    onCloseModal: PropTypes.func,
    currencyYouExchange: PropTypes.string,
    currencyYouReceive: PropTypes.string,
    amountYouExchangeLimit: PropTypes.object,
    onRealSendTransaction: PropTypes.func,
    disAllowance: PropTypes.bool,
};
