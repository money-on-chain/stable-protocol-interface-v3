import { Checkbox, Modal } from "antd";
import React, { useState } from "react";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";

interface ModalAllowanceMocV1Props {
    visible: boolean;
    amount: bigint;
    onClose: () => void;
    onApproved: () => void;
    // When true, this dialog revokes the existing MOC allowance (sends
    // approve(0)) instead of granting one — used when the user explicitly
    // picks RBTC but still has enough MOC balance+allowance approved that
    // MoC.sol would otherwise auto-charge the fee in MOC anyway (see
    // MoCExchange.calculateCommissionsWithPrices).
    disAllowance?: boolean;
}

type StatusType = "SUBMIT" | "SIGN" | "WAITING" | "ERROR";

const MAX_UINT256 = (1n << 256n) - 1n;

// v1-specific allowance dialog for paying the mint/redeem fee in MOC — mirrors
// components/Modals/Allowance/AllowanceDialog's UX (SUBMIT/SIGN/WAITING/ERROR
// states, optional unlimited allowance), but v1 only ever has one token/spender
// pair (MoCToken -> Moc), so it skips ALLOWANCE_STEPS/ApproveTokenContract's
// v3 caIndex-based resolution and calls interfaceAllowanceMocV1 directly.
export default function ModalAllowanceMocV1(
    props: ModalAllowanceMocV1Props
): React.ReactElement {
    const { visible, amount, onClose, onApproved, disAllowance } = props;
    const { t, ns } = useProjectTranslation();
    const { interfaceAllowanceMocV1 } = useWalletContext();

    const [status, setStatus] = useState<StatusType>("SUBMIT");
    const [infinityAllowance, setInfinityAllowance] = useState(false);

    let sentIcon = "";
    let statusLabel = "";
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
    }

    const reset = (): void => {
        setStatus("SUBMIT");
        setInfinityAllowance(false);
    };

    const onCloseModal = (): void => {
        reset();
        onClose();
    };

    const onAuthorize = (): void => {
        const amountAllowance = disAllowance
            ? 0n
            : infinityAllowance
              ? MAX_UINT256
              : amount;

        setStatus("SIGN");
        const onTransaction = (): void => setStatus("WAITING");
        const onReceipt = (): void => {
            // no-op — balances/allowance refetched by the caller after approval
        };

        void interfaceAllowanceMocV1(amountAllowance, onTransaction, onReceipt)
            .then(() => {
                reset();
                onApproved();
            })
            .catch((error: unknown) => {
                console.error("Allowance error:", error);
                setStatus("ERROR");
            });
    };

    return (
        <Modal
            className="ModalAllowance"
            title={`${t(
                disAllowance ? "allowance.disallowanceTitle" : "allowance.cardTitle"
            )}  ${t("exchange.tokens.TG.abbr", { ns })}`}
            width={505}
            open={visible}
            onCancel={onCloseModal}
            footer={null}
            closable={false}
            centered={true}
            maskClosable={false}
        >
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
                                    {t("exchange.v1.allowanceMocReason", {
                                        ns,
                                    })}
                                    <br />
                                    {t("allowance.statusText2")}
                                </div>
                            )}
                            <div className="option-checkbox">
                                {!disAllowance && (
                                    <Checkbox
                                        className="check-unlimited"
                                        checked={infinityAllowance}
                                        onChange={(e: {
                                            target: { checked: boolean };
                                        }) =>
                                            setInfinityAllowance(
                                                e.target.checked
                                            )
                                        }
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
                                        onClick={onCloseModal}
                                    >
                                        {t("allowance.confirm.cancel")}
                                    </button>
                                    <button
                                        type="button"
                                        className="button"
                                        data-testid="allowance-moc-v1-authorize"
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
                                        onClick={onCloseModal}
                                    >
                                        {t("allowance.confirm.cancel")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
