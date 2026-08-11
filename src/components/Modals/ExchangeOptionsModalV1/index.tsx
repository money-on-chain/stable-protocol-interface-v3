import { Modal } from "antd";
import React, { Fragment, useEffect, useState } from "react";
import type { TransactionReceipt } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { TokenSettings } from "../../../helpers/currencies";
import { useProjectTranslation } from "../../../helpers/translations";
import Button from "../../Button";
import CopyAddress from "../../CopyAddress";
import DisplayAmount from "../../DisplayAmount";
import { PrecisionNumbers } from "../../PrecisionNumbers";

export type ExchangeModeV1 = "mintBPro" | "mintDoc" | "redeemBPro" | "redeemDoc";

// Snapshot of everything the confirm dialog needs to render, captured by
// ExchangeV1 at submit time (see its onSubmitButton) so the modal's numbers
// stay frozen even though the values it's built from (amountYouExchange,
// selectedFeeCurrency, etc.) are live component state.
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

// "allowance" is the checkbox+authorize step itself (mirrors the old
// ModalAllowanceMocV1's SUBMIT state); allowanceSign/allowancePending/
// allowanceError are that same dialog's SIGN/WAITING/ERROR states, now folded
// into this modal instead of a separate popup — see onAuthorizeAllowance.
type TxStatus =
    | "confirm"
    | "allowance"
    | "allowanceSign"
    | "allowancePending"
    | "allowanceError"
    | "sign"
    | "pending"
    | "success"
    | "error";

interface ExchangeOptionsModalV1Props {
    data: ExchangeConfirmDataV1 | null;
    visible: boolean;
    onClose: () => void;
    onConfirm: (status: string, txHash: string) => void;
    // Set when paying the fee in MOC requires granting (or revoking) an
    // allowance first — clicking "Confirm" then shows the allowance step
    // in-place instead of sending the real mint/redeem transaction directly.
    needsMocAllowance?: boolean;
    needsMocRevoke?: boolean;
}

// Unlimited allowance temporarily disabled.
// const MAX_UINT256 = (1n << 256n) - 1n;

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

const STATUS_ICON: Record<
    Exclude<TxStatus, "confirm" | "allowance">,
    string
> = {
    allowanceSign: "icon-tx-signWallet",
    allowancePending: "icon-tx-waiting",
    allowanceError: "icon-tx-error",
    sign: "icon-tx-signWallet",
    pending: "icon-tx-waiting",
    success: "icon-tx-success",
    error: "icon-tx-error",
};

