import { Collapse } from "antd";
import type { AxiosError } from "axios";
import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TransactionReceipt } from "viem";

import { decodeEvents } from "../../backend/transaction";
import { useWalletContext } from "../../context/Wallet";
import { API_OPERATIONS_BASE } from "../../services/apiConfig";
import { TokenSettings } from "../../helpers/currencies";
import { UserTokenAllowance } from "../../helpers/exchange";
import { calculateLimit } from "../../helpers/exchange";
import { useProjectTranslation } from "../../helpers/translations";
import type { AllowanceStep, CommissionsState } from "../../types/status";
import { ALLOWANCE_STEPS } from "../../types/status";
import CopyAddress from "../CopyAddress";
import DisplayAmount from "../DisplayAmount";
import ModalAllowanceOperation from "../Modals/Allowance";
import { PrecisionNumbers } from "../PrecisionNumbers";
import TXStatus from "./TXStatus";

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
    amountYouExchange: bigint;
    amountYouReceive: bigint;
    onCloseModal: () => void;
    executionFee: bigint;
    executionFeeUSD: bigint;
    selectedFeeCurrency: string;
    caIndex: number;
    operationType: string;
    slippageTolerance: number;
    amountAnotherToken: { qAC: bigint; amount: bigint };
    tpIndex: number;
    totalAmountExchangeInFiat: bigint;
    totalAmountReceiveInFiat: bigint;
}

