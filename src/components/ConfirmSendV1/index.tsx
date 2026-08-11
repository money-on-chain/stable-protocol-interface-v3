import React, { useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { toBigIntPrecision } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import Button from "../Button";
import CopyAddress from "../CopyAddress";
import DisplayAmount from "../DisplayAmount";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface ConfirmSendV1Props {
    currencyYouExchange: string;
    exchangingUSD: bigint;
    amountYouExchange: string;
    destinationAddress: string;
    onCloseModal: () => void;
}

type StatusType = "SUBMIT" | "SIGN" | "WAITING" | "SUCCESS" | "ERROR";

// Mirrors components/ConfirmSend, but calls the v1-specific transfer
// interfaces (interfaceTransferTokenV1/interfaceTransferCoinbaseV1) — v1 has
// no caIndex, so there's no ConvertAmount/caIndex plumbing here at all.
export default function ConfirmSendV1(
    props: ConfirmSendV1Props
): React.ReactElement {
    const {
        currencyYouExchange,
        exchangingUSD,
        amountYouExchange,
        destinationAddress,
        onCloseModal,
    } = props;

    const { t, i18n, ns } = useProjectTranslation();
    const {
        interfaceTransferTokenV1,
        interfaceTransferCoinbaseV1,
        userBalanceV1,
        userBaseCoinBalance,
    } = useWalletContext();

    const [status, setStatus] = useState<StatusType>("SUBMIT");
    const [txID, setTxID] = useState<string>("");

    const onTransaction = (transactionHash: string): void => {
        setStatus("WAITING");
        setTxID(transactionHash);
    };

    const onReceipt = (): void => {
        setStatus("SUCCESS");
        void userBalanceV1.refetch();
        void userBaseCoinBalance.refetch();
    };

    const onSendTransaction = (): void => {
        setStatus("SIGN");
        const amountYouExchangeWei: bigint =
            toBigIntPrecision(amountYouExchange);

        if (currencyYouExchange === "CA_0") {
            void interfaceTransferCoinbaseV1(
                amountYouExchangeWei,
                destinationAddress.toLowerCase(),
                onTransaction,
                onReceipt
            ).catch((error: unknown) => {
                console.error("ConfirmSendV1 transfer error:", error);
                setStatus("ERROR");
            });
        } else {
            void interfaceTransferTokenV1(
                currencyYouExchange,
                amountYouExchangeWei,
                destinationAddress.toLowerCase(),
                onTransaction,
                onReceipt
            ).catch((error: unknown) => {
                console.error("ConfirmSendV1 transfer error:", error);
                setStatus("ERROR");
            });
        }
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
    }

    const onClose = (): void => {
        setStatus("SUBMIT");
        onCloseModal();
    };

    return (
        <div className="confirm-operation">
            <div className="tx-amount-group">
                <div className="tx-amount-container">
                    <div className="tx-amount-data">
                        <DisplayAmount
                            value={toBigIntPrecision(amountYouExchange)}
                            token={t(
                                `send.tokens.${currencyYouExchange}.abbr`,
                                { ns: ns }
                            )}
                            decimals={
                                TokenSettings(currencyYouExchange)
                                    .visibleDecimals
                            }
                        />
                    </div>
                    <div className="tx-direction">
                        <div className="swapArrow">
                            <div className="icon-arrow-down"></div>
                        </div>
                    </div>
                    <div className="tx-destination-address">
                        {destinationAddress}
                    </div>
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
                                    i18n: i18n,
                                    compact: true,
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
                            className="button secondary"
                            onClick={onClose}
                        >
                            {t("send.buttonCancel")}
                        </Button>
                        <button
                            type="button"
                            data-testid="confirm-send-v1-submit"
                            className="button"
                            onClick={onSendTransaction}
                        >
                            {t("send.buttonConfirm")}
                        </button>
                    </div>
                </div>
            )}
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div
                        className="tx-feedback-container"
                        data-testid={
                            status === "SUCCESS"
                                ? "confirm-send-v1-success"
                                : undefined
                        }
                    >
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
                                data-testid="button-close-send-v1"
                            >
                                {t("send.buttonClose")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
