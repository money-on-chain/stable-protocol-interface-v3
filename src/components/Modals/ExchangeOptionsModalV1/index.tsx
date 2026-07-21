import { Button, Modal } from "antd";
import React, { Fragment, useEffect, useState } from "react";
import type { TransactionReceipt } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { TokenSettings } from "../../../helpers/currencies";
import { useProjectTranslation } from "../../../helpers/translations";
import CopyAddress from "../../CopyAddress";
import DisplayAmount from "../../DisplayAmount";
import { PrecisionNumbers } from "../../PrecisionNumbers";

export type ExchangeModeV1 = "mintBPro" | "mintDoc" | "redeemBPro" | "redeemDoc";

// Snapshot of everything the confirm dialog needs to render, captured by
// ExchangeV1 at submit time (see its onSubmitButton/onAllowanceApproved) so
// the modal's numbers stay frozen even though the values it's built from
// (amountYouExchange, selectedFeeCurrency, etc.) are live component state.
export interface ExchangeConfirmDataV1 {
    mode: ExchangeModeV1;
    amount: bigint;
    receiveAmount: bigint;
    exchangingUSD: bigint;
    feeAmount: bigint;
    feeToken: string;
    feePercent: bigint;
    feeUSD: bigint;
}

type TxStatus = "confirm" | "sign" | "pending" | "success" | "error";

interface ExchangeOptionsModalV1Props {
    data: ExchangeConfirmDataV1 | null;
    visible: boolean;
    onClose: () => void;
    onConfirm: (status: string, txHash: string) => void;
}

// The source ("you exchange") token — RBTC for mint, BPro/DOC for redeem —
// matching what interfaceMintBProV1/etc. actually take as their first
// argument (see backend/v1/moc-v1.ts).
const MODE_TOKEN: Record<ExchangeModeV1, string> = {
    mintBPro: "CA_0",
    mintDoc: "CA_0",
    redeemBPro: "TC_0",
    redeemDoc: "TP_0",
};

// The token the user actually receives — the mirror image of MODE_TOKEN.
const MODE_RECEIVE_TOKEN: Record<ExchangeModeV1, string> = {
    mintBPro: "TC_0",
    mintDoc: "TP_0",
    redeemBPro: "CA_0",
    redeemDoc: "CA_0",
};

const STATUS_ICON: Record<Exclude<TxStatus, "confirm">, string> = {
    sign: "icon-tx-signWallet",
    pending: "icon-tx-waiting",
    success: "icon-tx-success",
    error: "icon-tx-error",
};

