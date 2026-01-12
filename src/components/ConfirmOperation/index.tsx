import { Collapse } from "antd";
import type { AxiosError } from "axios";
import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TransactionReceipt } from "viem";

import { decodeEvents } from "../../backend/transaction";
import { SlippageTolerance } from "../../components/SlippageTolerance";
import { useWalletContext } from "../../context/Wallet";
import { TokenBalance, TokenSettings } from "../../helpers/currencies";
import { calculateLimit, UserTokenAllowance } from "../../helpers/exchange";
import { useProjectTranslation } from "../../helpers/translations";
import CopyAddress from "../CopyAddress";
import ModalAllowanceOperation from "../Modals/Allowance";
import { PrecisionNumbers } from "../PrecisionNumbers";
import TXStatus from "./TXStatus";
import type { CommissionsState } from "../../types/status";

const { Panel } = Collapse;

interface OperationStatusResponse {
    status: number;
}

interface ContractEvent {
    eventName: string;
    args: Record<string, string | number>;
}

interface ConfirmOperationProps {
    currencyYouExchange: string;
    currencyYouReceive: string;
    exchangingUSD: bigint;
    commissionsByKey: CommissionsState;
    inputAmountYouExchange: bigint;
    amountYouReceive: bigint;
    onCloseModal: () => void;
    executionFee: bigint;
    executionFeeUSD: bigint;
    radioSelectFee: number;
    caIndex: number;
    slippageTolerance: number;
    onChangeSlippageTolerance: (value: number) => void;
    operationType: string;
}

type StatusType =
    | "SUBMIT"
    | "SIGN"
    | "QUEUING"
    | "QUEUED"
    | "CONFIRMING"
    | "SUCCESS"
    | "ERROR";

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
    [key: string]: MarkStyle & { label: string };
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
    [key: string]: string;
}


