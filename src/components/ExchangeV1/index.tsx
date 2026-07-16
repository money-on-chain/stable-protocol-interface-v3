import "../Exchange/Styles.scss";

import { Button } from "antd";
import React, { useState } from "react";

import { previewFeesV1 } from "../../backend/v1/fees-v1";
import { useWalletContext } from "../../context/Wallet";
import { bigIntToInputValue, TokenSettings } from "../../helpers/currencies";
import { typeOperation } from "../../helpers/exchange";
import {
    estimateExchangeOutputV1,
    tokenBalanceV1,
    tokenExchangeV1,
    tokenReceiveV1,
} from "../../helpers/exchangeV1";
import { mulPrecision, toBigIntPrecision, WAD } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import CurrencyPopUp from "../CurrencyPopUp";
import InputAmount from "../InputAmount";
import type { ExchangeModeV1 } from "../Modals/ExchangeOptionsModalV1";
import ExchangeOptionsModalV1 from "../Modals/ExchangeOptionsModalV1";
import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

function getModeV1(
    isMint: boolean,
    currencyYouExchange: string,
    currencyYouReceive: string
): ExchangeModeV1 {
    if (isMint) {
        return currencyYouReceive === "TC_0" ? "mintBPro" : "mintDoc";
    }
    return currencyYouExchange === "TC_0" ? "redeemBPro" : "redeemDoc";
}

