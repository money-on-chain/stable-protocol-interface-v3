import { Button } from "antd";
import PropTypes from "prop-types";
import React, { useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { toBigIntPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import CopyAddress from "../CopyAddress";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface ConfirmSendProps {
    currencyYouExchange: string;
    exchangingUSD: bigint;
    amountYouExchange: string;
    destinationAddress: string;
    onCloseModal: () => void;
}

type StatusType = "SUBMIT" | "SIGN" | "WAITING" | "SUCCESS" | "ERROR";

export default function ConfirmSend(props: ConfirmSendProps): JSX.Element {
    const {
        currencyYouExchange,
        exchangingUSD,
        amountYouExchange,
        destinationAddress,
        onCloseModal,
    } = props;

    const { t, i18n, ns } = useProjectTranslation();    
    const { interfaceTransferToken, interfaceTransferCoinbase, userBalance } = useWalletContext()

    const [status, setStatus] = useState<StatusType>("SUBMIT");
    const [txID, setTxID] = useState<string>("");

    const onSendTransaction = (): void => {
        // Real send transaction
        setStatus("SIGN");
        const amountYouExchangeWei: bigint = toBigIntPrecision(amountYouExchange);

        if (currencyYouExchange === "COINBASE") {
            interfaceTransferCoinbase(
                amountYouExchangeWei,
                destinationAddress.toLowerCase(),
                onTransaction,
                onReceipt
            )
                .then((/*value*/) => {
                    console.log("DONE!");
                })
                .catch((error: any) => {
                    console.log("ERROR");
                    setStatus("ERROR");
                    console.log(error);
                });
        } else {
            interfaceTransferToken(
                currencyYouExchange,
                amountYouExchangeWei,
                destinationAddress.toLowerCase(),
                onTransaction,
                onReceipt
            )
                .then((/*value*/) => {
                    console.log("DONE!");
                })
                .catch((error: any) => {
                    console.log("ERROR");
                    setStatus("ERROR");
                    console.log(error);
                });
        }
    };

    const onTransaction = (transactionHash: string): void => {
        // Tx receipt detected change status to waiting
        setStatus("WAITING");
        console.log("On transaction: ", transactionHash);
        setTxID(transactionHash);
    };

    const onReceipt = async (receipt: any): Promise<void> => {
        // Tx is mined ok
        console.log("On receipt: ", receipt);

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

        setStatus("SUCCESS");

        // Refresh user balance
        userBalance.refetch();
    };

    let sentIcon: string = "";
    let statusLabel: string = "";
    switch (status) {
        case "SUBMIT":
            sentIcon = "icon-tx-waiting ";
            statusLabel = t("send.feedback.submit");
            break;
        case "SIGN":
            sentIcon = "icon-tx-signWallet";
            statusLabel = t("send.feedback.sign");
            break;
        case "WAITING":
            sentIcon = "icon-tx-waiting ";
            statusLabel = t("send.feedback.waiting");
            break;
        case "SUCCESS":
            sentIcon = "icon-tx-success";
            statusLabel = t("send.feedback.success");
            break;
        case "ERROR":
            sentIcon = "icon-tx-error";
            statusLabel = t("send.feedback.error");
            break;
        default:
            sentIcon = "icon-tx-waiting ";
            statusLabel = t("send.feedback.default");
    }

    const onClose = (): void => {
        setStatus("SUBMIT");
        onCloseModal();
    };

    return (
        <div className="confirm-operation">
            {/* <div className="exchange"> */}
            <div className="tx-amount-group">
                <div className="tx-amount-container">
                    <div className="tx-amount-data">
                        <div className="tx-amount">
                            {PrecisionNumbers({
                                amount: toBigIntPrecision(amountYouExchange),
                                token: TokenSettings(currencyYouExchange),
                                decimals: 8,
                                i18n: i18n                                
                            })}
                        </div>
                        <div className="tx-token">
                            {t(`send.tokens.${currencyYouExchange}.abbr`, {
                                ns: ns,
                            })}
                        </div>
                    </div>
                    <div className="tx-direction">
                        <div className="swapArrow">
                            <div className="icon-arrow-down"></div>
                        </div>
                    </div>
                    {/* <div className="swapTo"> */}
                    <div className="tx-destination-address">
                        {destinationAddress}
                    </div>
                    {/* </div> */}
                </div>
            </div>
            {status === "SUBMIT" && (
                <div className="cta-container">
                    <div className="cta-info-group">
                        <div className="cta-info-summary">
                            <div className={"token_exchange"}>
                                {t("send.sendingSummary")}{" "}
                            </div>
                            <div className={"symbol"}>
                                {" "}
                                {t("send.sendingSign")}{" "}
                            </div>
                            <div className={"token_receive"}>
                                {PrecisionNumbers({
                                    amount: exchangingUSD,
                                    token: TokenSettings("CA_0"),
                                    decimals: 8,
                                    i18n: i18n                                    
                                })}
                            </div>

                            <div className={"token_receive_name"}>
                                {" "}
                                {t("send.sendingCurrency")}
                            </div>
                        </div>
                    </div>
                    <div className="cta-options-group">
                        <Button
                            type="default"
                            className={
                                import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT.toLowerCase()
                                    ? "button secondary"
                                    : "button secondary"
                            }
                            onClick={onClose}
                        >
                            {t("send.buttonCancel")}
                        </Button>
                        <button
                            type="button"
                            className={
                                import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT.toLowerCase()
                                    ? `button`
                                    : `button`
                            }
                            onClick={onSendTransaction}
                        >
                            {t("send.buttonConfirm")}
                        </button>
                    </div>
                </div>
            )}
            {/* </div> */}
            {(status === "SIGN" ||
                status === "WAITING" ||
                status === "SUCCESS" ||
                status === "ERROR") && (
                <div className="conditional-wrapper">
                    {(status === "WAITING" ||
                        status === "SUCCESS" ||
                        status === "ERROR") && (
                        <div className="tx-id-container">
                            <div className="tx-id-data status">
                                <div className="tx-id-data">
                                    <div className="tx-id-label">
                                        {t("send.labelTransactionID")}
                                    </div>
                                    <div className="tx-id-address">
                                        <CopyAddress
                                            address={txID}
                                            type={"tx"}
                                        ></CopyAddress>
                                        {/*<span className="address">*/}
                                        {/*    {truncateTxId(txID)}*/}
                                        {/*</span>*/}
                                        {/*<i className="icon-copy"></i>*/}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}{" "}
                    <div className="tx-feedback-container">
                        <div className="tx-feedback-icon tx-logo-status">
                            <div className={sentIcon}></div>
                        </div>
                        <div className="tx-feedback-text">{statusLabel}</div>
                    </div>
                    <div className="cta-container">
                        <div className="cta-options-group">
                            <button
                                type="button"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("send.buttonClose")}
                            </button>
                        </div>
                    </div>
                </div>
            )}{" "}
        </div>
    );
}

ConfirmSend.propTypes = {
    currencyYouExchange: PropTypes.string,
    exchangingUSD: PropTypes.object,
    amountYouExchange: PropTypes.string,
    destinationAddress: PropTypes.string,
    onCloseModal: PropTypes.func,
};