export default function ExchangeOptionsModalV1(
    props: ExchangeOptionsModalV1Props
): React.ReactElement | null {
    const {
        data,
        visible,
        onClose,
        onConfirm,
        needsMocAllowance,
        needsMocRevoke,
    } = props;
    const { t, i18n, ns } = useProjectTranslation();
    const {
        interfaceAllowanceMocV1,
        interfaceMintBProV1,
        interfaceMintDocV1,
        interfaceRedeemBProV1,
        interfaceRedeemFreeDocV1,
        userBalanceV1,
        userBaseCoinBalance,
    } = useWalletContext();

    const [status, setStatus] = useState<TxStatus>("confirm");
    const [txHash, setTxHash] = useState<string>("");
    // Unlimited allowance temporarily disabled.
    // const [infinityAllowance, setInfinityAllowance] = useState(false);

    // Each new confirm attempt hands in a fresh `data` snapshot (see
    // ExchangeV1's buildModalData) — reset back to the confirm step whenever
    // that happens, so a previous operation's SUCCESS/ERROR screen never
    // bleeds into the next one.
    useEffect(() => {
        if (data) {
            setStatus("confirm");
            setTxHash("");
            // Unlimited allowance temporarily disabled.
            // setInfinityAllowance(false);
        }
    }, [data]);

    if (!data) return null;

    const { mode, amount, receiveAmount, exchangingUSD, feeAmount, feeToken, feePercent, feeUSD } =
        data;

    const isMint = mode === "mintBPro" || mode === "mintDoc";
    const sourceToken = MODE_TOKEN[mode];
    const receiveToken = MODE_RECEIVE_TOKEN[mode];

    const statusLabels: Record<
        Exclude<TxStatus, "confirm" | "allowance">,
        string
    > = {
        allowanceSign: t("allowance.feedback.sign"),
        allowancePending: t("allowance.feedback.waiting"),
        allowanceError: t("allowance.feedback.error"),
        sign: t("staking.modal.StatusModal_Modal_TxStatus_sign"),
        pending: t("staking.modal.StatusModal_Modal_TxStatus_pending"),
        success: t("staking.modal.StatusModal_Modal_TxStatus_success"),
        error: t("staking.modal.StatusModal_Modal_TxStatus_failed"),
    };

    // The real mint/redeem transaction — runs directly from "Confirm" when no
    // allowance is needed, or right after onAuthorizeAllowance succeeds.
    const runOperation = async (): Promise<void> => {
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

    const onSubmit = async (): Promise<void> => {
        if (needsMocAllowance || needsMocRevoke) {
            setStatus("allowance");
            return;
        }
        await runOperation();
    };

    // amount is 0 for the revoke case (disAllowance) — mirrors the old
    // ModalAllowanceMocV1's onAuthorize. `feeAmount` here is exactly the MOC
    // fee amount whenever needsMocAllowance is true, since that's only ever
    // set when the selected fee currency (and so data.feeToken) is "TG" — see
    // ExchangeV1's buildModalData.
    const onAuthorizeAllowance = async (): Promise<void> => {
        const amountAllowance = needsMocRevoke ? 0n : feeAmount;
        /*
         * Unlimited allowance temporarily disabled. Keep this branch available
         * in case the option is restored later.
         *
         * const amountAllowance = needsMocRevoke
         *     ? 0n
         *     : infinityAllowance
         *       ? MAX_UINT256
         *       : feeAmount;
         */

        setStatus("allowanceSign");
        const onTransaction = (): void => setStatus("allowancePending");
        const onReceipt = (): void => {
            // no-op — balance is refetched after the allowance settles below
        };

        try {
            await interfaceAllowanceMocV1(
                amountAllowance,
                onTransaction,
                onReceipt
            );
        } catch (error) {
            console.error("Allowance error:", error);
            setStatus("allowanceError");
            return;
        }

        void userBalanceV1.refetch();
        await runOperation();
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
                    {t("exchange.v1.confirmExchangeTitle")}
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
                                compact={false}
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
                                compact={false}
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

                {status === "allowance" && (
                    <div className="cta-container">
                        <div className="tx-feedback-container">
                            {needsMocRevoke ? (
                                <div className="tx-feedback-text">
                                    {t("allowance.statusDisallowanceText")}
                                    <br />
                                    {t("exchange.v1.allowanceMocRevokeReason", {
                                        ns,
                                    })}
                                </div>
                            ) : (
                                <div className="tx-feedback-text">
                                    {t("allowance.statusText1")}
                                    {/*
                                     * Temporarily hidden with the unlimited
                                     * allowance option. Translation keys are
                                     * intentionally kept for future use.
                                     *
                                     * <br />
                                     * {t("exchange.v1.allowanceMocReason", {
                                     *     ns,
                                     * })}
                                     * <br />
                                     * {t("allowance.statusText2")}
                                     */}
                                </div>
                            )}
                            {/*
                             * Unlimited allowance temporarily disabled.
                             *
                             * {!needsMocRevoke && (
                             *     <div className="option-checkbox">
                             *         <Checkbox
                             *             className="check-unlimited"
                             *             checked={infinityAllowance}
                             *             onChange={(e: {
                             *                 target: { checked: boolean };
                             *             }) =>
                             *                 setInfinityAllowance(
                             *                     e.target.checked
                             *                 )
                             *             }
                             *         >
                             *             {t("allowance.setUnlimited")}
                             *         </Checkbox>
                             *     </div>
                             * )}
                             */}
                        </div>
                        <div className="cta-options-group">
                            <Button
                                data-testid="exchange-v1-modal-allowance-cancel"
                                type="default"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("allowance.confirm.cancel")}
                            </Button>
                            <Button
                                data-testid="exchange-v1-modal-allowance-authorize"
                                type="primary"
                                className="button"
                                onClick={() => void onAuthorizeAllowance()}
                            >
                                {needsMocRevoke
                                    ? t("allowance.confirm.revoke")
                                    : t("allowance.confirm.authorize")}
                            </Button>
                        </div>
                    </div>
                )}

                {status !== "confirm" && status !== "allowance" && (
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