// v1's exchange surface has the same "you exchange" / "you receive" token-pair
// structure as components/Exchange, but over a fixed, symmetric pair set (no
// caIndex/swap-pairs/execution-fee) — see helpers/exchangeV1.ts. Layout mirrors
// components/Exchange too: an "inputFields" column (both token selectors + the
// swap button) beside a sibling "info" panel (conversion rate + fee-currency
// info), both generic shared classes from assets/css/global.scss.
export default function ExchangeV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatusV1, userBalanceV1, userBaseCoinBalance } =
        useWalletContext();

    const [currencyYouExchange, setCurrencyYouExchange] =
        useState<string>("CA_0");
    const [currencyYouReceive, setCurrencyYouReceive] =
        useState<string>("TC_0");
    const [amountYouExchange, setAmountYouExchange] = useState<string>("");
    const [amountYouReceive, setAmountYouReceive] = useState<string>("");
    const [modalMode, setModalMode] = useState<ExchangeModeV1 | null>(null);
    const [modalAmount, setModalAmount] = useState<bigint>(0n);
    const [operationModalInfo, setOperationModalInfo] =
        useState<OperationModalInfo>({ operationStatus: "", txHash: "" });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);

    const status = contractProtocolStatusV1.data;
    const balances = userBalanceV1.data;
    const rbtcBalance = userBaseCoinBalance.balance ?? 0n;

    const operationType = typeOperation(
        currencyYouExchange,
        currencyYouReceive
    );
    const isMint = operationType === "MINT";
    const mode = getModeV1(isMint, currencyYouExchange, currencyYouReceive);

    const onClearAmounts = (): void => {
        setAmountYouExchange("");
        setAmountYouReceive("");
    };

    const onChangeCurrencyYouExchange = (value: string): void => {
        onClearAmounts();
        setCurrencyYouExchange(value);
        setCurrencyYouReceive(tokenReceiveV1(value)[0]);
    };

    const onChangeCurrencyYouReceive = (value: string): void => {
        onClearAmounts();
        setCurrencyYouReceive(value);
    };

    const handleSwapCurrencies = (): void => {
        const newExchange = currencyYouReceive;
        const newReceive = currencyYouExchange;
        setCurrencyYouExchange(newExchange);
        setCurrencyYouReceive(newReceive);
        onClearAmounts();
    };

    // Both fields are editable, mirroring components/Exchange — whichever side
    // the user types into drives the other via the same conversion, just
    // called with from/to swapped (v1's mint<->redeem math is a pure
    // reciprocal, see estimateExchangeOutputV1's doc comment).
    const onChangeAmountYouExchange = (newAmount: string): void => {
        setAmountYouExchange(newAmount);
        if (!status || newAmount === "") {
            setAmountYouReceive("");
            return;
        }
        const receiveBigInt = estimateExchangeOutputV1(
            currencyYouExchange,
            currencyYouReceive,
            toBigIntPrecision(newAmount),
            status
        );
        setAmountYouReceive(
            bigIntToInputValue(receiveBigInt, currencyYouReceive, 8)
        );
    };

    const onChangeAmountYouReceive = (newAmount: string): void => {
        setAmountYouReceive(newAmount);
        if (!status || newAmount === "") {
            setAmountYouExchange("");
            return;
        }
        const exchangeBigInt = estimateExchangeOutputV1(
            currencyYouReceive,
            currencyYouExchange,
            toBigIntPrecision(newAmount),
            status
        );
        setAmountYouExchange(
            bigIntToInputValue(exchangeBigInt, currencyYouExchange, 8)
        );
    };

    const amountBigInt =
        amountYouExchange === "" ? 0n : toBigIntPrecision(amountYouExchange);

    const sourceBalance = tokenBalanceV1(
        currencyYouExchange,
        balances,
        rbtcBalance
    );

    const receiveUpToBalance = status
        ? estimateExchangeOutputV1(
              currencyYouExchange,
              currencyYouReceive,
              sourceBalance,
              status
          )
        : 0n;

    // "1 you-exchange ≈ X you-receive" and its inverse, at unit (1 token) scale.
    const rateForward = status
        ? estimateExchangeOutputV1(
              currencyYouExchange,
              currencyYouReceive,
              WAD,
              status
          )
        : 0n;
    const rateBackward = status
        ? estimateExchangeOutputV1(
              currencyYouReceive,
              currencyYouExchange,
              WAD,
              status
          )
        : 0n;

    // Fee preview — MoCInrate.calcCommissionValue is always computed off the
    // RBTC-denominated amount, whether minting (the RBTC sent) or redeeming
    // (the RBTC-equivalent of the token burned) — see MoCExchange.sol's
    // redeemBPro/redeemFreeDoc, both set `params.amount` to the RBTC value.
    const feeBasisRbtc =
        !status || amountBigInt <= 0n
            ? 0n
            : currencyYouExchange === "CA_0"
              ? amountBigInt
              : estimateExchangeOutputV1(
                    currencyYouExchange,
                    "CA_0",
                    amountBigInt,
                    status
                );

    const commissionRate = (): bigint => {
        if (!status) return 0n;
        switch (mode) {
            case "mintBPro":
                return status.mintBProFeesRbtc;
            case "mintDoc":
                return status.mintDocFeesRbtc;
            case "redeemBPro":
                return status.redeemBProFeesRbtc;
            case "redeemDoc":
                return status.redeemDocFeesRbtc;
        }
    };

    const feePreview =
        status && feeBasisRbtc > 0n
            ? previewFeesV1(feeBasisRbtc, commissionRate(), status.vendorMarkup)
            : null;

    const paused = status?.paused ?? false;
    const overFreeDocLimit =
        !isMint && currencyYouExchange === "TP_0" && status
            ? amountBigInt > status.freeDoc
            : false;

    let errorText = "";
    if (paused) {
        errorText = t("exchange.v1.systemPaused");
    } else if (amountYouExchange !== "" && amountBigInt > sourceBalance) {
        errorText = t("exchange.errors.notBalance");
    } else if (overFreeDocLimit) {
        errorText = t("exchange.v1.limitReachedDoc");
    }

    const hasError =
        errorText !== "" || amountBigInt <= 0n || !status || !balances;

    const setAddTotalAvailable = (): void => {
        onChangeAmountYouExchange(
            sourceBalance === 0n
                ? ""
                : bigIntToInputValue(sourceBalance, currencyYouExchange, 8)
        );
    };

    const onSubmitButton = (): void => {
        if (hasError) return;
        setModalAmount(amountBigInt);
        setModalMode(mode);
    };

    const onModalConfirm = (operationStatus: string, txHash: string): void => {
        setOperationModalInfo({ operationStatus, txHash });
        setIsOperationModalVisible(true);
        onClearAmounts();
    };

    const buttonLabelKey = isMint
        ? "exchange.v1.buttonMint"
        : "exchange.v1.buttonRedeem";

    return (
        <div>
            <div className="sectionExchange__Content">
                <div className="inputFields">
                    <div
                        className="tokenSelector"
                        data-testid="exchange-v1-input-from"
                    >
                        <CurrencyPopUp
                            value={currencyYouExchange}
                            data-testid="exchange-v1-input-from-popup"
                            currencyOptions={tokenExchangeV1()}
                            onChange={onChangeCurrencyYouExchange}
                            action={"exchange"}
                        />
                        <InputAmount
                            testId="exchange-v1-amount-exchange"
                            inputValue={amountYouExchange}
                            placeholder={"0.0"}
                            onValueChange={onChangeAmountYouExchange}
                            validateError={errorText !== ""}
                            balance={PrecisionNumbers({
                                amount: sourceBalance,
                                token: TokenSettings(currencyYouExchange),
                                decimals: 8,
                                i18n: i18n,
                                compact: true,
                            })}
                            setAddTotalAvailable={setAddTotalAvailable}
                            action={
                                isMint
                                    ? t("exchange.labelSendingMint")
                                    : t("exchange.labelSending")
                            }
                            balanceText={t("exchange.labelBalance")}
                        />
                        <div className="amountInput__feedback amountInput__feedback--error">
                            {errorText}
                        </div>
                    </div>

                    <div className="buttonSwap" onClick={handleSwapCurrencies}>
                        <div className="icon-swap"></div>
                    </div>

                    <div
                        className="tokenSelector"
                        data-testid="exchange-v1-input-to"
                    >
                        <CurrencyPopUp
                            value={currencyYouReceive}
                            data-testid="exchange-v1-input-to-popup"
                            currencyOptions={tokenReceiveV1(
                                currencyYouExchange
                            )}
                            onChange={onChangeCurrencyYouReceive}
                            action={"exchange"}
                        />
                        <InputAmount
                            testId="exchange-v1-amount-receive"
                            inputValue={amountYouReceive}
                            placeholder={"0.0"}
                            onValueChange={onChangeAmountYouReceive}
                            validateError={false}
                            balance={PrecisionNumbers({
                                amount: receiveUpToBalance,
                                token: TokenSettings(currencyYouReceive),
                                decimals: 8,
                                i18n: i18n,
                                compact: true,
                            })}
                            setAddTotalAvailable={() =>
                                onChangeAmountYouReceive(
                                    receiveUpToBalance === 0n
                                        ? ""
                                        : bigIntToInputValue(
                                              receiveUpToBalance,
                                              currencyYouReceive,
                                              8
                                          )
                                )
                            }
                            action={
                                isMint
                                    ? t("exchange.labelReceiving")
                                    : t("exchange.labelReceivingRedeem")
                            }
                            balanceText={t("exchange.labelUpTo")}
                        />
                    </div>
                </div>

                <div className="info">
                    <div className="tx-amount-container">
                        <div className="tx-fees-container">
                            <div className="tx-fees-data">
                                <div className="tx-fees-item">
                                    1{" "}
                                    {t(
                                        `exchange.tokens.${currencyYouExchange}.abbr`
                                    )}
                                    {" ≈ "}
                                    {status
                                        ? PrecisionNumbers({
                                              amount: rateForward,
                                              token: TokenSettings(
                                                  currencyYouReceive
                                              ),
                                              decimals: 8,
                                              i18n: i18n,
                                              compact: true,
                                          })
                                        : "--"}{" "}
                                    {t(
                                        `exchange.tokens.${currencyYouReceive}.abbr`
                                    )}
                                </div>
                                <div className="tx-fees-item">
                                    1{" "}
                                    {t(
                                        `exchange.tokens.${currencyYouReceive}.abbr`
                                    )}
                                    {" ≈ "}
                                    {status
                                        ? PrecisionNumbers({
                                              amount: rateBackward,
                                              token: TokenSettings(
                                                  currencyYouExchange
                                              ),
                                              decimals: 8,
                                              i18n: i18n,
                                              compact: true,
                                          })
                                        : "--"}{" "}
                                    {t(
                                        `exchange.tokens.${currencyYouExchange}.abbr`
                                    )}
                                </div>
                            </div>

                            <div className="tx-fee-options">
                                <div className="tx-fees-item">
                                    {t("fees.labelFee")}
                                    {": "}
                                    {feePreview
                                        ? PrecisionNumbers({
                                              amount: feePreview.total,
                                              token: TokenSettings("CA_0"),
                                              decimals: 8,
                                              i18n: i18n,
                                              compact: true,
                                          })
                                        : "--"}{" "}
                                    {t("exchange.tokens.CA_0.abbr")}
                                    {feePreview && status && (
                                        <>
                                            {" (~ "}
                                            {PrecisionNumbers({
                                                amount: mulPrecision(
                                                    feePreview.total,
                                                    status.getBitcoinPrice
                                                ),
                                                token: TokenSettings("CA_0"),
                                                decimals: 2,
                                                i18n: i18n,
                                                isUSD: true,
                                                compact: true,
                                            })}
                                            {" USD)"}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="tx-fees-info">
                                {t("exchange.v1.feeCurrencyNote")}
                                {isMint && (
                                    <>
                                        <br />
                                        {t("exchange.v1.estimatedMaxRbtc")}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cta-container">
                <div className="cta-options-group">
                    <Button
                        data-testid="exchange-v1-submit"
                        type="primary"
                        className="button"
                        onClick={onSubmitButton}
                        disabled={hasError}
                    >
                        {t(buttonLabelKey)}
                    </Button>
                </div>
            </div>

            <ExchangeOptionsModalV1
                mode={modalMode}
                visible={modalMode !== null}
                onClose={() => setModalMode(null)}
                amount={modalAmount}
                onConfirm={onModalConfirm}
            />
            {isOperationModalVisible && (
                <OperationStatusModal
                    visible={isOperationModalVisible}
                    onCancel={() => setIsOperationModalVisible(false)}
                    operationStatus={operationModalInfo.operationStatus}
                    txHash={operationModalInfo.txHash}
                />
            )}
        </div>
    );
}
