import "../Exchange/Styles.scss";

import type { RadioChangeEvent } from "antd";
import { Button, Radio, Space } from "antd";
import React, { useState } from "react";

import { previewFeesMocV1, previewFeesV1 } from "../../backend/v1/fees-v1";
import { useWalletContext } from "../../context/Wallet";
import { bigIntToInputValue, TokenSettings } from "../../helpers/currencies";
import { typeOperation } from "../../helpers/exchange";
import {
    estimateExchangeOutputV1,
    tokenBalanceV1,
    tokenExchangeV1,
    tokenReceiveV1,
    tokenUsdPriceV1,
} from "../../helpers/exchangeV1";
import { mulPrecision, toBigIntPrecision, WAD } from "../../helpers/precision";
import { useProjectTranslation } from "../../helpers/translations";
import CurrencyPopUp from "../CurrencyPopUp";
import InputAmount from "../InputAmount";
import ModalAllowanceMocV1 from "../Modals/AllowanceMocV1";
import type {
    ExchangeConfirmDataV1,
    ExchangeModeV1,
} from "../Modals/ExchangeOptionsModalV1";
import ExchangeOptionsModalV1 from "../Modals/ExchangeOptionsModalV1";
import { PrecisionNumbers } from "../PrecisionNumbers";

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
    const [modalData, setModalData] = useState<ExchangeConfirmDataV1 | null>(
        null
    );
    // Mirrors CommissionsSelector's UX. The contract still auto-picks
    // RBTC-vs-MOC based on live MOC balance/allowance at call time (see
    // feeCurrencyNote) — but unlike v3, this choice now drives a real allowance
    // step before submit: selecting "TG" grants a MOC allowance if one isn't
    // already in place (needsMocAllowance), and selecting "CA_0" revokes any
    // leftover MOC allowance that would otherwise make the contract auto-charge
    // in MOC despite the user's choice (needsMocRevoke).
    const [selectedFeeCurrency, setSelectedFeeCurrency] =
        useState<string>("CA_0");
    const [showAllowanceModal, setShowAllowanceModal] =
        useState<boolean>(false);
    const [allowanceDisAllow, setAllowanceDisAllow] =
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

    // RBTC-path and MOC-path commission rates are genuinely different values
    // on-chain (MoCInrate.sol's *_FEES_RBTC vs *_FEES_MOC constants) — not the
    // same rate just relabeled — so each fee-currency option needs its own rate
    // lookup and its own preview computation below.
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

    const commissionRateMoc = (): bigint => {
        if (!status) return 0n;
        switch (mode) {
            case "mintBPro":
                return status.mintBProFeesMoc;
            case "mintDoc":
                return status.mintDocFeesMoc;
            case "redeemBPro":
                return status.redeemBProFeesMoc;
            case "redeemDoc":
                return status.redeemDocFeesMoc;
        }
    };

    const feePreview =
        status && feeBasisRbtc > 0n
            ? previewFeesV1(feeBasisRbtc, commissionRate(), status.vendorMarkup)
            : null;

    const feePreviewMoc =
        status && feeBasisRbtc > 0n
            ? previewFeesMocV1(
                  feeBasisRbtc,
                  commissionRateMoc(),
                  status.vendorMarkup,
                  status.getBitcoinPrice,
                  status.mocUsdPrice
              )
            : null;

    // Fee-currency selector data — each option shows its own rate/amount/USD,
    // since the RBTC and MOC fee paths are priced independently on-chain.
    const feeUsdRbtc =
        feePreview && status
            ? mulPrecision(feePreview.total, status.getBitcoinPrice)
            : 0n;
    const feeMoc = feePreviewMoc ? feePreviewMoc.total : 0n;
    const feeUsdMoc =
        feePreviewMoc && status
            ? mulPrecision(feePreviewMoc.total, status.mocUsdPrice)
            : 0n;
    const feePercentWadRbtc = status
        ? (commissionRate() + status.vendorMarkup) * 100n
        : 0n;
    const feePercentWadMoc = status
        ? (commissionRateMoc() + status.vendorMarkup) * 100n
        : 0n;

    // Each option is only disabled when the user can't actually afford it in
    // that currency — matching CommissionsSelector's balance check — never on
    // allowance, since choosing MOC now triggers its own allowance step at
    // submit time (see needsMocAllowance) instead of silently falling back.
    const mocBalance = balances?.MOC?.balance ?? 0n;
    const mocAllowance = balances?.MOC?.allowance ?? 0n;
    const rbtcFeeDisabled =
        operationType === "REDEEM"
            ? false
            : !feePreview || feePreview.total === 0n || feePreview.total > rbtcBalance;
    const mocFeeDisabled = !feePreviewMoc || feeMoc === 0n || feeMoc > mocBalance;

    const needsMocAllowance =
        selectedFeeCurrency === "TG" && feeMoc > 0n && mocAllowance < feeMoc;

    // MoC.sol auto-charges the fee in MOC whenever the caller's live MOC
    // balance+allowance both cover it (MoCExchange.calculateCommissionsWithPrices)
    // — it doesn't ask the frontend. So picking RBTC here isn't enough on its own
    // if a large-enough MOC allowance is still sitting there from earlier; it has
    // to be revoked first, same as v3's ConfirmOperation does for its FeeToken
    // (see showAllowancePayCommissionFeeToken's disallow branch).
    const needsMocRevoke =
        selectedFeeCurrency === "CA_0" &&
        feeMoc > 0n &&
        mocAllowance >= feeMoc &&
        mocBalance >= feeMoc;

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

    // USD value of the exchange, for the cta-info-group summary — mirrors
    // components/Exchange's totalExchangingInFiat (larger of the two sides,
    // since amountYouExchange/amountYouReceive track each other 1:1 anyway).
    const amountReceiveBigInt =
        amountYouReceive === "" ? 0n : toBigIntPrecision(amountYouReceive);
    const totalExchangingInFiat = status
        ? (() => {
              const exchangeUsd = mulPrecision(
                  amountBigInt,
                  tokenUsdPriceV1(currencyYouExchange, status)
              );
              const receiveUsd = mulPrecision(
                  amountReceiveBigInt,
                  tokenUsdPriceV1(currencyYouReceive, status)
              );
              return exchangeUsd > receiveUsd ? exchangeUsd : receiveUsd;
          })()
        : 0n;

    // Per-field fiat equivalents for InputAmount's getFiatEquivalent — mirrors
    // components/Exchange's onFiatEquivalentYouExchange/onFiatEquivalentYouReceive.
    const onFiatEquivalentYouExchange = (amount: number): bigint => {
        if (!status || amount < 0) return 0n;
        return mulPrecision(
            toBigIntPrecision(amount),
            tokenUsdPriceV1(currencyYouExchange, status)
        );
    };

    const onFiatEquivalentYouReceive = (amount: number): bigint => {
        if (!status || amount < 0) return 0n;
        return mulPrecision(
            toBigIntPrecision(amount),
            tokenUsdPriceV1(currencyYouReceive, status)
        );
    };

    const setAddTotalAvailable = (): void => {
        onChangeAmountYouExchange(
            sourceBalance === 0n
                ? ""
                : bigIntToInputValue(sourceBalance, currencyYouExchange, 8)
        );
    };

    // Snapshots everything the confirm modal displays at the moment the user
    // commits to the operation, so its numbers stay stable even though the
    // live state they're derived from (amounts, selectedFeeCurrency) keeps
    // reacting to the (now hidden) form behind the modal.
    const buildModalData = (): ExchangeConfirmDataV1 => ({
        mode,
        amount: amountBigInt,
        receiveAmount: amountReceiveBigInt,
        exchangingUSD: totalExchangingInFiat,
        feeAmount: selectedFeeCurrency === "TG" ? feeMoc : (feePreview?.total ?? 0n),
        feeToken: selectedFeeCurrency,
        feePercent:
            selectedFeeCurrency === "TG" ? feePercentWadMoc : feePercentWadRbtc,
        feeUSD: selectedFeeCurrency === "TG" ? feeUsdMoc : feeUsdRbtc,
    });

    const onSubmitButton = (): void => {
        if (hasError) return;
        if (needsMocAllowance) {
            setAllowanceDisAllow(false);
            setShowAllowanceModal(true);
            return;
        }
        if (needsMocRevoke) {
            setAllowanceDisAllow(true);
            setShowAllowanceModal(true);
            return;
        }
        setModalData(buildModalData());
    };

    const onAllowanceApproved = (): void => {
        setShowAllowanceModal(false);
        void userBalanceV1.refetch();
        setModalData(buildModalData());
    };

    // The confirm modal now tracks sign/pending/success/error itself (see
    // ExchangeOptionsModalV1) so the amount/fee summary stays visible while
    // the user waits — this only needs to clear the (hidden) form fields
    // once the transaction is under way.
    const onModalConfirm = (): void => {
        onClearAmounts();
    };

    const buttonLabelKey = "defaultCTA.buttonExchange";

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
                            getFiatEquivalent={onFiatEquivalentYouExchange}
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
                            getFiatEquivalent={onFiatEquivalentYouReceive}
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
                                <div className="radioButton">
                                    <Radio.Group
                                        onChange={(e: RadioChangeEvent) =>
                                            setSelectedFeeCurrency(
                                                String(e.target.value)
                                            )
                                        }
                                        value={selectedFeeCurrency}
                                    >
                                        <Space direction="vertical">
                                            <Radio
                                                value="CA_0"
                                                disabled={rbtcFeeDisabled}
                                            >
                                                <span>
                                                    {t("fees.labelFee")} (
                                                    {PrecisionNumbers({
                                                        amount: feePercentWadRbtc,
                                                        token: TokenSettings(
                                                            "CA_0"
                                                        ),
                                                        decimals: 2,
                                                        i18n: i18n,
                                                        compact: true,
                                                    })}
                                                    %)
                                                </span>
                                                <span> ≈ </span>
                                                <span>
                                                    {feePreview
                                                        ? PrecisionNumbers({
                                                              amount: feePreview.total,
                                                              token: TokenSettings(
                                                                  "CA_0"
                                                              ),
                                                              decimals: 8,
                                                              i18n: i18n,
                                                              compact: true,
                                                          })
                                                        : "--"}
                                                </span>
                                                <span>
                                                    {" "}
                                                    {t(
                                                        "exchange.tokens.CA_0.abbr"
                                                    )}
                                                </span>
                                                <span> (</span>
                                                <span>
                                                    {PrecisionNumbers({
                                                        amount: feeUsdRbtc,
                                                        decimals: 6,
                                                        token: TokenSettings(
                                                            "CA_0"
                                                        ),
                                                        i18n: i18n,
                                                        isUSD: true,
                                                        compact: true,
                                                    })}
                                                </span>
                                                <span>
                                                    {" "}
                                                    {t(
                                                        "exchange.exchangingCurrency"
                                                    )}
                                                </span>
                                                <span>) </span>
                                            </Radio>
                                            <Radio
                                                value="TG"
                                                disabled={mocFeeDisabled}
                                            >
                                                <span>
                                                    {t("fees.labelFee")} (
                                                    {PrecisionNumbers({
                                                        amount: feePercentWadMoc,
                                                        token: TokenSettings(
                                                            "CA_0"
                                                        ),
                                                        decimals: 2,
                                                        i18n: i18n,
                                                        compact: true,
                                                    })}
                                                    %)
                                                </span>
                                                <span> ≈ </span>
                                                <span>
                                                    {feePreviewMoc
                                                        ? PrecisionNumbers({
                                                              amount: feeMoc,
                                                              token: TokenSettings(
                                                                  "TG"
                                                              ),
                                                              decimals: 8,
                                                              i18n: i18n,
                                                              compact: true,
                                                          })
                                                        : "--"}
                                                </span>
                                                <span>
                                                    {" "}
                                                    {t(
                                                        "exchange.tokens.TG.abbr"
                                                    )}
                                                </span>
                                                <span> (</span>
                                                <span>
                                                    {PrecisionNumbers({
                                                        amount: feeUsdMoc,
                                                        decimals: 6,
                                                        token: TokenSettings(
                                                            "CA_0"
                                                        ),
                                                        i18n: i18n,
                                                        isUSD: true,
                                                        compact: true,
                                                    })}
                                                </span>
                                                <span>
                                                    {" "}
                                                    {t(
                                                        "exchange.exchangingCurrency"
                                                    )}
                                                </span>
                                                <span>) </span>
                                            </Radio>
                                        </Space>
                                    </Radio.Group>
                                </div>
                            </div>

                            <div className="tx-fees-info">
                                {isMint && (
                                    <>
                                        {t("exchange.v1.estimatedMaxRbtc")}
                                        <br />
                                    </>
                                )}
                                {t("fees.disclaimer2")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cta-container">
                <div className="cta-info-group">
                    <div className="cta-info-summary">
                        {t("exchange.exchangingSummary")}
                        <div className={""}> ≈ </div>
                        {totalExchangingInFiat.toString() !== "NaN" ? (
                            <div className={""}>
                                {!totalExchangingInFiat
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: totalExchangingInFiat,
                                          token: TokenSettings("CA_0"),
                                          decimals: 2,
                                          i18n: i18n,
                                          isUSD: true,
                                          compact: true,
                                      })}
                            </div>
                        ) : (
                            <div>0</div>
                        )}
                        <span className={""}>
                            {t("exchange.exchangingCurrency")}
                        </span>
                    </div>
                    <div className="cta-info-global-error">
                        <div className="amountInput__feedback--error">
                            {errorText}
                        </div>
                    </div>
                </div>

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

            <ModalAllowanceMocV1
                visible={showAllowanceModal}
                amount={feeMoc}
                disAllowance={allowanceDisAllow}
                onClose={() => setShowAllowanceModal(false)}
                onApproved={onAllowanceApproved}
            />
            <ExchangeOptionsModalV1
                data={modalData}
                visible={modalData !== null}
                onClose={() => setModalData(null)}
                onConfirm={onModalConfirm}
            />
        </div>
    );
}
