import React, { useContext, useState, useEffect } from "react";
import { Button, Collapse, Slider } from "antd";
import axios from "axios";
import PropTypes from "prop-types";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers3";
import { TokenSettings, TokenBalance } from "../../helpers/currencies";

import { isMintOperation, UserTokenAllowance } from "../../helpers/exchange";
import ModalAllowanceOperation from "../Modals/Allowance";
import CopyAddress from "../CopyAddress";
//import settings from "../../settings/settings.json";
import TXStatus from "./TXStatus";
import { decodeEvents } from "../../lib/backend/transaction";
import { useWalletContext } from "../../context/Wallet";

const { Panel } = Collapse;

interface ConfirmOperationProps {
    currencyYouExchange: string;
    currencyYouReceive: string;
    exchangingUSD: bigint;
    commission: bigint;
    commissionUSD: bigint;
    commissionPercent: bigint;
    inputAmountYouExchange: bigint;
    amountYouReceive: bigint;
    onCloseModal: () => void;
    executionFee: bigint;
    executionFeeUSD: bigint;
    commissionFeeToken: bigint;
    commissionFeeTokenUSD: bigint;
    commissionPercentFeeToken: bigint;
    radioSelectFee: number;
    caIndex: number;
}

type StatusType = "SUBMIT" | "SIGN" | "QUEUING" | "QUEUED" | "CONFIRMING" | "SUCCESS" | "ERROR";

interface ToleranceLimits {
    exchange: bigint;
    receive: bigint;
}

interface MarkStyle {
    style: {
        color: string;
        fontSize: number;
    };
}

interface PriceVariationToleranceMarks {
    [key: number]: MarkStyle & { label: string };
}

interface StatusLabels {
    SUBMIT: string;
    SIGN: string;
    QUEUING: string;
    QUEUED: string;
    CONFIRMING: string;
    SUCCESS: string;
    ERROR: string;
    DEFAULT: string;
}


/**
 * Calculates the limit as: amount + amount * percentage
 * using only BigInt arithmetic by scaling the percentage.
 *
 * @param {bigint} amount - The base amount as BigInt.
 * @param {number} percentage - A decimal like 0.7 (70%).
 * @param {bigint} scale - Precision scale (default: 1_000_000n = 6 decimals).
 * @returns {bigint} The resulting amount with the percentage added.
 */
function calculateLimit(amount: bigint, percentage: number, scale = 1_000_000n): bigint {    
    // Convert the decimal percentage to a scaled integer
    const scaledPercentage = BigInt(Math.floor(percentage * Number(scale)));
  
    // Compute: amount * (1 + percentage) = amount * (scale + scaledPercentage) / scale
    const limit = (amount * (scale + scaledPercentage)) / scale;
  
    return limit;
}