export default function ConfirmOperation(
    props: ConfirmOperationProps
): JSX.Element {
    const {
        currencyYouExchange,
        currencyYouReceive,
        exchangingUSD,
        commissionsByKey,
        inputAmountYouExchange,
        amountYouReceive,
        onCloseModal,
        executionFee,
        executionFeeUSD,
        radioSelectFee,
        caIndex,
        slippageTolerance,
        onChangeSlippageTolerance,
        operationType
    } = props;

    const { t, i18n, ns } = useProjectTranslation();

    const { contractProtocolStatus, userBalance, interfaceExchangeMethod } =
        useWalletContext();
    
    const [status, setStatus] = useState<StatusType>("SUBMIT");
    const [amountYouExchange, setAmountYouExchange] = useState<bigint>(
        inputAmountYouExchange
    );
    const [tolerance, setTolerance] = useState<number>(slippageTolerance);
    const [txID, setTxID] = useState<string>("");
    const [opID, setOpID] = useState<number | null>(null);
    const [toleranceError, setToleranceError] = useState<string>("");
    const [amountChanged, setAmountChanged] = useState<boolean>(false);

    const [slippageUiState, setSlippageUiState] = useState<{
        hasPendingCustom: boolean;
        isValid: boolean;
    }>({
        hasPendingCustom: false,
        isValid: true,
    });
    
    useEffect(() => {
        setAmountYouExchange(inputAmountYouExchange);
    }, [inputAmountYouExchange]);

    useEffect(() => {
        let timerId: NodeJS.Timeout;
        if (status === "QUEUING") {
            console.warn(
                "Operation queuing... waiting for operation execution."
            );
            timerId = setTimeout(() => {
                if (status === "QUEUING") {
                    setStatus("ERROR");
                    console.error(
                        "Operation failed after waiting 20 minutes for execution after queuing."
                    );
                }
            }, 600000);
        }
        if (status === "QUEUED") {
            console.warn(
                "Operation queued... waiting for operation execution."
            );
            timerId = setTimeout(() => {
                if (status === "QUEUED") {
                    setStatus("ERROR");
                    console.error(
                        "Operation failed after waiting 10 minutes for execution."
                    );
                }
            }, 600000);
        }

        return () => clearTimeout(timerId);
    }, [status]);

    const toleranceLimits = useCallback(
        (newTolerance: number): ToleranceLimits => {
            let limitExchange: bigint = 0n;
            let limitReceive: bigint = 0n;
            if (operationType === "MINT") {
                limitExchange = calculateLimit(
                    amountYouExchange,
                    newTolerance / 100
                );
                limitReceive = amountYouReceive;
            } else if (operationType === "REDEEM") {
                limitExchange = amountYouExchange;
                limitReceive = calculateLimit(
                    amountYouReceive,
                    -(newTolerance / 100)
                );
            } else if (operationType === "SWAP_TPFORTP") {
                limitExchange = amountYouExchange;
                limitReceive = amountYouReceive;
            }

            const limits: ToleranceLimits = {
                exchange: limitExchange,
                receive: limitReceive,
            };

            return limits;
        },
        [operationType, amountYouExchange, amountYouReceive]
    );

    const limits: ToleranceLimits = toleranceLimits(tolerance);

    const [amountYouExchangeLimit, setAmountYouExchangeLimit] =
        useState<bigint>(limits.exchange);
    const [amountYouReceiveLimit, setAmountYouReceiveLimit] = useState<bigint>(
        limits.receive
    );
    const [showModalAllowance, setShowModalAllowance] =
        useState<boolean>(false);
    const [showModalAllowanceFeeToken, setShowModalAllowanceFeeToken] =
        useState<boolean>(false);
    const [showModalAllowancePayCommission, setShowModalAllowancePayCommission] =
        useState<boolean>(false);
    const [disAllowanceFeeToken, setDisAllowanceFeeToken] =
        useState<boolean>(false);

    useEffect(() => {
        if (amountYouExchange) {
            const limits: ToleranceLimits = toleranceLimits(tolerance);
            setAmountYouExchangeLimit(limits.exchange);
        }
    }, [amountYouExchange, tolerance, toleranceLimits]);

    useEffect(() => {
        if (amountYouReceive) {
            const limits: ToleranceLimits = toleranceLimits(tolerance);
            setAmountYouReceiveLimit(limits.receive);
        }
    }, [amountYouReceive, tolerance, toleranceLimits]);

    // Use refs to store latest values to avoid recreating the callback
    const opIDRef = useRef<number | null>(opID);
    const caIndexRef = useRef<number>(caIndex);
    const userBalanceRefetchRef = useRef(userBalance.refetch);

    useEffect(() => {
        opIDRef.current = opID;
    }, [opID]);

    useEffect(() => {
        caIndexRef.current = caIndex;
    }, [caIndex]);

    useEffect(() => {
        userBalanceRefetchRef.current = userBalance.refetch;
    }, [userBalance.refetch]);

    const opStatus = useCallback((): void => {
        const currentOpID = opIDRef.current;
        const currentCaIndex = caIndexRef.current;

        //console.log("opStatus called with:", { currentOpID, currentCaIndex });

        if (currentOpID === null || currentOpID < 0) {
            console.warn("Operation Status: Checking... NO.");
            return;
        }
        const apiUrl = new URL(
            import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS
        );
        apiUrl.pathname = "/v1/operations/oper_id/";

        axios
            .get<OperationStatusResponse>(apiUrl.toString(), {
                params: {
                    oper_id: currentOpID,
                    bucket_index: currentCaIndex,
                },
                timeout: 10000,
            })
            .then((response) => {
                if (response.status === 200) {
                    if (response.data.status === 0) {
                        // Pending executed
                        console.warn("Operation Status: OK Pending execute.");
                    } else if (response.data.status === 1) {
                        // executed operation is finished

                        setStatus("SUCCESS");

                        // Remove Op ID
                        setOpID(null);

                        // Refresh user balance
                        void userBalanceRefetchRef.current();

                        console.warn("Operation Status: OK Executed.");
                    } else {
                        setStatus("ERROR");

                        // Remove Op ID
                        setOpID(null);

                        console.error(
                            "Operation Status: Error! Status: ",
                            response.data.status
                        );
                    }
                }
            })
            .catch((error: AxiosError<OperationStatusResponse>) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    if (error.response.status === 404) {
                        console.warn(
                            "Resource not found - Operation may not be indexed yet"
                        );
                    } else {
                        console.error(
                            "Server error:",
                            error.response.status,
                            error.response.data
                        );
                        setStatus("ERROR");
                    }
                } else if (error.request) {
                    // The request was made but no response was received
                    console.error("No response received:", error.request);
                    //setStatus('ERROR');
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error("Error setting up request:", error.message);
                    setStatus("ERROR");
                }
            });
    }, []);

    useEffect(() => {
        //console.log("Polling useEffect triggered:", { opID, status, shouldPoll: opID && opID >= 0 && (status === "QUEUED" || status === "QUEUING") });

        // Only poll if we have an opID and are in a state that requires polling
        if (
            opID === null ||
            opID < 0 ||
            (status !== "QUEUED" && status !== "QUEUING")
        ) {
            //console.log("Polling skipped - conditions not met", opID, status);
            return;
        }

        //console.log("Setting up polling interval for opStatus");
        const interval: NodeJS.Timeout = setInterval(() => {
            //console.log("Interval tick - calling opStatus", opID, status);
            opStatus();
        }, 5000);
        return () => {
            //console.log("Clearing polling interval");
            clearInterval(interval);
        };
    }, [opStatus, opID, status]);

    const onHideModalAllowance = (): void => {
        setShowModalAllowance(false);
    };

    const onShowModalAllowance = (): void => {
        setShowModalAllowance(true);
    };

    const showAllowance = (): boolean => {        
        const tokenAllowance: bigint = UserTokenAllowance(
            userBalance,
            currencyYouExchange,
            caIndex
        );
        return amountYouExchangeLimit > tokenAllowance;
    };

    const showAllowancePayCommission = (): boolean => {
        const tokenAllowance: bigint = UserTokenAllowance(
            userBalance,
            `CA_${caIndex}`,
            caIndex
        );
        const commissionLimit = calculateLimit(commissionsByKey[`CA_${caIndex}`].commission, tolerance / 100);

        return commissionLimit > tokenAllowance;        
    };

    const onHideModalAllowanceFeeToken = (): void => {
        setShowModalAllowanceFeeToken(false);
    };

    const onShowModalAllowanceFeeToken = (): void => {
        setShowModalAllowanceFeeToken(true);
    };

    const onShowModalAllowancePayCommission = (): void => {
        setShowModalAllowancePayCommission(true);
    };
    const onHideModalAllowancePayCommission = (): void => {
        setShowModalAllowancePayCommission(false);
    };

    const showAllowanceFeeToken = (): boolean => {
        //const caIndex = getCAIndex(currencyYouExchange, currencyYouReceive);
        const tokenAllowance: bigint = UserTokenAllowance(
            userBalance,
            `TF_${caIndex}`,
            caIndex
        );

        if (radioSelectFee === 0 && tokenAllowance > commissionsByKey["FeeToken"].commission) {
            // if we select not to pay with fee token, please disallow to use Fee token
            setDisAllowanceFeeToken(true);
            // show allowance window
            return true;
        } else if (radioSelectFee === 0) {
            return commissionsByKey["FeeToken"].commission >= tokenAllowance;
        }

        return false;
    };

    /*const onSendTransactionAllowFeeToken = (): void => {
        // Show modal allowance
        if (showAllowanceFeeToken()) {
            onShowModalAllowanceFeeToken();
            return;
        }

        // If allowance is ok please send real operation transaction
        onSendTransaction();
    };*/

    const onSendTransaction = (): void => {

        // Only on SWAP_TPFORTP operation type
        if (operationType === "SWAP_TPFORTP") {
            // Show allowance Fee Token modal
            if (showAllowancePayCommission()) {
                onShowModalAllowancePayCommission();
                return;
            }
        }

        // Show allowance Fee Token modal
        if (showAllowanceFeeToken()) {
            onShowModalAllowanceFeeToken();
            return;
        }

        // Show modal allowance token
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
        let qAssetMaxFees: bigint = 0n;
        if (operationType === "MINT") {
            tokenAmount = amountYouReceive;
            limitAmount = amountYouExchangeLimit;
        } else if (operationType === "REDEEM") {
            tokenAmount = amountYouExchange;
            limitAmount = amountYouReceiveLimit;
        } else if (operationType === "SWAP_TPFORTP") {
            tokenAmount = amountYouExchange;
            limitAmount = amountYouExchangeLimit;
            qAssetMaxFees = calculateLimit(commissionsByKey[`CA_${caIndex}`].commission, tolerance / 100)
        } else {
            throw new Error("Invalid type operation");
        }

        void interfaceExchangeMethod(
            currencyYouExchange,
            currencyYouReceive,
            tokenAmount,
            limitAmount,
            qAssetMaxFees,
            onTransaction,
            onReceipt
        )
            .then((/*value*/) => {
                //console.warn("DONE!");
            })
            .catch((error: AxiosError) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    if (error.response.status === 404) {
                        console.warn(
                            "Resource not found - Operation may not be indexed yet"
                        );
                    } else {
                        console.error(
                            "Server error:",
                            error.response.status,
                            error.response.data
                        );
                        setStatus("ERROR");
                    }
                } else if (error.request) {
                    // The request was made but no response was received
                    console.error("No response received:", error.request);
                    setStatus("ERROR");
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error("Error setting up request:", error.message);
                    setStatus("ERROR");
                }
            });
    };

    const onTransaction = (transactionHash: string): void => {
        // Tx receipt detected change status to waiting
        setStatus("QUEUING");
        console.warn("On transaction: ", transactionHash);
        setTxID(transactionHash);
    };

    const onQueued = (filteredEvents: ContractEvent[]): void => {
        let operId: number = -1;
        filteredEvents.forEach(function (events: ContractEvent) {
            if (events.eventName === "OperationQueued") {
                // Is the event operation queue
                for (const [eveName, eveValue] of Object.entries(events.args)) {
                    if (eveName === "operId_") {
                        operId = parseInt(eveValue as string);
                    }
                }
            }
        });

        if (operId >= 0) {
            console.warn("Setting operation ID:", operId);
            setOpID(operId);
            //setOpID(33)
            setStatus("QUEUED");
        }
    };

    const onReceipt = (receipt: unknown): void => {
        // Tx is mined ok
        console.warn("On receipt: ", receipt);

        // Events name list
        const filter: string[] = [
            "OperationError",
            "UnhandledError",
            "OperationQueued",
            "OperationExecuted",
        ];

        const contractName = "MocQueue" as const;

        //const txRcp = await auth.web3.eth.getTransactionReceipt(
        //    receipt.transactionHash
        //);
        const txRcp = receipt as TransactionReceipt;
        const filteredEvents: ContractEvent[] =
            (decodeEvents(txRcp, contractName, filter) as ContractEvent[]) ||
            [];

        // on Queue
        onQueued(filteredEvents);
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
        const totalBalance: bigint = TokenBalance(
            userBalance,
            currencyYouExchange
        );
        if (limits.exchange > totalBalance) {
            console.warn("Insufficient balance");
            setToleranceError("Tolerance exceeds user balance");
            setAmountYouExchangeLimit(limits.exchange);
            setAmountYouReceiveLimit(limits.receive);
            return;
        }
        setToleranceError("");
        setAmountYouExchangeLimit(limits.exchange);
        setAmountYouReceiveLimit(limits.receive);
        onChangeSlippageTolerance(newTolerance);
    };

    const onClose = (): void => {
        setStatus("SUBMIT");
        onCloseModal();
    };

    const onSlippageInteractionChange = useCallback(
        (next: { hasPendingCustom: boolean; isValid: boolean }) => {
            setSlippageUiState((prev) =>
                prev.hasPendingCustom === next.hasPendingCustom &&
                prev.isValid === next.isValid
                    ? prev
                    : next
            );
        },
        []
    );

    // Commission Select Radio
    let commissionPAY: bigint = commissionsByKey[`CA_${caIndex}`].commission;
    let commissionPAYUSD: bigint = commissionsByKey[`CA_${caIndex}`].commissionUSD;
    let commissionPercentPAY: bigint = commissionsByKey[`CA_${caIndex}`].commissionPercent;
    let commissionSettings: ReturnType<typeof TokenSettings> = TokenSettings(
        `CA_${caIndex}`
    );
    let commissionTokenName: string;

    if (operationType === "MINT")  {
        commissionTokenName = t(`exchange.tokens.${currencyYouExchange}.abbr`, {
            ns: ns,
        });
    } else if (operationType === "REDEEM") {
        commissionTokenName = t(`exchange.tokens.${currencyYouReceive}.abbr`, {
            ns: ns,
        });
    } else if (operationType === "SWAP_TPFORTP") {
        commissionTokenName = t(`exchange.tokens.CA_${caIndex}.abbr`, {
            ns: ns,
        });
    } else {
        throw new Error("Invalid type operation");
    }

    if (radioSelectFee === 0) {
        // Pay with Fee Token
        commissionPAY = commissionsByKey["FeeToken"].commission;
        commissionPAYUSD = commissionsByKey["FeeToken"].commissionUSD;
        commissionPercentPAY = commissionsByKey["FeeToken"].commissionPercent;
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
                                decimals: amountYouExchangeLimit < 1n ? 12 : 8,
                                i18n: i18n,
                            })}
                        </div>
                        <div className="tx-token">
                            {t(`exchange.tokens.${currencyYouExchange}.abbr`, {
                                ns: ns,
                            })}
                        </div>
                    </div>
                    {!amountChanged && (operationType === "MINT") && (
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
                                decimals: amountYouReceive < 1n ? 12 : 8,
                                i18n: i18n,
                            })}
                        </div>
                        <div className="tx-token">
                            {t(`exchange.tokens.${currencyYouReceive}.abbr`, {
                                ns: ns,
                            })}
                        </div>
                    </div>
                    <div className="tx-amount-info">
                        {operationType !== "MINT" && (
                            <div className="tx-amount-info">
                                {t("exchange.confirm.minimumWarning")}
                                <div className="">
                                    {PrecisionNumbers({
                                        amount: amountYouReceiveLimit,
                                        token: TokenSettings(
                                            currencyYouReceive
                                        ),
                                        decimals: 4,
                                        i18n: i18n,
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
                                i18n: i18n,
                            })}
                            %)
                        </span>
                        <span className={"symbol"}> ≈ </span>
                        <span className={"token_receive"}>
                            {PrecisionNumbers({
                                amount: commissionPAY,
                                decimals: 10,
                                token: commissionSettings,
                                i18n: i18n,
                            })}
                        </span>
                        <span className={"token_receive_name"}>
                            {" "}
                            {commissionTokenName}
                        </span>
                        <span className={""}> (</span>
                        <span>
                            {PrecisionNumbers({
                                amount: commissionPAYUSD,
                                decimals: 2,
                                token: TokenSettings(`CA_${caIndex}`),
                                i18n: i18n,
                                isUSD: true,
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
                                i18n: i18n,
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
                            {PrecisionNumbers({
                                amount: executionFeeUSD,
                                decimals: 2,
                                token: TokenSettings(`CA_${caIndex}`),
                                i18n: i18n,
                                isUSD: true,
                            })}
                        </span>
                        <span className={""}> USD</span>
                        <span className={""}>) </span>
                    </div>
                </div>
                <div className="tx-fees-info">
                    {t("fees.disclaimer1")}
                    <br />
                    {t("fees.disclaimer2")}
                </div>
            </div>
            {/* <div className="divider-horizontal"></div> */}
            {status === "SUBMIT" && (
                <div className="tx-submit">
                    <div className="cta-container">
                        <SlippageTolerance
                            pairId={`${currencyYouExchange}-${currencyYouReceive}`}
                            defaultState={{
                                mode: "auto",
                                value: tolerance,
                            }}
                            onChange={(next) => changeTolerance(next.value)}
                            onInteractionChange={onSlippageInteractionChange}
                        />
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
                            <button
                                type="button"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("exchange.buttonCancel")}
                            </button>
                            <button
                                type="button"
                                className="button"
                                data-testid="confirm-operation-submit"
                                onClick={onSendTransaction}
                                disabled={
                                    toleranceError !== "" ||
                                    !slippageUiState.isValid
                                }
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
                //amountYouReceiveLimit={amountYouReceiveLimit}
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
                amountYouExchangeLimit={commissionsByKey["FeeToken"].commission}
                //amountYouReceiveLimit={commissionFeeToken}
                onRealSendTransaction={onSendTransaction}
                disAllowance={disAllowanceFeeToken}
            />
            <ModalAllowanceOperation
                title={
                    `${t("allowance.cardTitle")}  ${t(`exchange.tokens.CA_${caIndex}.abbr`, { ns: ns })}`
                }
                visible={showModalAllowancePayCommission}
                onHideModalAllowance={onHideModalAllowancePayCommission}
                currencyYouExchange={`CA_${caIndex}`}
                currencyYouReceive={`CA_${caIndex}`}
                amountYouExchangeLimit={calculateLimit(commissionsByKey[`CA_${caIndex}`].commission, tolerance / 100)}
                //amountYouReceiveLimit={commissionFeeToken}
                onRealSendTransaction={onSendTransaction}
                disAllowance={false}
            />
        </div>
    );
}