type StatusType =
    | "SUBMIT"
    | "SIGN"
    | "QUEUING"
    | "QUEUED"
    | "CONFIRMING"
    | "SUCCESS"
    | "ERROR";

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
        amountYouExchange,
        amountYouReceive,
        onCloseModal,
        executionFee,
        executionFeeUSD,
        selectedFeeCurrency,
        caIndex,
        operationType,
        slippageTolerance,
        amountAnotherToken,
        tpIndex,
        totalAmountExchangeInFiat,
        totalAmountReceiveInFiat,
    } = props;

    const { t, i18n, ns } = useProjectTranslation();
    const space: string = "\u00A0";

    const { userBalance, interfaceExchangeMethod } = useWalletContext();

    const [status, setStatus] = useState<StatusType>("SUBMIT");

    const [txID, setTxID] = useState<string>("");
    const [opID, setOpID] = useState<number | null>(null);

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

    const [showModalAllowance, setShowModalAllowance] =
        useState<boolean>(false);
    const [showModalAllowanceFeeToken, setShowModalAllowanceFeeToken] =
        useState<boolean>(false);
    const [
        showModalAllowancePayCommission,
        setShowModalAllowancePayCommission,
    ] = useState<boolean>(false);
    const [disAllowanceFeeToken, setDisAllowanceFeeToken] =
        useState<boolean>(false);
    const [
        showModalAllowancePayAnotherToken,
        setShowModalAllowancePayAnotherToken,
    ] = useState<boolean>(false);

    // Use refs to store latest values to avoid recreating the callback
    const opIDRef = useRef<number | null>(opID);
    const caIndexRef = useRef<number>(caIndex);
    const userBalanceRefetchRef = useRef(userBalance.refetch);
    const pollAttemptRef = useRef<number>(0);

    const anotherTokenName: string =
        operationType === "COMBINED_MINT" ? `TC_${caIndex}` : `TP_${tpIndex}`;

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
        if (!API_OPERATIONS_BASE) {
            console.error(
                "[ConfirmOperation] API_OPERATIONS_BASE is not configured or failed allowlist validation"
            );
            return;
        }
        const apiUrl = new URL(API_OPERATIONS_BASE);
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
        if (
            opID === null ||
            opID < 0 ||
            (status !== "QUEUED" && status !== "QUEUING")
        ) {
            return;
        }

        pollAttemptRef.current = 0;
        let timeoutId: NodeJS.Timeout;

        const scheduleNext = () => {
            const attempt = pollAttemptRef.current++;
            const base = Math.min(5000 * Math.pow(2, attempt), 30000);
            const delay = base * (0.8 + Math.random() * 0.4);
            timeoutId = setTimeout(() => {
                opStatus();
                scheduleNext();
            }, delay);
        };

        scheduleNext();
        return () => clearTimeout(timeoutId);
    }, [opStatus, opID, status]);

    const onHideModalAllowancePayCurrencyExchange = (): void => {
        setShowModalAllowance(false);
    };

    const onShowModalAllowancePayCurrencyExchange = (): void => {
        setShowModalAllowance(true);
    };

    const onHideModalAllowancePayCommissionFeeToken = (): void => {
        setShowModalAllowanceFeeToken(false);
    };

    const onShowModalAllowancePayCommissionFeeToken = (): void => {
        setShowModalAllowanceFeeToken(true);
    };

    const onShowModalAllowancePayCommission = (): void => {
        setShowModalAllowancePayCommission(true);
    };
    const onHideModalAllowancePayCommission = (): void => {
        setShowModalAllowancePayCommission(false);
    };

    const onShowModalAllowancePayAnotherToken = (): void => {
        setShowModalAllowancePayAnotherToken(true);
    };
    const onHideModalAllowancePayAnotherToken = (): void => {
        setShowModalAllowancePayAnotherToken(false);
    };

    const showAllowancePayCurrencyExchange = (): boolean => {
        const tokenAllowance: bigint = UserTokenAllowance(
            userBalance,
            currencyYouExchange,
            caIndex
        );
        return amountYouExchange > tokenAllowance;
    };

    const showAllowancePayCommissionCA = (): boolean => {
        const tokenAllowance: bigint = UserTokenAllowance(
            userBalance,
            `CA_${caIndex}`,
            caIndex
        );

        return commissionsByKey[`CA_${caIndex}`].commission > tokenAllowance;
    };

    const showAllowancePayAnotherToken = (): boolean => {
        if (operationType !== "COMBINED_REDEEM") return false;
        let tokenName: string = "";
        if (operationType === "COMBINED_REDEEM") {
            tokenName = `TP_${tpIndex}`;
        }

        const tokenAllowance: bigint = UserTokenAllowance(
            userBalance,
            tokenName,
            caIndex
        );

        return amountAnotherToken.amount > tokenAllowance;
    };

    const showAllowancePayCommissionFeeToken = (): boolean => {
        //const caIndex = getCAIndex(currencyYouExchange, currencyYouReceive);
        const tokenAllowance: bigint = UserTokenAllowance(
            userBalance,
            `TF_${caIndex}`,
            caIndex
        );
        const payingFeeWithFeeToken = selectedFeeCurrency === "TF";

        if (
            !payingFeeWithFeeToken &&
            tokenAllowance > commissionsByKey["FeeToken"].commission
        ) {
            // if we select not to pay with fee token, please disallow to use Fee token
            setDisAllowanceFeeToken(true);
            // show allowance window
            return true;
        } else if (payingFeeWithFeeToken) {
            return commissionsByKey["FeeToken"].commission > tokenAllowance;
        }

        return false;
    };

    const onSendTransaction = (
        startPoint: AllowanceStep = "AllowancePayCommissionCA"
    ): void => {
        const startIndex = ALLOWANCE_STEPS.indexOf(startPoint);

        for (let i = startIndex; i < ALLOWANCE_STEPS.length; i++) {
            const step = ALLOWANCE_STEPS[i];

            if (step === "AllowancePayCommissionCA") {
                if (
                    operationType === "SWAP_TPFORTP" ||
                    operationType === "SWAP_TCFORTP" ||
                    operationType === "SWAP_TPFORTC"
                ) {
                    if (showAllowancePayCommissionCA()) {
                        onShowModalAllowancePayCommission();
                        return;
                    }
                }
            }

            if (step === "AllowancePayCommissionFeeToken") {
                if (showAllowancePayCommissionFeeToken()) {
                    onShowModalAllowancePayCommissionFeeToken();
                    return;
                }
            }

            if (step === "AllowancePayCurrencyExchange") {
                if (showAllowancePayCurrencyExchange()) {
                    onShowModalAllowancePayCurrencyExchange();
                    return;
                }
            }

            if (step === "AllowancePayAnotherToken") {
                if (showAllowancePayAnotherToken()) {
                    onShowModalAllowancePayAnotherToken();
                    return;
                }
            }

            if (step === "SubmitOperationTransaction") {
                onRealSendTransaction();
                return;
            }
        }
    };

    const onRealSendTransaction = (): void => {
        // Real send transaction
        setStatus("SIGN");

        let tokenAmount: bigint;
        let limitAmount: bigint;
        let qAssetMaxFees: bigint = 0n;
        if (operationType === "MINT" || operationType === "COMBINED_MINT") {
            tokenAmount = amountYouReceive;
            limitAmount = amountYouExchange;
        } else if (
            operationType === "REDEEM" ||
            operationType === "COMBINED_REDEEM"
        ) {
            tokenAmount = amountYouExchange;
            limitAmount = amountYouReceive;
        } else if (
            operationType === "SWAP_TCFORTP" ||
            operationType === "SWAP_TPFORTC" ||
            operationType === "SWAP_TPFORTP"
        ) {
            tokenAmount = amountYouExchange;
            limitAmount = amountYouReceive;
            qAssetMaxFees = calculateLimit(
                commissionsByKey[`CA_${caIndex}`].commission,
                slippageTolerance / 100
            );
        } else {
            throw new Error("Invalid type operation");
        }

        void interfaceExchangeMethod(
            currencyYouExchange,
            currencyYouReceive,
            tokenAmount,
            limitAmount,
            qAssetMaxFees,
            caIndex,
            tpIndex,
            operationType,
            amountAnotherToken.amount, // Pass amount of qTC
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

    const onClose = (): void => {
        setStatus("SUBMIT");
        onCloseModal();
    };

    // Commission Select Radio
    let commissionPAY: bigint = commissionsByKey[`CA_${caIndex}`].commission;
    let commissionPAYUSD: bigint =
        commissionsByKey[`CA_${caIndex}`].commissionUSD;
    let commissionPercentPAY: bigint =
        commissionsByKey[`CA_${caIndex}`].commissionPercent;
    let commissionSettings: ReturnType<typeof TokenSettings> = TokenSettings(
        `CA_${caIndex}`
    );
    let commissionTokenName: string;
    const executionFeeInGwei = (executionFee + 999999999n) / 1000000000n;
    const gweiToken = {
        ...TokenSettings("COINBASE"),
        decimals: 0,
        visibleDecimals: 0,
        visibleBalanceDecimals: 0,
    };

    if (operationType === "MINT" || operationType === "COMBINED_MINT") {
        commissionTokenName = t(`exchange.tokens.${currencyYouExchange}.abbr`, {
            ns: ns,
        });
    } else if (
        operationType === "REDEEM" ||
        operationType === "COMBINED_REDEEM"
    ) {
        commissionTokenName = t(`exchange.tokens.${currencyYouReceive}.abbr`, {
            ns: ns,
        });
    } else if (
        operationType === "SWAP_TPFORTP" ||
        operationType === "SWAP_TPFORTC" ||
        operationType === "SWAP_TCFORTP"
    ) {
        commissionTokenName = t(`exchange.tokens.CA_${caIndex}.abbr`, {
            ns: ns,
        });
    } else {
        throw new Error("Invalid type operation");
    }

    if (selectedFeeCurrency === "TF") {
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
                        <DisplayAmount
                            label={
                                operationType === "COMBINED_MINT" ||
                                operationType === "MINT"
                                    ? t("exchange.labelSendingMint")
                                    : t("exchange.labelSending")
                            }
                            value={amountYouExchange}
                            token={t(
                                `exchange.tokens.${currencyYouExchange}.abbr`,
                                {
                                    ns: ns,
                                }
                            )}
                            decimals={amountYouExchange < 1n ? 12 : 8}
                            /* equivalentValue={!contractProtocolStatus.data
                                ? 0n
                                : ConvertAmount(
                                    contractProtocolStatus,
                                    currencyYouExchange,
                                    "USD",
                                    amountYouExchange,
                                    caIndex
                                )} */
                        />
                    </div>

                    {operationType === "COMBINED_REDEEM" && (
                        <div className="tx-amount-data">
                            <DisplayAmount
                                label={t("exchange.labelSendingMint")}
                                value={amountAnotherToken.amount}
                                token={t(`exchange.tokens.TP_${tpIndex}.abbr`, {
                                    ns: ns,
                                })}
                                decimals={
                                    amountAnotherToken.amount < 1n ? 12 : 8
                                }
                                /* equivalentValue={!contractProtocolStatus.data
                                ? 0n
                                : ConvertAmount(
                                    contractProtocolStatus,
                                    `TP_${tpIndex}`,
                                    "USD",
                                    amountAnotherToken.amount,
                                    caIndex
                                )} */
                            />
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
                        <DisplayAmount
                            label={
                                operationType === "COMBINED_REDEEM" ||
                                operationType === "REDEEM" ||
                                operationType === "SWAP_TPFORTP" ||
                                operationType === "SWAP_TPFORTC" ||
                                operationType === "SWAP_TCFORTP"
                                    ? t("exchange.labelReceivingRedeem")
                                    : t("exchange.labelReceiving")
                            }
                            value={amountYouReceive}
                            token={t(
                                `exchange.tokens.${currencyYouReceive}.abbr`,
                                {
                                    ns: ns,
                                }
                            )}
                            decimals={amountYouReceive < 1n ? 12 : 8}
                            /* equivalentValue={!contractProtocolStatus.data
                                ? 0n
                                : ConvertAmount(
                                    contractProtocolStatus,
                                    currencyYouReceive,
                                    "USD",
                                    amountYouReceive,
                                    caIndex
                                )} */
                        />
                    </div>
                    {operationType === "COMBINED_MINT" && (
                        <div className="tx-amount-data">
                            <DisplayAmount
                                label={t("exchange.labelReceiving")}
                                value={amountAnotherToken.amount}
                                token={t(`exchange.tokens.TC_${caIndex}.abbr`, {
                                    ns: ns,
                                })}
                                decimals={
                                    amountAnotherToken.amount < 1n ? 12 : 8
                                }
                                /* equivalentValue={!contractProtocolStatus.data
                                ? 0n
                                : ConvertAmount(
                                    contractProtocolStatus,
                                    `TC_${caIndex}`,
                                    "USD",
                                    amountAnotherToken.amount,
                                    caIndex
                                )} */
                            />
                        </div>
                    )}
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
                                compact: true,
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
                                compact: true,
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
                                compact: true,
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
                                amount: executionFeeInGwei,
                                token: gweiToken,
                                i18n: i18n,
                                decimals: 0,
                                isInWei: false,
                            })}
                        </span>
                        <span className={"token_receive_name"}> GWEI </span>
                        <span className={""}> (</span>
                        <span>
                            {PrecisionNumbers({
                                amount: executionFeeUSD,
                                decimals: 2,
                                token: TokenSettings(`CA_${caIndex}`),
                                i18n: i18n,
                                isUSD: true,
                                compact: true,
                            })}
                        </span>
                        <span className={""}> USD</span>
                        <span className={""}>) </span>
                    </div>
                </div>{" "}
                <div className="tx-slippageTolerance">
                    <div className="tx-fees-item">
                        <span className="token_exchange">
                            {t("slippageTolerance.title")}
                        </span>
                        : {space}
                        <span className="token_receive">
                            {slippageTolerance}%
                        </span>
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
                                        decimals: 2,
                                        i18n: i18n,
                                        isUSD: true,
                                        compact: true,
                                    })}
                                </div>
                                <div className={"token_receive_name"}>
                                    {" "}
                                    {t("exchange.exchangingCurrency")}
                                </div>
                            </div>
                        </div>
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
                                onClick={() => onSendTransaction()}
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
                                data-testid="button-close-operation"
                            >
                                {t("exchange.buttonClose")}
                            </button>
                            {/* BOOKMARK */}
                        </div>
                    </div>
                </div>
            )}
            <ModalAllowanceOperation
                name="AllowancePayCurrencyExchange"
                title={`${t("allowance.cardTitle")}  ${t(`exchange.tokens.${currencyYouExchange}.label`, { ns: ns })}`}
                visible={showModalAllowance}
                onHideModalAllowance={onHideModalAllowancePayCurrencyExchange}
                currencyYouExchange={currencyYouExchange}
                currencyYouReceive={currencyYouReceive}
                amountYouExchangeLimit={amountYouExchange}
                //amountYouReceiveLimit={amountYouReceiveLimit}
                onCallback={onSendTransaction}
                disAllowance={false}
                caIndex={caIndex}
            />
            <ModalAllowanceOperation
                name="AllowancePayCommissionFeeToken"
                title={
                    disAllowanceFeeToken
                        ? `${t("allowance.disallowanceTitle")}  ${t(`exchange.tokens.TF.abbr`, { ns: ns })}`
                        : `${t("allowance.cardTitle")}  ${t(`exchange.tokens.TF.abbr`, { ns: ns })}`
                }
                visible={showModalAllowanceFeeToken}
                onHideModalAllowance={onHideModalAllowancePayCommissionFeeToken}
                currencyYouExchange={`TF_${caIndex}`}
                currencyYouReceive={`TF_${caIndex}`}
                amountYouExchangeLimit={
                    selectedFeeCurrency === "TF"
                        ? (commissionsByKey["FeeToken"].commission * 150n) /
                          100n
                        : commissionsByKey["FeeToken"].commission
                }
                //amountYouReceiveLimit={commissionFeeToken}
                onCallback={onSendTransaction}
                disAllowance={disAllowanceFeeToken}
                caIndex={caIndex}
            />
            <ModalAllowanceOperation
                name="AllowancePayCommissionCA"
                title={`${t("allowance.cardTitle")}  ${t(`exchange.tokens.CA_${caIndex}.abbr`, { ns: ns })}`}
                visible={showModalAllowancePayCommission}
                onHideModalAllowance={onHideModalAllowancePayCommission}
                currencyYouExchange={`CA_${caIndex}`}
                currencyYouReceive={`CA_${caIndex}`}
                amountYouExchangeLimit={calculateLimit(
                    commissionsByKey[`CA_${caIndex}`].commission,
                    slippageTolerance / 100
                )}
                //amountYouReceiveLimit={commissionFeeToken}
                onCallback={onSendTransaction}
                disAllowance={false}
                caIndex={caIndex}
            />
            <ModalAllowanceOperation
                name="AllowancePayAnotherToken"
                title={`${t("allowance.cardTitle")}  ${t(`exchange.tokens.${anotherTokenName}.abbr`, { ns: ns })}`}
                visible={showModalAllowancePayAnotherToken}
                onHideModalAllowance={onHideModalAllowancePayAnotherToken}
                currencyYouExchange={anotherTokenName}
                currencyYouReceive={anotherTokenName}
                amountYouExchangeLimit={amountAnotherToken.amount}
                onCallback={onSendTransaction}
                disAllowance={false}
                caIndex={caIndex}
            />
        </div>
    );
}