export default function ConfirmOperation(props: ConfirmOperationProps): JSX.Element {
    const {
        currencyYouExchange,
        currencyYouReceive,
        exchangingUSD,
        commission,
        commissionUSD,
        commissionPercent,
        inputAmountYouExchange,
        amountYouReceive,
        onCloseModal,
        executionFee,
        executionFeeUSD,
        commissionFeeToken,
        commissionFeeTokenUSD,
        commissionPercentFeeToken,
        radioSelectFee,
        caIndex
    } = props;

    const { t, i18n, ns } = useProjectTranslation();
    
    const { contractProtocolStatus, userBalance, publicClient, interfaceExchangeMethod } = useWalletContext()

    const [status, setStatus] = useState<StatusType>("SUBMIT");
    const [amountYouExchange, setAmountYouExchange] = useState<bigint>(
        inputAmountYouExchange
    );
    const [tolerance, setTolerance] = useState<number>(0.7);
    const [txID, setTxID] = useState<string>("");
    const [opID, setOpID] = useState<number | null>(null);
    const [toleranceError, setToleranceError] = useState<string>("");
    const [amountChanged, setAmountChanged] = useState<boolean>(false);

    const IS_MINT: boolean = isMintOperation(currencyYouExchange, currencyYouReceive);
    
    useEffect(() => {
        setAmountYouExchange(inputAmountYouExchange);
    }, []);

    useEffect(() => {
        let timerId: NodeJS.Timeout;
        if (status === "QUEUING") {
            console.log(
                "Operation queuing... waiting for operation execution."
            );
            timerId = setTimeout(() => {
                if (status === "QUEUING") {
                    setStatus("ERROR");
                    console.log(
                        "Operation failed after waiting 20 minutes for execution after queuing."
                    );
                }
            }, 600000);
        }
        if (status === "QUEUED") {
            console.log("Operation queued... waiting for operation execution.");
            timerId = setTimeout(() => {
                if (status === "QUEUED") {
                    setStatus("ERROR");
                    console.log(
                        "Operation failed after waiting 10 minutes for execution."
                    );
                }
            }, 600000);
        }

        return () => clearTimeout(timerId);
    }, [status]);

    const toleranceLimits = (newTolerance: number): ToleranceLimits => {
        let limitExchange: bigint;
        let limitReceive: bigint;
        if (IS_MINT) {
            limitExchange = calculateLimit(amountYouExchange, newTolerance / 100);
            limitReceive = amountYouReceive;
        } else {
            limitExchange = amountYouExchange;
            limitReceive = calculateLimit(amountYouReceive, newTolerance / 100);
        }

        const limits: ToleranceLimits = {
            exchange: limitExchange,
            receive: limitReceive,
        };

        return limits;
    };

    const limits: ToleranceLimits = toleranceLimits(tolerance);

    const [amountYouExchangeLimit, setAmountYouExchangeLimit] = useState<bigint>(
        limits.exchange
    );
    const [amountYouReceiveLimit, setAmountYouReceiveLimit] = useState<bigint>(
        limits.receive
    );
    const [showModalAllowance, setShowModalAllowance] = useState<boolean>(false);
    const [showModalAllowanceFeeToken, setShowModalAllowanceFeeToken] = useState<boolean>(false);
    const [disAllowanceFeeToken, setDisAllowanceFeeToken] = useState<boolean>(false);

    useEffect(() => {
        if (amountYouExchange) {
            const limits: ToleranceLimits = toleranceLimits(tolerance);
            setAmountYouExchangeLimit(limits.exchange);
        }
    }, [amountYouExchange]);

    useEffect(() => {
        if (amountYouReceive) {
            const limits: ToleranceLimits = toleranceLimits(tolerance);
            setAmountYouReceiveLimit(limits.receive);
        }
    }, [amountYouReceive]);

    useEffect(() => {
        const interval: NodeJS.Timeout = setInterval(() => {
            opStatus();
        }, 5000);
        return () => clearInterval(interval);
    }, [opID]);

    const onHideModalAllowance = (): void => {
        setShowModalAllowance(false);
    };

    const onShowModalAllowance = (): void => {
        setShowModalAllowance(true);
    };

    const showAllowance = (): boolean => {
        const tokenAllowance: bigint = UserTokenAllowance(userBalance, currencyYouExchange, caIndex);
        return amountYouExchangeLimit > tokenAllowance;
    };

    const onHideModalAllowanceFeeToken = (): void => {
        setShowModalAllowanceFeeToken(false);
    };

    const onShowModalAllowanceFeeToken = (): void => {
        setShowModalAllowanceFeeToken(true);
    };

    const showAllowanceFeeToken = (): boolean => {
        //const caIndex = getCAIndex(currencyYouExchange, currencyYouReceive);
        const tokenAllowance: bigint = UserTokenAllowance(userBalance, `TF_${caIndex}`, caIndex);

        if (radioSelectFee === 0 && tokenAllowance >= commissionFeeToken) {
            // if we select not to pay with fee token, please disallow to use Fee token
            setDisAllowanceFeeToken(true);
            // show allowance window
            return true;
        } else if (radioSelectFee > 0) {
            return !!commissionFeeToken >= tokenAllowance;
        }

        return false;
    };

    const onSendTransactionAllowFeeToken = (): void => {
        // Show modal allowance
        if (showAllowanceFeeToken()) {
            onShowModalAllowanceFeeToken();
            return;
        }

        // If allowance is ok please send real operation transaction
        onSendTransaction();
    };

    const onSendTransaction = (): void => {
        // Show modal allowance
        if (showAllowance()) {
            onShowModalAllowance();
            return;
        }

        // If allowance is ok please send real operation transaction
        onRealSendTransaction();
    };

    const onRealSendTransaction = (): void => {
        // Real send transaction
        setStatus("SIGN");

        let tokenAmount: bigint;
        let limitAmount: bigint;
        if (IS_MINT) {
            tokenAmount = amountYouReceive;
            limitAmount = amountYouExchangeLimit;
        } else {
            tokenAmount = amountYouExchange;
            limitAmount = amountYouReceiveLimit;
        }

        interfaceExchangeMethod(
            currencyYouExchange,
            currencyYouReceive,
            tokenAmount,
            limitAmount,
            onTransaction,
            onReceipt
        )
            .then((/*value*/) => {
                console.log("DONE!");
            })
            .catch((error: any) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    if (error.response.status === 404) {
                        console.warn('Resource not found - Operation may not be indexed yet');
                    } else {
                        console.error('Server error:', error.response.status, error.response.data);
                        setStatus('ERROR');
                    }
                } else if (error.request) {
                    // The request was made but no response was received
                    console.error('No response received:', error.request);
                    setStatus('ERROR');
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error setting up request:', error.message);
                    setStatus('ERROR');
                }
            });
    };

    const onTransaction = (transactionHash: string): void => {
        // Tx receipt detected change status to waiting
        setStatus("QUEUING");
        console.log("On transaction: ", transactionHash);
        setTxID(transactionHash);
    };

    const opStatus = (): void => {
        if (!opID) {
            console.log("Operation Status: Checking... NO.");
            return;
        }

        const apiUrl: string =
            `${import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS}` +
            "operations/oper_id/";
        axios
            .get(apiUrl, {
                params: {
                    oper_id: opID,
                    bucket_index: caIndex
                },
                timeout: 10000,
            })
            .then((response: any) => {
                if (response.status === 200) {
                    if (response.data.status === 0) {
                        // Pending executed
                        console.log("Operation Status: OK Pending execute.");
                    } else if (response.data.status === 1) {
                        // executed operation is finished

                        setStatus("SUCCESS");

                        // Remove Op ID
                        setOpID(null);

                        // Refresh user balance
                        // auth.loadContractsStatusAndUserBalance().then(
                        //     (/*value*/) => {
                        //         console.log("Refresh user balance OK!");
                        //     }
                        // );

                        console.log("Operation Status: OK Executed.");
                    } else {
                        setStatus("ERROR");

                        // Remove Op ID
                        setOpID(null);

                        console.log(
                            "Operation Status: Error! Status: ",
                            response.data.status
                        );
                    }
                }
            })
            .catch((error: any) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    if (error.response.status === 404) {
                        console.warn('Resource not found - Operation may not be indexed yet');
                    } else {
                        console.error('Server error:', error.response.status, error.response.data);
                        setStatus('ERROR');
                    }
                } else if (error.request) {
                    // The request was made but no response was received
                    console.error('No response received:', error.request);
                    //setStatus('ERROR');
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error setting up request:', error.message);
                    setStatus('ERROR');
                }
            });
    };

    const onQueued = (filteredEvents: any[]): void => {
        let operId: number = 0;
        filteredEvents.forEach(function (events: any) {
            if (events.eventName === "OperationQueued") {
                // Is the event operation queue
                for (const [eveName, eveValue] of Object.entries(events.args)) {
                    if (eveName === "operId_") {
                        operId = parseInt(eveValue as string);
                    }
                }
            }
        });

        if (operId > 0) {
            console.log("Setting operation ID:", operId);
            setOpID(operId);
            //setOpID(33)
            setStatus("QUEUED");
        }
    };

    const onReceipt = async (receipt: any): Promise<void> => {
        // Tx is mined ok
        console.log("On receipt: ", receipt);

        // Events name list
        const filter: string[] = [
            "OperationError",
            "UnhandledError",
            "OperationQueued",
            "OperationExecuted",
        ];

        /*
        const contractName: string = "MocQueue";

        const txRcp = await auth.web3.eth.getTransactionReceipt(
            receipt.transactionHash
        );
        const filteredEvents: any[] = decodeEvents(txRcp, contractName, filter);

        // on Queue
        onQueued(filteredEvents);
        */
    };
    
    const statusLabels: StatusLabels = {
        SUBMIT: t("exchange.confirm.submit"),
        SIGN: t("exchange.confirm.sign"),
        QUEUING: t("exchange.confirm.queuing"),
        QUEUED: t("exchange.confirm.queued"),
        CONFIRMING: t("exchange.confirm.confirming"),
        SUCCESS: t("exchange.confirm.success"),
        ERROR: t("exchange.confirm.error"),
        DEFAULT: t("exchange.confirm.default"),
    };
    /*let sentIcon = "";
    let statusLabel = "";
    switch (status) {
        case "SUBMIT":
            sentIcon = "icon-tx-waiting";
            statusLabel = t("exchange.confirm.submit");
            break;
        case "SIGN":
            sentIcon = "icon-tx-signWallet";
            statusLabel = t("exchange.confirm.sign");
            break;
        case "QUEUING":
            sentIcon = "icon-tx-waiting";
            statusLabel = t("exchange.confirm.queuing");
            break;
        case "QUEUED":
            sentIcon = "icon-tx-waiting";
            statusLabel = t("exchange.confirm.queued");
            break;
        case "CONFIRMING":
            sentIcon = "icon-operation-tx-confirming";
            statusLabel = t("exchange.confirm.confirming");
            break;
        case "SUCCESS":
            sentIcon = "icon-tx-success";
            statusLabel = t("exchange.confirm.confirmed");
            break;
        case "ERROR":
            sentIcon = "icon-tx-error";
            statusLabel = t("exchange.confirm.error");
            break;
        default:
            sentIcon = "icon-tx-waiting";
            statusLabel = t("exchange.confirm.default");
    }*/

    const markStyle: MarkStyle = {
        style: {
            color: "#707070",
            fontSize: 10,
        },
    };

    const priceVariationToleranceMarks: PriceVariationToleranceMarks = {
        0: { ...markStyle, label: "0.0%" },
        1: { ...markStyle, label: "1%" },
        2: { ...markStyle, label: "2%" },
        5: { ...markStyle, label: "5%" },
        10: { ...markStyle, label: "10%" },
    };

    const changeTolerance = (newTolerance: number): void => {
        setAmountChanged(true);
        setTolerance(newTolerance);
        const limits: ToleranceLimits = toleranceLimits(newTolerance);
        const totalBalance: bigint = TokenBalance(userBalance, currencyYouExchange);
        if (limits.exchange > totalBalance) {
            console.log("Insufficient balance");
            setToleranceError("Tolerance exceeds user balance");
            setAmountYouExchangeLimit(limits.exchange);
            setAmountYouReceiveLimit(limits.receive);
            return;
        }
        setToleranceError("");
        setAmountYouExchangeLimit(limits.exchange);
        setAmountYouReceiveLimit(limits.receive);
    };

    const onClose = (): void => {
        setStatus("SUBMIT");
        onCloseModal();
    };

    // Commission Select Radio

    let commissionPAY: bigint = commission;
    let commissionPAYUSD: bigint = commissionUSD;
    let commissionPercentPAY: bigint = commissionPercent;
    let commissionSettings: any = TokenSettings(`CA_${caIndex}`);
    let commissionTokenName: string;

    if (IS_MINT) {
        commissionTokenName = t(`exchange.tokens.${currencyYouExchange}.abbr`, {
            ns: ns,
        });
    } else {
        commissionTokenName = t(`exchange.tokens.${currencyYouReceive}.abbr`, {
            ns: ns,
        });
    }

    if (radioSelectFee > 0) {
        // Pay with Fee Token
        commissionPAY = commissionFeeToken;
        commissionPAYUSD = commissionFeeTokenUSD;
        commissionPercentPAY = commissionPercentFeeToken;
        commissionSettings = TokenSettings(`TF_${caIndex}`);
        commissionTokenName = t(`exchange.tokens.TF.abbr`, {
            ns: ns,
        });
    }

    return (
        <div className="confirm-operation">
            <div className="tx-amount-group">
                <div className="tx-amount-container">
                    <div className="tx-amount-data">
                        <div className="tx-amount">
                            {PrecisionNumbers({
                                amount: amountYouExchangeLimit,
                                token: TokenSettings(currencyYouExchange),
                                decimals: amountYouExchangeLimit < 1n
                                    ? 12
                                    : 8,
                                i18n: i18n
                                
                            })}
                        </div>
                        <div className="tx-token">
                            {t(`exchange.tokens.${currencyYouExchange}.abbr`, {
                                ns: ns,
                            })}
                        </div>
                    </div>
                    {!amountChanged && IS_MINT && (
                        <div className="tx-amount-info">
                            {t(`exchange.priceVariation.warning`, {
                                ns: ns,
                            })}
                        </div>
                    )}
                </div>
                <div className="tx-direction">
                    <div className="swapArrow">
                        <div className="icon-arrow-down"></div>
                    </div>
                </div>
                <div className="tx-amount-container">
                    <div className="tx-amount-data">
                        <div className="tx-amount">
                            {PrecisionNumbers({
                                amount: amountYouReceive,
                                token: TokenSettings(currencyYouReceive),
                                decimals: amountYouReceive < 1n
                                    ? 12
                                    : 8,
                                i18n: i18n                                
                            })}
                        </div>
                        <div className="tx-token">
                            {t(`exchange.tokens.${currencyYouReceive}.abbr`, {
                                ns: ns,
                            })}
                        </div>
                    </div>
                    <div className="tx-amount-info">
                        {!IS_MINT && (
                            <div className="tx-amount-info">
                                {t("exchange.confirm.minimumWarning")}
                                <div className="">
                                    {PrecisionNumbers({
                                        amount: amountYouReceiveLimit,
                                        token: TokenSettings(
                                            currencyYouReceive
                                        ),
                                        decimals: 4,
                                        i18n: i18n                                        
                                    })}
                                </div>
                                {t("exchange.confirm.minimumExplanation")}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="divider-horizontal"></div>
            <div className="tx-fees-container">
                <div className="tx-fees-data">
                    <div className="tx-fees-item">
                        <span className={"token_exchange"}>
                            {t("fees.labelFee")} (
                            {PrecisionNumbers({
                                amount: commissionPercentPAY,
                                token: commissionSettings,
                                decimals: 2,
                                i18n: i18n                                
                            })}
                            %)
                        </span>
                        <span className={"symbol"}> ≈ </span>
                        <span className={"token_receive"}>
                            {PrecisionNumbers({
                                amount: commissionPAY,
                                decimals: 10,
                                token: commissionSettings,
                                i18n: i18n                                
                            })}
                        </span>
                        <span className={"token_receive_name"}>
                            {" "}
                            {commissionTokenName}
                        </span>
                        <span className={""}> (</span>
                        <span>
                            {!contractProtocolStatus?.data.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: commissionPAYUSD,
                                      decimals: 2,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      i18n: i18n,
                                      isUSD: true
                                  })}
                        </span>
                        <span className={""}>
                            {" "}
                            {t("exchange.exchangingCurrency")}
                        </span>
                        <span className={""}>) </span>
                    </div>
                    <div className={"tx-fees-item"}>
                        <span className={"token_exchange"}>
                            {t("fees.labelExecutionFee")}
                        </span>
                        <span className={"symbol"}> ≈ </span>
                        <span className={"token_receive"}>
                            {PrecisionNumbers({
                                amount: executionFee,
                                decimals: 10,
                                token: TokenSettings("COINBASE"),
                                i18n: i18n                                
                            })}
                        </span>
                        <span className={"token_receive_name"}>
                            {" "}
                            {t(`exchange.tokens.COINBASE.abbr`, {
                                ns: ns,
                            })}{" "}
                        </span>

                        <span className={""}> (</span>
                        <span>
                            {!contractProtocolStatus?.data.canOperate
                                ? "--"
                                : PrecisionNumbers({
                                      amount: executionFeeUSD,
                                      decimals: 2,
                                      token: TokenSettings(`CA_${caIndex}`),
                                      i18n: i18n,
                                      isUSD: true                                      
                                  })}
                        </span>
                        <span className={""}>
                            {" "}
                            USD
                        </span>
                        <span className={""}>) </span>
                    </div>
                </div>
                <div className="tx-fees-info">
                    {t("fees.disclaimer1")}
                    <br />
                    {t("fees.disclaimer2")}
                </div>
            </div>
            <div className="divider-horizontal"></div>
            {status === "SUBMIT" && (
                <div className="tx-submit">
                    <div className="customize-tolerance">
                        <Collapse accordion className="CollapseTolerance">
                            <Panel
                                showArrow={false}
                                header={
                                    <div className="VariationHeader">
                                        <div className="PriceVariationSetting">
                                            <i className="icon-preferences"></i>
                                            <span className="SliderText">
                                                {t(
                                                    "exchange.priceVariation.title"
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                }
                                key="1"
                            >
                                <div className="PriceVariationContainer">
                                    <div className="warningSlider">
                                        {t(
                                            "exchange.priceVariation.sliderLabel"
                                        )}
                                    </div>
                                    <Slider
                                        className="SliderControl"
                                        marks={priceVariationToleranceMarks}
                                        defaultValue={tolerance}
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        dots={false}
                                        onChange={(val: number) => changeTolerance(val)}
                                    />
                                </div>
                            </Panel>
                        </Collapse>
                    </div>
                    <div className="cta-container">
                        <div className="cta-info-group">
                            <div className="cta-info-summary">
                                <div className={"token_exchange"}>
                                    {t("exchange.exchangingSummary")}{" "}
                                </div>
                                <div className={"symbol"}>
                                    {" "}
                                    {t("exchange.exchangingSign")}{" "}
                                </div>
                                <div className={"token_receive"}>
                                    {PrecisionNumbers({
                                        amount: exchangingUSD,
                                        token: TokenSettings(`CA_${caIndex}`),
                                        decimals: 4,
                                        i18n: i18n,                                        
                                        isUSD: true,
                                    })}
                                </div>
                                <div className={"token_receive_name"}>
                                    {" "}
                                    {t("exchange.exchangingCurrency")}
                                </div>
                            </div>
                        </div>
                        {toleranceError !== "" && (
                            <div className="error-container">
                                <span className="confirm-error">
                                    {toleranceError}
                                </span>
                            </div>
                        )}
                        <div className="cta-options-group">
                            <Button
                                type="default"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("exchange.buttonCancel")}
                            </Button>
                            <button
                                type="button"
                                className="button"
                                onClick={onSendTransactionAllowFeeToken}
                                disabled={toleranceError !== ""}
                            >
                                {t("exchange.buttonConfirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {(status === "SIGN" ||
                status === "QUEUING" ||
                status === "QUEUED" ||
                status === "CONFIRMING" ||
                status === "SUCCESS" ||
                status === "ERROR") && (
                <div className="conditional-wrapper">
                    {(status === "QUEUING" ||
                        status === "QUEUED" ||
                        status === "CONFIRMING" ||
                        status === "SUCCESS" ||
                        status === "ERROR") && (
                        <div className="tx-id-container">
                            <div className="tx-id-data">
                                <div className="tx-id-label">
                                    {" "}
                                    {t("txFeedback.txIdLabel")}
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
                    )}
                    <div className="tx-feedback-container">
                        {/* <div className="tx-feedback-icon">
                            <div className={sentIcon}></div>
                        </div>
                        <div className="tx-feedback-text">{statusLabel}</div> */}
                        <TXStatus
                            statusData={{ status }}
                            statusLabels={statusLabels}
                        />
                    </div>

                    <div className="cta-container">
                        <div className="cta-options-group">
                            <button
                                type="button"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("exchange.buttonClose")}
                            </button>
                            {/* BOOKMARK */}
                        </div>
                    </div>
                </div>
            )}
            <ModalAllowanceOperation
                title={`${t("allowance.cardTitle")}  ${t(`exchange.tokens.${currencyYouExchange}.label`, { ns: ns })}`}
                visible={showModalAllowance}
                onHideModalAllowance={onHideModalAllowance}
                currencyYouExchange={currencyYouExchange}
                currencyYouReceive={currencyYouReceive}
                amountYouExchangeLimit={amountYouExchangeLimit}
                amountYouReceiveLimit={amountYouReceiveLimit}
                onRealSendTransaction={onRealSendTransaction}
                disAllowance={false}
            />
            <ModalAllowanceOperation
                title={
                    disAllowanceFeeToken
                        ? `${t("allowance.disallowanceTitle")}  ${t(`exchange.tokens.TF.abbr`, { ns: ns })}`
                        : `${t("allowance.cardTitle")}  ${t(`exchange.tokens.TF.abbr`, { ns: ns })}`
                }
                visible={showModalAllowanceFeeToken}
                onHideModalAllowance={onHideModalAllowanceFeeToken}
                currencyYouExchange={`TF_${caIndex}`}
                currencyYouReceive={`TF_${caIndex}`}
                amountYouExchangeLimit={commissionFeeToken}
                amountYouReceiveLimit={commissionFeeToken}
                onRealSendTransaction={onSendTransaction}
                disAllowance={disAllowanceFeeToken}
            />
        </div>
    );
}

ConfirmOperation.propTypes = {
    currencyYouExchange: PropTypes.string,
    currencyYouReceive: PropTypes.string,
    exchangingUSD: PropTypes.object,
    commission: PropTypes.object,
    commissionUSD: PropTypes.object,
    commissionPercent: PropTypes.object,
    inputAmountYouExchange: PropTypes.object,
    amountYouReceive: PropTypes.object,
    onCloseModal: PropTypes.func,
    executionFee: PropTypes.object,
    commissionFeeToken: PropTypes.object,
    commissionFeeTokenUSD: PropTypes.object,
    commissionPercentFeeToken: PropTypes.object,
    radioSelectFee: PropTypes.number,
};
