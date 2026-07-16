import { Button, Modal } from "antd";
import React, { Fragment } from "react";
import type { TransactionReceipt } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { TokenSettings } from "../../../helpers/currencies";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";

export type ExchangeModeV1 = "mintBPro" | "mintDoc" | "redeemBPro" | "redeemDoc";

interface ExchangeOptionsModalV1Props {
    mode: ExchangeModeV1 | null;
    visible: boolean;
    onClose: () => void;
    amount: bigint;
    onConfirm: (status: string, txHash: string) => void;
}

// `amount` is always the source ("you exchange") token quantity — RBTC for
// mint, BPro/DOC for redeem — matching what interfaceMintBProV1/etc. actually
// take as their first argument (see backend/v1/moc-v1.ts).
const MODE_TOKEN: Record<ExchangeModeV1, string> = {
    mintBPro: "CA_0",
    mintDoc: "CA_0",
    redeemBPro: "TC_0",
    redeemDoc: "TP_0",
};

export default function ExchangeOptionsModalV1(
    props: ExchangeOptionsModalV1Props
): React.ReactElement | null {
    const { mode, visible, onClose, amount, onConfirm } = props;
    const { t, i18n } = useProjectTranslation();
    const {
        interfaceMintBProV1,
        interfaceMintDocV1,
        interfaceRedeemBProV1,
        interfaceRedeemFreeDocV1,
        userBalanceV1,
        userBaseCoinBalance,
    } = useWalletContext();

    if (!mode) return null;

    const isMint = mode === "mintBPro" || mode === "mintDoc";
    const tokenKey = MODE_TOKEN[mode];

    const onSubmit = async (): Promise<void> => {
        onClose();
        onConfirm("sign", "");

        const onTransaction = (txHash: string): void => {
            onConfirm("pending", txHash);
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
            onConfirm("error", "");
            return;
        }

        if (!receipt) return;

        const status = receipt.status === "success" ? "success" : "error";
        onConfirm(status, receipt.transactionHash);

        void userBalanceV1.refetch();
        void userBaseCoinBalance.refetch();
    };

    return (
        <Modal
            className="ExchangeOptionsModalV1"
            open={visible}
            onCancel={onClose}
            footer={null}
            centered={true}
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
                            <div className="tx-amount">
                                {PrecisionNumbers({
                                    amount,
                                    token: TokenSettings(tokenKey),
                                    decimals: 8,
                                    i18n: i18n,
                                    compact: true,
                                })}
                            </div>
                            <div className="tx-token">
                                {t(`exchange.tokens.${tokenKey}.abbr`)}
                            </div>
                        </div>
                    </div>
                    <div className="cta-container">
                        <div className="cta-info-group">
                            <div className="cta-info-detail">
                                {isMint
                                    ? t("exchange.v1.confirmDescriptionMint")
                                    : t(
                                          "exchange.v1.confirmDescriptionRedeem"
                                      )}
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
                </div>
            </Fragment>
        </Modal>
    );
}