export default function ExchangeOptionsModalV1(
    props: ExchangeOptionsModalV1Props
): React.ReactElement | null {
    const { data, visible, onClose, onConfirm } = props;
    const { t, i18n } = useProjectTranslation();
    const {
        interfaceMintBProV1,
        interfaceMintDocV1,
        interfaceRedeemBProV1,
        interfaceRedeemFreeDocV1,
        userBalanceV1,
        userBaseCoinBalance,
    } = useWalletContext();

    const [status, setStatus] = useState<TxStatus>("confirm");
    const [txHash, setTxHash] = useState<string>("");

    // Each new confirm attempt hands in a fresh `data` snapshot (see
    // ExchangeV1's buildModalData) — reset back to the confirm step whenever
    // that happens, so a previous operation's SUCCESS/ERROR screen never
    // bleeds into the next one.
    useEffect(() => {
        if (data) {
            setStatus("confirm");
            setTxHash("");
        }
    }, [data]);

    if (!data) return null;

    const { mode, amount, receiveAmount, exchangingUSD, feeAmount, feeToken, feePercent, feeUSD } =
        data;

    const isMint = mode === "mintBPro" || mode === "mintDoc";
    const sourceToken = MODE_TOKEN[mode];
    const receiveToken = MODE_RECEIVE_TOKEN[mode];

    const statusLabels: Record<Exclude<TxStatus, "confirm">, string> = {
        sign: t("staking.modal.StatusModal_Modal_TxStatus_sign"),
        pending: t("staking.modal.StatusModal_Modal_TxStatus_pending"),
        success: t("staking.modal.StatusModal_Modal_TxStatus_success"),
        error: t("staking.modal.StatusModal_Modal_TxStatus_failed"),
    };

    const onSubmit = async (): Promise<void> => {
        setStatus("sign");
        onConfirm("sign", "");

        const onTransaction = (hash: string): void => {
            setTxHash(hash);
            setStatus("pending");
            onConfirm("pending", hash);
        };
        const onReceipt = (): void => {
            // no-op — status/balance are refreshed after the receipt below
        };

        let receipt: TransactionReceipt | undefined;
        try {
            switch (mode) {
                case "mintBPro":
                    receipt = await interfaceMintBProV1(
                        amount,
                        onTransaction,
                        onReceipt
                    );
                    break;
                case "mintDoc":
                    receipt = await interfaceMintDocV1(
                        amount,
                        onTransaction,
                        onReceipt
                    );
                    break;
                case "redeemBPro":
                    receipt = await interfaceRedeemBProV1(
                        amount,
                        onTransaction,
                        onReceipt
                    );
                    break;
                case "redeemDoc":
                    receipt = await interfaceRedeemFreeDocV1(
                        amount,
                        onTransaction,
                        onReceipt
                    );
                    break;
            }
        } catch (error) {
            console.error(error);
            setStatus("error");
            onConfirm("error", "");
            return;
        }

        if (!receipt) return;

        const finalStatus = receipt.status === "success" ? "success" : "error";
        setStatus(finalStatus);
        onConfirm(finalStatus, receipt.transactionHash);

        void userBalanceV1.refetch();
        void userBaseCoinBalance.refetch();
    };

    return (
        <Modal
            className="ExchangeOptionsModalV1"
            width={505}
            open={visible}
            onCancel={onClose}
            footer={null}
            centered={true}
            closable={false}
            maskClosable={false}
        >
            <Fragment>
                <h1 className="StakingOptionsModal_Title">
                    {isMint
                        ? t("exchange.v1.confirmMintTitle")
                        : t("exchange.v1.confirmRedeemTitle")}
                </h1>

                <div className="tx-amount-group">
                    <div className="tx-amount-container">
                        <div className="tx-amount-data">
                            <DisplayAmount
                                label={
                                    isMint
                                        ? t("exchange.labelSendingMint")
                                        : t("exchange.labelSending")
                                }
                                value={amount}
                                token={t(`exchange.tokens.${sourceToken}.abbr`)}
                                decimals={amount < 1n ? 12 : 8}
                            />
                        </div>
                    </div>
                    <div className="tx-direction">
                        <div className="swapArrow">
                            <div className="icon-arrow-down"></div>
                        </div>
                    </div>
                    <div className="tx-amount-container">
                        <div className="tx-amount-data">
                            <DisplayAmount
                                label={
                                    isMint
                                        ? t("exchange.labelReceiving")
                                        : t("exchange.labelReceivingRedeem")
                                }
                                value={receiveAmount}
                                token={t(
                                    `exchange.tokens.${receiveToken}.abbr`
                                )}
                                decimals={receiveAmount < 1n ? 12 : 8}
                            />
                        </div>
                    </div>
                </div>

                <div className="divider-horizontal"></div>

                {!isMint && (
                    <div className="cta-info-detail">
                        {t("exchange.v1.confirmDescriptionRedeem")}
                    </div>
                )}

                <div className="tx-fees-container">
                    <div className="tx-fees-data">
                        <div className="tx-fees-item">
                            <span className="token_exchange">
                                {t("fees.labelFee")} (
                                {PrecisionNumbers({
                                    amount: feePercent,
                                    token: TokenSettings(feeToken),
                                    decimals: 2,
                                    i18n: i18n,
                                    compact: true,
                                })}
                                %)
                            </span>
                            <span className="symbol"> ≈ </span>
                            <span className="token_receive">
                                {PrecisionNumbers({
                                    amount: feeAmount,
                                    decimals: 8,
                                    token: TokenSettings(feeToken),
                                    i18n: i18n,
                                    compact: true,
                                })}
                            </span>
                            <span className="token_receive_name">
                                {" "}
                                {t(`exchange.tokens.${feeToken}.abbr`)}
                            </span>
                            <span> (</span>
                            <span>
                                {PrecisionNumbers({
                                    amount: feeUSD,
                                    decimals: 6,
                                    token: TokenSettings("CA_0"),
                                    i18n: i18n,
                                    isUSD: true,
                                    compact: true,
                                })}
                            </span>
                            <span> {t("exchange.exchangingCurrency")}</span>
                            <span>) </span>
                        </div>
                    </div>
                    <div className="tx-fees-info">
                        {t("fees.disclaimer2")}
                        {isMint && (
                            <>
                                <br />
                                {t("exchange.v1.estimatedMaxRbtc")}
                            </>
                        )}
                    </div>
                </div>

                {status === "confirm" && (
                    <div className="cta-container">
                        <div className="cta-info-group">
                            <div className="cta-info-summary">
                                <div className="token_exchange">
                                    {t("exchange.exchangingSummary")}
                                </div>
                                <div className="symbol">
                                    {t("exchange.exchangingSign")}
                                </div>
                                <div className="token_receive">
                                    {PrecisionNumbers({
                                        amount: exchangingUSD,
                                        token: TokenSettings("CA_0"),
                                        decimals: 2,
                                        i18n: i18n,
                                        isUSD: true,
                                        compact: true,
                                    })}
                                </div>
                                <div className="token_receive_name">
                                    {" "}
                                    {t("exchange.exchangingCurrency")}
                                </div>
                            </div>
                        </div>
                        <div className="cta-options-group">
                            <Button
                                data-testid="exchange-v1-modal-cancel"
                                type="default"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("exchange.buttonCancel")}
                            </Button>
                            <Button
                                data-testid="exchange-v1-modal-confirm"
                                type="primary"
                                className="button"
                                onClick={() => void onSubmit()}
                            >
                                {t("exchange.buttonConfirm")}
                            </Button>
                        </div>
                    </div>
                )}

                {status !== "confirm" && (
                    <div className="conditional-wrapper">
                        {(status === "pending" ||
                            status === "success" ||
                            status === "error") &&
                            txHash !== "" && (
                                <div className="tx-id-container">
                                    <div className="tx-id-data">
                                        <div className="tx-id-label">
                                            {t("txFeedback.txIdLabel")}
                                        </div>
                                        <div className="tx-id-address">
                                            <CopyAddress
                                                address={txHash}
                                                type={"tx"}
                                            ></CopyAddress>
                                        </div>
                                    </div>
                                </div>
                            )}

                        <div className="cta-container">
                            <div className="tx-feedback-container">
                                <div className="tx-feedback-icon tx-logo-status">
                                    <div
                                        className={STATUS_ICON[status]}
                                    ></div>
                                </div>
                                <p
                                    className="tx-feedback-text"
                                    data-testid={`exchange-v1-modal-status-${status}`}
                                >
                                    {statusLabels[status]}
                                </p>
                            </div>
                            <div className="cta-options-group">
                                <button
                                    type="button"
                                    className="button secondary"
                                    onClick={onClose}
                                    data-testid="exchange-v1-modal-close"
                                >
                                    {t(
                                        "staking.modal.StatusModal_Modal_Close"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Fragment>
        </Modal>
    );
}
