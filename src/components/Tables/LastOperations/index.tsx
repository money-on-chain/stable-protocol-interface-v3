import "./Styles.scss";

import { DownCircleOutlined, UpCircleOutlined } from "@ant-design/icons";
import { Modal, Skeleton, Table } from "antd";
import React, {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Moment from "react-moment";

import { useWalletContext } from "../../../context/Wallet";
import { TokenSettings } from "../../../helpers/currencies";
import date from "../../../helpers/date";
import { useProjectTranslation } from "../../../helpers/translations";
import api from "../../../services/api";
import settings from "../../../settings/settings.json";
import type { TokenConfig } from "../../../types/hooks";
import Copy from "../../Copy";
import AboutQueue from "../../Modals/AboutQueue";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import RowDetailMobile from "../RowDetailMobile";

// Type definitions
interface LastOperationsProps {
    token: string;
}

interface DetailData {
    event: string;
    created: React.ReactNode;
    gas_used: string | number;
    oper_id: string | number | null;
    confirmation: React.ReactNode | string;
    recipient: React.ReactNode | string;
    status: string;
    error_code: string | number;
    block: string | number;
    executed_tx_hash: string;
    executed_tx_hash_truncate: string;
    fee: React.ReactNode | string;
    tx_hash: string;
    tx_hash_truncate: string;
    msg: string;
    reason: string;
    exchange?: {
        action?: string;
        amount: string | number;
        name: string;
        title: string;
    };
    receive?: {
        action?: string;
        amount: string | number;
        name: string;
        title: string;
    };
}

interface OperationData {
    _id: string;
    operation: string;
    operId_: number | null;
    bucket_index: number;
    executed?: {
        qAC_?: string;
        qACmax?: string;
        qTC_?: string;
        qTC?: string;
        qTP_?: string;
        qACmin?: string;
        qFeeToken_?: string;
        qFeeTokenVendorMarkup_?: string;
        qACfee_?: string;
        qACVendorMarkup_?: string;
        tpIndex_?: number;
        blockNumber?: number;
    };
    params?: {
        qAC_?: string;
        qACmax?: string;
        qTC_?: string;
        qTC?: string;
        qTP?: string;
        qACmin?: string;
        tpIndex_?: number;
        recipient?: string;
        amount?: string;
        token?: string;
        sender?: string;
        hash?: string;
        blockNumber?: number;
    };
    status: number;
    createdAt: string;
    lastUpdatedAt: string;
    confirmationTime?: string;
    blockNumber?: number;
    hash?: string;
    gas_fee?: string;
    gasFeeRBTC?: string;
    gas?: string;
    gasPrice?: string;
    gasUsed?: string;
    errorCode_?: string;
    msg_?: string;
    reason_?: string;
    tokenInvolved?: string;
}

interface ApiResponse {
    operations: OperationData[];
    total: number;
}

interface TokenExchangeResult {
    exchange: {
        action?: string;
        amount: string | number;
        name: string;
        token: unknown;
        icon: string;
        title: string;
    };
    receive: {
        action?: string;
        amount: string | number;
        name: string;
        token: unknown;
        icon: string;
        title: string;
    };
}

interface TableRowData {
    key: string;
    info: string;
    exchange: React.ReactNode;
    receive: React.ReactNode;
    date: React.ReactNode;
    status: React.ReactNode;
    detail: DetailData;
    renderRow: React.ReactNode;
    description: React.ReactNode;
}

interface ExpandIconProps {
    expanded: boolean;
    onClick: () => void;
}

export default function LastOperations(props: LastOperationsProps) {
    const { token } = props;
    const [current, setCurrent] = useState(1);
    const { t, i18n, ns } = useProjectTranslation();
    const { isConnected, address, blockNumber } = useWalletContext();
    const [ready, setReady] = useState(false);

    // Reset initial load flag when wallet disconnects or address changes
    useEffect(() => {
        if (!isConnected || !address) {
            hasInitialLoadRef.current = false;
            setReady(false);
        }
    }, [isConnected, address]);
    /*useEffect(() => {
        if (auth.contractStatusData) {
            setReady(true);
        }
    }, [auth]);*/

    //const { accountData = {} as any } = auth;
    const [dataJson, setDataJson] = useState<ApiResponse>({
        operations: [],
        total: 0,
    });
    const [totalTable, setTotalTable] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    //const [loadingSke, setLoadingSke] = useState(true);
    const [queueModal, setQueueModal] = useState(false);
    const lastOperationsHeight = getComputedStyle(
        document.querySelector(":root") as Element
    )
        .getPropertyValue("--lastOperationsHeight")
        .split('"')
        .join("");
    /*const timeSke = 1500;*/

    // Ref to track if a request is in progress to prevent overlapping calls
    const isLoadingRef = useRef<boolean>(false);
    // Ref to track if initial load has happened
    const hasInitialLoadRef = useRef<boolean>(false);
    // Refs to store current values to avoid recreating callback
    const currentRef = useRef(current);
    const pageSizeRef = useRef(pageSize);
    const isConnectedRef = useRef(isConnected);
    const addressRef = useRef(address);
    const blockNumberRef = useRef(blockNumber);

    // Update refs when values change
    useEffect(() => {
        currentRef.current = current;
    }, [current]);
    useEffect(() => {
        pageSizeRef.current = pageSize;
    }, [pageSize]);
    useEffect(() => {
        isConnectedRef.current = isConnected;
    }, [isConnected]);
    useEffect(() => {
        addressRef.current = address;
    }, [address]);
    useEffect(() => {
        blockNumberRef.current = blockNumber;
    }, [blockNumber]);

    const fetchTransactions = useCallback((isPolling = false) => {
        if (
            isConnectedRef.current &&
            blockNumberRef.current &&
            addressRef.current &&
            !isLoadingRef.current
        ) {
            isLoadingRef.current = true;
            const skip = (currentRef.current - 1) * pageSizeRef.current;

            const url = new URL(
                import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS
            );
            url.pathname = "/v1/operations/list/";
            url.search = new URLSearchParams({
                recipient: addressRef.current || "",
                limit: String(pageSizeRef.current),
                skip: String(skip),
            }).toString();

            api("get", url.toString())
                .then((response: unknown) => {
                    const typedResponse = response as ApiResponse;
                    setDataJson(typedResponse);
                    setTotalTable(typedResponse.total);
                    setReady(true);
                    if (!isPolling) {
                        hasInitialLoadRef.current = true;
                    }
                })
                .catch((error) => {
                    console.error(error);
                    // Don't set ready to false on error, keep showing existing data
                })
                .finally(() => {
                    isLoadingRef.current = false;
                });
        }
    }, []); // Empty deps - using refs for all values
    // #section Operation detail custom expand function
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

    // Expansion / Contraction
    const handleExpand = useCallback(
        (expanded: boolean, record: { key: string }) => {
            setExpandedKeys((prevKeys) => {
                return expanded
                    ? [...prevKeys, record.key]
                    : prevKeys.filter((key) => key !== record.key);
            });
        },
        []
    );

    // Expansion Icon
    const ExpandIcon: React.FC<ExpandIconProps> = ({ expanded, onClick }) => (
        <div onClick={onClick} style={{ cursor: "pointer" }}>
            {expanded ? <UpCircleOutlined /> : <DownCircleOutlined />}
        </div>
    );

    // #endsection Operation detail custom expand function

    const columns = [
        {
            dataIndex: "renderRow",
            // width: 200,
            hidden: false,
        },
    ].filter((item) => !item.hidden);
    // Initial load - immediate, no delay
    useEffect(() => {
        if (
            isConnected &&
            blockNumber &&
            address &&
            !hasInitialLoadRef.current
        ) {
            fetchTransactions(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, blockNumber, address]);

    // Polling - only after initial load, with interval
    useEffect(() => {
        if (!isConnected || !blockNumber || !address) {
            return;
        }

        let intervalId: NodeJS.Timeout | null = null;
        let checkTimeoutId: NodeJS.Timeout | null = null;

        // Wait for initial load before starting polling
        const startPolling = () => {
            if (hasInitialLoadRef.current) {
                // Poll every 20 seconds
                intervalId = setInterval(() => {
                    fetchTransactions(true);
                }, 20000);
            } else {
                // Check again after a short delay if initial load hasn't happened
                checkTimeoutId = setTimeout(startPolling, 100);
            }
        };

        checkTimeoutId = setTimeout(startPolling, 100);

        return () => {
            if (checkTimeoutId) clearTimeout(checkTimeoutId);
            if (intervalId) clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, blockNumber, address]);

    // Reload when page or pageSize changes
    useEffect(() => {
        if (
            isConnected &&
            blockNumber &&
            address &&
            hasInitialLoadRef.current
        ) {
            fetchTransactions(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, pageSize, isConnected, blockNumber, address]);

    const onChange = (page: number) => {
        if (isConnected) {
            setCurrent(page);
        }
    };

    const getTokenInfo = useCallback((token: string) => {
        switch (token) {
            case "CA_0":
                return {
                    name: (settings.tokens.CA as TokenConfig[])[0]?.name || "",
                    token: (settings.tokens.CA as TokenConfig[])[0],
                };
            case "CA_1":
                return {
                    name: (settings.tokens.CA as TokenConfig[])[1]?.name || "",
                    token: (settings.tokens.CA as TokenConfig[])[1],
                };
            case "TC_0":
                return {
                    name: settings.tokens.TC[0].name,
                    token: settings.tokens.TC[0],
                };
            case "TC_1":
                return {
                    name: settings.tokens.TC[1].name,
                    token: settings.tokens.TC[1],
                };
            case "TP_0":
                return {
                    name: settings.tokens.TP[0].name,
                    token: settings.tokens.TP[0],
                };
            case "TP_1":
                return {
                    name: settings.tokens.TP[1].name,
                    token: settings.tokens.TP[1],
                };
            case "FeeToken":
                return {
                    name: settings.tokens.TF[0].name,
                    token: settings.tokens.TF[0],
                };
            default:
                console.warn("UNRECOGNIZED TOKEN: " + token);
                return undefined;
        }
    }, []);

    const tokenExchange = useCallback(
        (row_operation: OperationData): TokenExchangeResult | undefined => {
            let status = "";
            if (row_operation.executed) {
                status = "executed";
            } else if (row_operation.params) {
                status = "params";
            }

            const caIndex = row_operation.bucket_index;

            if (!status) {
                return {
                    exchange: {
                        amount: 0,
                        name: "",
                        token: (settings.tokens.CA as TokenConfig[])[caIndex],
                        icon: `CA_${caIndex}`,
                        title: t("operations.actions.exchanged"),
                    },
                    receive: {
                        amount: 0,
                        name: "",
                        token: (settings.tokens.CA as TokenConfig[])[caIndex],
                        icon: `CA_${caIndex}`,
                        title: t("operations.actions.received"),
                    },
                };
            }

            if (row_operation.operation === "TCMint") {
                return {
                    exchange: {
                        action: "TCMint",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qAC_ || 0
                                : row_operation.params?.qACmax || 0,
                        name:
                            (settings.tokens.CA as TokenConfig[])[caIndex]
                                ?.name || "",
                        token: (settings.tokens.CA as TokenConfig[])[caIndex],
                        icon: `CA_${caIndex}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.exchanged")
                                : t("operations.actions.exchanging"),
                    },
                    receive: {
                        action: "TCMint",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTC_ || 0
                                : row_operation.params?.qTC || 0,
                        name: settings.tokens.TC[caIndex].name,
                        token: settings.tokens.TC[caIndex],
                        icon: `TC_${caIndex}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.received")
                                : t("operations.actions.receiving"),
                    },
                };
            } else if (row_operation.operation === "TCRedeem") {
                return {
                    exchange: {
                        action: "TCRedeem",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTC_ || 0
                                : row_operation.params?.qTC || 0,
                        name: settings.tokens.TC[caIndex].name,
                        token: settings.tokens.TC[caIndex],
                        icon: `TC_${caIndex}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.exchanged")
                                : t("operations.actions.exchanging"),
                    },
                    receive: {
                        action: "TCRedeem",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qAC_ || 0
                                : row_operation.params?.qACmin || 0,
                        name:
                            (settings.tokens.CA as TokenConfig[])[caIndex]
                                ?.name || "",
                        token: (settings.tokens.CA as TokenConfig[])[caIndex],
                        icon: `CA_${caIndex}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.received")
                                : t("operations.actions.receiving"),
                    },
                };
            } else if (row_operation["operation"] === "TPMint") {
                const statusData =
                    status === "executed"
                        ? row_operation.executed
                        : row_operation.params;
                let tp_index =
                    statusData?.tpIndex_ ||
                    (statusData as { tpIndex?: number })?.tpIndex;
                if (tp_index === undefined) tp_index = 0;

                return {
                    exchange: {
                        action: "TPMint",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qAC_ || 0
                                : row_operation.params?.qACmax || 0,
                        name:
                            (settings.tokens.CA as TokenConfig[])[caIndex]
                                ?.name || "",
                        token: (settings.tokens.CA as TokenConfig[])[caIndex],
                        icon: `CA_${caIndex}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.exchanged")
                                : t("operations.actions.exchanging"),
                    },
                    receive: {
                        action: "TPMint",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTP_ || 0
                                : row_operation.params?.qTP || 0,
                        name: settings.tokens.TP[tp_index].name,
                        token: settings.tokens.TP[tp_index],
                        icon: `TP_${tp_index}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.received")
                                : t("operations.actions.receiving"),
                    },
                };
            } else if (row_operation["operation"] === "TPRedeem") {
                const statusData =
                    status === "executed"
                        ? row_operation.executed
                        : row_operation.params;
                let tp_index =
                    statusData?.tpIndex_ ||
                    (statusData as { tpIndex?: number })?.tpIndex;
                if (tp_index === undefined) tp_index = 0;

                return {
                    exchange: {
                        action: "TPRedeem",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTP_ || 0
                                : row_operation.params?.qTP || 0,
                        name: settings.tokens.TP[tp_index].name,
                        token: settings.tokens.TP[tp_index],
                        icon: `TP_${tp_index}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.exchanged")
                                : t("operations.actions.exchanging"),
                    },
                    receive: {
                        action: "TPRedeem",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qAC_ || 0
                                : row_operation.params?.qACmin || 0,
                        name:
                            (settings.tokens.CA as TokenConfig[])[caIndex]
                                ?.name || "",
                        token: (settings.tokens.CA as TokenConfig[])[caIndex],
                        icon: `CA_${caIndex}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.received")
                                : t("operations.actions.receiving"),
                    },
                };
            } else if (row_operation["operation"] === "TPSwapForTP") {
                const statusData =
                    status === "executed"
                        ? row_operation.executed
                        : row_operation.params;
                let tp_from_index =
                    statusData?.tpFromIndex_ ||
                    (statusData as { tpFromIndex?: number })?.tpFromIndex;
                if (tp_from_index === undefined) tp_from_index = 0;
                let tp_to_index =
                    statusData?.tpToIndex_ ||
                    (statusData as { tpToIndex?: number })?.tpToIndex;
                if (tp_to_index === undefined) tp_to_index = 0;

                return {
                    exchange: {
                        action: "TPSwapForTP",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTPfrom_ || 0
                                : row_operation.params?.qTP || 0,
                        name: settings.tokens.TP[tp_from_index].name,
                        token: settings.tokens.TP[tp_from_index],
                        icon: `TP_${tp_from_index}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.exchanged")
                                : t("operations.actions.exchanging"),
                    },
                    receive: {
                        action: "TPSwapForTP",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTPto_ || 0
                                :  0,
                        name: settings.tokens.TP[tp_to_index].name,
                        token: settings.tokens.TP[tp_to_index],
                        icon: `TP_${tp_to_index}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.received")
                                : t("operations.actions.receiving"),
                    },
                };
            } else if (row_operation["operation"] === "TCSwapForTP") {
                const statusData =
                    status === "executed"
                        ? row_operation.executed
                        : row_operation.params;
                let tp_index =
                    statusData?.tpIndex_ ||
                    (statusData as { tpIndex?: number })?.tpIndex;
                if (tp_index === undefined) tp_index = 0;

                return {
                    exchange: {
                        action: "TCSwapForTP",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTC_ || 0
                                : row_operation.params?.qTC || 0,
                        name: settings.tokens.TC[caIndex].name,
                        token: settings.tokens.TC[caIndex],
                        icon: `TC_${caIndex}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.exchanged")
                                : t("operations.actions.exchanging"),
                    },
                    receive: {
                        action: "TCSwapForTP",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTP_ || 0
                                : row_operation.params?.qTPmin || 0,
                        name: settings.tokens.TP[tp_index].name,
                        token: settings.tokens.TP[tp_index],
                        icon: `TP_${tp_index}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.received")
                                : t("operations.actions.receiving"),
                    },
                };  
            } else if (row_operation["operation"] === "TPSwapForTC") {
                const statusData =
                    status === "executed"
                        ? row_operation.executed
                        : row_operation.params;
                let tp_index =
                    statusData?.tpIndex_ ||
                    (statusData as { tpIndex?: number })?.tpIndex;
                if (tp_index === undefined) tp_index = 0;

                return {
                    exchange: {
                        action: "TPSwapForTC",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTP_ || 0
                                : row_operation.params?.qTP || 0,
                        name: settings.tokens.TP[tp_index].name,
                        token: settings.tokens.TP[tp_index],
                        icon: `TP_${tp_index}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.exchanged")
                                : t("operations.actions.exchanging"),
                    },
                    receive: {
                        action: "TPSwapForTC",
                        amount:
                            status === "executed"
                                ? row_operation.executed?.qTC_ || 0
                                : row_operation.params?.qTC || 0,
                        name: settings.tokens.TC[caIndex].name,
                        token: settings.tokens.TC[caIndex],
                        icon: `TC_${caIndex}`,
                        title:
                            status === "executed"
                                ? t("operations.actions.received")
                                : t("operations.actions.receiving"),
                    },
                };
            } else if (row_operation.operation === "Transfer") {
                const tokenParam = row_operation.params?.token;
                if (!tokenParam) return undefined;

                const token_info = getTokenInfo(tokenParam);
                if (!token_info) return undefined;

                return {
                    exchange: {
                        action: "Transfer",
                        amount: row_operation.params?.amount || 0,
                        name: token_info.name,
                        token: token_info.token,
                        icon: tokenParam,
                        title:
                            status === "executed"
                                ? "TRANSFERRED"
                                : t("operations.actions.transfer"),
                    },
                    receive: {
                        action: "Transfer",
                        amount: row_operation.params?.amount || 0,
                        name: token_info.name,
                        token: token_info.token,
                        icon: tokenParam,
                        title:
                            status === "executed"
                                ? "TRANSFERRED"
                                : t("operations.actions.transfer"),
                    },
                };
            } else if (row_operation.operation === "ERROR") {
                return {
                    exchange: {
                        action: "Error",
                        amount: 0,
                        name: "",
                        token: (settings.tokens.CA as TokenConfig[])[caIndex],
                        icon: `CA_${caIndex}`,
                        title: "Revert",
                    },
                    receive: {
                        action: "Error",
                        amount: 0,
                        name: "",
                        token: (settings.tokens.CA as TokenConfig[])[caIndex],
                        icon: `CA_${caIndex}`,
                        title: "Revert",
                    },
                };
            } else {
                console.warn("CAN'T OPERATE: " + row_operation.operation);
                return undefined;
            }
        },
        [t, getTokenInfo]
    );
    const getErrorMessage = useCallback(
        (error: string | number | null | undefined): string => {
            switch (error) {
                case "qAC below minimum required":
                    return `${(settings.tokens.CA as TokenConfig[])[0]?.name || ""} ${t("operations.errors.qACBelow")} `;
                case "Insufficient qac sent":
                    return `${(settings.tokens.CA as TokenConfig[])[0]?.name || ""} ${t("operations.errors.insufficientQAC1")} ${(settings.tokens.CA as TokenConfig[])[0]?.name || ""} ${t("operations.errors.insufficientQAC2")}`;
                case "Low coverage":
                    return t("operations.errors.lowCoverage");
                case "Invalid Flux Capacitor Operation":
                    return t("operations.errors.fluxCapacitor");
                case "":
                    return t("operations.errors.noMessage");
                case " ":
                    return t("operations.errors.noMessage");
                case 0:
                    return t("operations.errors.noMessage");
                case "null":
                    return t("operations.errors.noMessage");
                default:
                    return String(error);
            }
        },
        [t]
    );
    const TruncatedAddress = useCallback((address: string, length = 6) => {
        if (!address) return "";

        return (
            address.substring(0, length + 2) +
            "…" +
            address.substring(address.length - length)
        );
    }, []);
    const getFee = useCallback(
        (row_operation: OperationData) => {
            const fee: {
                amount: bigint;
                token: string | null;
                decimals: number;
            } = { amount: 0n, token: null, decimals: 18 };
            const caIndex = row_operation["bucket_index"];

            if (
                row_operation["executed"] &&
                row_operation["executed"]["qFeeToken_"]
            ) {
                const qFeeToken = BigInt(
                    row_operation["executed"]["qFeeToken_"]
                );
                const qFeeTokenVendorMarkup = BigInt(
                    row_operation["executed"]["qFeeTokenVendorMarkup_"] || "0"
                );

                fee["amount"] = qFeeToken + qFeeTokenVendorMarkup;
                fee["token"] = "TF";
                fee["decimals"] = settings.tokens.TF[0].decimals;
            }

            if (
                row_operation["executed"] &&
                row_operation["executed"]["qACfee_"] &&
                fee["amount"] === 0n
            ) {
                const qACfee = BigInt(row_operation["executed"]["qACfee_"]);

                const qACVendorMarkup = BigInt(
                    row_operation["executed"]["qACVendorMarkup_"] || "0"
                );

                fee["amount"] = qACfee + qACVendorMarkup;
                fee["token"] = `CA_${caIndex}`;
                fee["decimals"] =
                    (settings.tokens.CA as TokenConfig[])[caIndex]?.decimals ||
                    18;
            }

            if (fee["amount"] > 0n) {
                return (
                    <div className="LastOp__expanded__fee">
                        {/* <span className="value"> */}
                        {PrecisionNumbers({
                            amount: fee["amount"],
                            token: TokenSettings(fee["token"] || ""),
                            decimals: 6,
                            i18n: i18n,
                        })}
                        {/* </span> */}
                        <span className="token">
                            {"  "}
                            {"  "}
                            {t(`exchange.tokens.${fee["token"]}.abbr`, {
                                ns: ns,
                            })}{" "}
                        </span>
                    </div>
                );
            } else {
                return "--";
            }
        },
        [i18n, t, ns]
    );
    const getTransferAction = useCallback(
        (row_operation: OperationData) => {
            if (
                row_operation.params?.sender?.toLowerCase() ===
                address?.toLowerCase()
            ) {
                return t("operations.actions.destination");
            } else {
                return t("operations.actions.origin");
            }
        },
        [t, address]
    );
    const getTransferAddress = useCallback(
        (row_operation: OperationData) => {
            if (
                row_operation.params?.sender?.toLowerCase() ===
                address?.toLowerCase()
            ) {
                // return truncateAddress(row_operation['params']['recipient'].toLowerCase())
                return row_operation.params?.recipient?.toLowerCase() || "";
            } else {
                //return truncateAddress(row_operation['params']['sender'].toLowerCase())
                return row_operation.params?.sender?.toLowerCase() || "";
            }
        },
        [address]
    );
    const getStatus = useCallback(
        (row_operation: OperationData) => {
            const confirmedBlocks = BigInt(10);
            switch (row_operation["status"]) {
                case -4:
                    return t("operations.actions.statusFailed");
                case -3:
                    return t("operations.actions.statusFailed");
                case -2:
                    return t("operations.actions.statusFailed");
                case -1:
                    return t("operations.actions.statusFailed");
                case 0:
                    if (
                        row_operation["params"] &&
                        BigInt(blockNumber || 0) <
                            BigInt(
                                row_operation["params"]["blockNumber"] || 0
                            ) +
                                confirmedBlocks
                    )
                        return t("operations.actions.statusQueuing");
                    else return t("operations.actions.statusQueued");
                case 1:
                    if (
                        row_operation["executed"] &&
                        BigInt(blockNumber || 0) <
                            BigInt(
                                row_operation["executed"]["blockNumber"] || 0
                            ) +
                                confirmedBlocks
                    )
                        return t("operations.actions.statusConfirming");
                    else if (
                        row_operation["operation"] === "Transfer" &&
                        BigInt(blockNumber || 0) <
                            BigInt(row_operation["blockNumber"] || 0) +
                                confirmedBlocks
                    )
                        return t("operations.actions.statusConfirming");
                    else return t("operations.actions.statusConfirmed");
                default:
                    return t("operations.actions.statusFailed");
            }
        },
        [t, blockNumber]
    );
    const setStatusIcon = useCallback(
        (status: string) => {
            switch (status) {
                case t("operations.actions.statusQueuing"):
                    return "QUEUING";
                case t("operations.actions.statusQueued"):
                    return "QUEUED";
                case t("operations.actions.statusConfirming"):
                    return "CONFIRMING";
                case t("operations.actions.statusConfirmed"):
                    return "CONFIRMED";
                case t("operations.actions.statusFailed"):
                    return "FAILED";
                default:
                    return "FAILED";
            }
        },
        [t]
    );
    const getAsset = useCallback((name: string) => {
        switch (name) {
            case "CA_0":
                return {
                    image: <div className="icon-token-ca_0 icon-token-modif" />,
                    color: "color-token-tp",
                    txt: "CA",
                };
            case "CA_1":
                return {
                    image: <div className="icon-token-ca_1 icon-token-modif" />,
                    color: "color-token-tp",
                    txt: "CA",
                };
            case "TC_0":
                return {
                    image: <div className="icon-token-tc_0 icon-token-modif" />,
                    color: "color-token-tc",
                    txt: "TC",
                };
            case "TC_1":
                return {
                    image: <div className="icon-token-tc_1 icon-token-modif" />,
                    color: "color-token-tc",
                    txt: "TC",
                };
            case "TP_0":
                return {
                    image: <div className="icon-token-tp_0 icon-token-modif" />,
                    color: "color-token-tc",
                    txt: "TP",
                };
            case "TP_1":
                return {
                    image: <div className="icon-token-tp_1 icon-token-modif" />,
                    color: "color-token-tc",
                    txt: "TP",
                };
            case "FeeToken":
                return {
                    image: <div className="icon-token-tf icon-token-modif" />,
                    color: "color-token-tf",
                    txt: "TF",
                };
            default:
                console.warn("UNRECOGNIZED TOKEN: " + name);
                return {
                    image: (
                        <div
                            className="icon-token-MOC"
                            style={{ display: "block", margin: "auto" }}
                        />
                    ),
                    color: "color-token-tp",
                    txt: "TP",
                };
        }
    }, []);
    // Memoize the processed table data to avoid recalculating on every render
    const processedData = useMemo(() => {
        /*******************************sort descending by block number and then by operID***********************************/
        // Create a copy to avoid mutating the original array
        let sortedOperations: OperationData[] = [];
        if (dataJson.operations !== undefined) {
            sortedOperations = [...dataJson.operations].sort((a, b) => {
                if (a.blockNumber !== b.blockNumber) {
                    return (b.blockNumber || 0) - (a.blockNumber || 0);
                }
                if (a.operId_ !== null && b.operId_ !== null) {
                    return b.operId_ - a.operId_;
                }
                if (a.operId_ === null) {
                    return 1;
                }
                if (b.operId_ === null) {
                    return -1;
                }
                return 0;
            });
        }
        /*******************************filter by type (token)***********************************/
        const pre_datas: OperationData[] = sortedOperations.filter((data_j) => {
            return token !== "all" ? data_j.tokenInvolved === token : true;
        });

        const received_row: TableRowData[] = [];
        pre_datas.forEach((data) => {
            const token = tokenExchange(data);
            if (!token) return;

            const detail = {
                event: data["operation"],
                oper_id: data["operId_"],
                exchange: token.exchange,
                receive: token.receive,
                created: (
                    <span>
                        <Moment
                            format={
                                i18n.language === "en"
                                    ? date.DATE_EN
                                    : date.DATE_ES
                            }
                        >
                            {data["createdAt"]}
                        </Moment>
                    </span>
                ),
                confirmation: data["confirmationTime"] ? (
                    <span>
                        <Moment
                            format={
                                i18n.language === "en"
                                    ? date.DATE_EN
                                    : date.DATE_ES
                            }
                        >
                            {data["confirmationTime"]}
                        </Moment>
                    </span>
                ) : (
                    "--"
                ),
                recipient:
                    data.params?.recipient !== "--" ? (
                        <Copy
                            textToShow={TruncatedAddress(
                                data.params?.recipient || ""
                            )}
                            textToCopy={data.params?.recipient || ""}
                        />
                    ) : (
                        "--"
                    ),
                block: data["blockNumber"] || "--",
                tx_hash_truncate: TruncatedAddress(data["hash"] || "") || "--",
                tx_hash: data["hash"] || "--",
                gas_fee: data["gas_fee"] || data["gasFeeRBTC"] || "--",
                gas: data["gas"] || "--",
                gas_price: data["gasPrice"] || "--",
                gas_used: data["gasUsed"] || "--",
                error_code: data["errorCode_"] || "--",
                msg:
                    getErrorMessage(data["msg_"]) ||
                    t("operations.errors.noMessage"),
                reason: data["reason_"] || "--",
                executed_tx_hash_truncate:
                    TruncatedAddress(data.params?.hash || "") || "--",
                executed_tx_hash: data.params?.hash || "--",
                status: getStatus(data) || "--",
                fee: getFee(data) || "--",
            };

            received_row.push({
                key: data._id,
                info: "",
                exchange: (
                    <>
                        {token.receive.action !== "Error" && (
                            <Fragment>
                                <div className="lastOp__detail__item">
                                    <div className="">
                                        <div className="lastOp__detail__label">
                                            {token.exchange.title}
                                        </div>
                                        <div className="table-amount">
                                            {(() => {
                                                const exchangeToken = token
                                                    .exchange
                                                    .token as TokenConfig;
                                                return (
                                                    <PrecisionNumbers
                                                        amount={BigInt(
                                                            token.exchange
                                                                .amount
                                                        )}
                                                        token={exchangeToken}
                                                        decimals={
                                                            exchangeToken.visibleDecimals ??
                                                            2
                                                        }
                                                        i18n={i18n}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="lastOp__detail__token__container">
                                        {getAsset(token.exchange.icon).image}
                                        <div className="lastOp__detail__token__ticker">
                                            {token.exchange.name}
                                        </div>
                                    </div>
                                </div>
                            </Fragment>
                        )}
                        {token.receive.action === "Error" && (
                            <Fragment>
                                <div>
                                    <div className="table-event-name">
                                        {token.exchange.title}
                                    </div>
                                    <div className="table-amount">--</div>
                                </div>
                                <div className="table-icon-name"></div>
                            </Fragment>
                        )}
                    </>
                ),
                receive: (
                    <>
                        {token.receive.action !== "Transfer" &&
                            token.receive.action !== "Error" && (
                                <Fragment>
                                    <div className="lastOp__detail__item">
                                        <div className="lastOpe_from_container">
                                            <div className="lastOp__detail__label">
                                                {token.receive.title}
                                            </div>
                                            <div className="lastOp__detail__amount">
                                                {(() => {
                                                    const receiveToken = token
                                                        .receive
                                                        .token as TokenConfig;
                                                    return PrecisionNumbers({
                                                        amount: BigInt(
                                                            token.receive.amount
                                                        ),
                                                        token: receiveToken,
                                                        decimals:
                                                            receiveToken.visibleDecimals ??
                                                            2,
                                                        i18n: i18n,
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                        <div className="lastOp__detail__token__container">
                                            {getAsset(token.receive.icon).image}
                                            <div className="lastOp__detail__token__ticker">
                                                {token.receive.name}
                                            </div>
                                        </div>
                                    </div>
                                </Fragment>
                            )}
                        {token.receive.action === "Transfer" && (
                            <Fragment>
                                <div className="lastOp__detail__item--double">
                                    <div className="lastOp__detail__transfer">
                                        <div className="lastOp__detail__label">
                                            {getTransferAction(data)}
                                        </div>
                                        <div className="lastOp__detail__address">
                                            {getTransferAddress(data)}
                                        </div>
                                    </div>
                                </div>
                            </Fragment>
                        )}
                        {token.receive.action === "Error" && (
                            <Fragment>
                                <div>
                                    <div className="lastOp__detail__label">
                                        {token.receive.title}
                                    </div>
                                    <br></br>
                                    <div className="table-amount"> -- </div>
                                </div>
                                <div className="table-icon-name"></div>
                            </Fragment>
                        )}
                    </>
                ),
                date: (
                    <div className="lastOp__date__container">
                        <div className="lastOp__detail__label">
                            {t("operations.columns.date")}
                        </div>
                        <div className="lastOp__detail__date">
                            {new Date(data["lastUpdatedAt"])
                                .toLocaleString("sv-SE", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                })
                                .replace(",", "")}
                        </div>
                    </div>
                ),
                status: (
                    <Fragment>
                        <div
                            className={`tx-status-icon-${setStatusIcon(getStatus(data))}`}
                        />
                        <div
                            className={`table-status-icon ${getStatus(data) === t("operations.actions.statusFailed") && "table-status-icon-red"}`}
                        >
                            {getStatus(data)}
                        </div>
                    </Fragment>
                ),
                detail: detail || "--",
                renderRow: <></>,
                description: <></>,
            } as TableRowData);
        });

        const data: TableRowData[] = [];
        received_row.forEach((element) => {
            data.push({
                renderRow: (
                    <div className="lastOp__row">
                        <div className="LastOp__expand-collapse">
                            <ExpandIcon
                                expanded={expandedKeys.includes(element.key)}
                                onClick={() =>
                                    handleExpand(
                                        !expandedKeys.includes(element.key),
                                        element
                                    )
                                }
                            />
                        </div>

                        <div className="LastOp__group__details">
                            <div className="LastOp__divider"></div>
                            <div className="LastOp__origin">
                                {element.exchange}
                            </div>
                            <div className="LastOp__divider"></div>
                            <div className="LastOp__destination">
                                {element.receive}
                            </div>
                        </div>
                        <div className="LastOp__group__dateStatus">
                            <div className="LastOp__divider"></div>
                            <div className="lastOp__date">{element.date}</div>
                            <div className="LastOp__divider"></div>
                            <div className="lastOp__status">
                                {element.status}
                            </div>
                        </div>
                    </div>
                ),
                key: element.key,
                info: "",
                description: (
                    <RowDetailMobile
                        detail={
                            element.detail as unknown as Parameters<
                                typeof RowDetailMobile
                            >[0]["detail"]
                        }
                    />
                ),
            } as TableRowData);
        });

        return data;
    }, [
        dataJson.operations,
        token,
        i18n,
        t,
        expandedKeys,
        getErrorMessage,
        getFee,
        getStatus,
        getTransferAction,
        getTransferAddress,
        handleExpand,
        setStatusIcon,
        tokenExchange,
        TruncatedAddress,
        getAsset,
    ]);

    const tableColumns = useMemo(
        () => (columns || []).map((item) => ({ ...item })),
        [columns]
    );
    /*useEffect(() => {
        setTimeout(() => setLoadingSke(false), timeSke);
    }, [auth]);*/
    const showModal = () => {
        setQueueModal(true);
    };
    const hideModal = () => {
        setQueueModal(false);
    };

    return (
        <>
            <div className="title layout-card-title">
                <h1 className="title-last-operations .layout-card-title">
                    {t(`operations.sectionTitle`, { ns: ns })}
                </h1>
                <div className="aboutQueue__button" onClick={showModal}>
                    {t(`operations.aboutQueue.button`, { ns: ns })}
                    <div className="logo-queue"></div>
                </div>
                {queueModal && (
                    <Modal
                        title={t("operations.aboutQueue.title", { ns: ns })}
                        width={505}
                        open={true}
                        onCancel={hideModal}
                        footer={null}
                        closable={false}
                        className="aboutQueue__modal ModalAccount "
                        centered={true}
                        maskStyle={{}}
                    >
                        <AboutQueue hideModal={hideModal} />
                    </Modal>
                )}
            </div>
            {ready || processedData.length > 0 ? (
                <>
                    <Table
                        className={
                            "vertical-middle custom-border-spacing-table custom-table"
                        }
                        showHeader={false}
                        expandable={{
                            expandedRowKeys: expandedKeys,
                            onExpand: handleExpand,
                            expandedRowRender: (record) => (
                                <div className="table-expanded-row">
                                    {record.description}
                                </div>
                            ),
                            expandIconColumnIndex: -1, // Hide default expansion icon cell
                        }}
                        pagination={{
                            pageSize: pageSize,
                            position: ["bottomRight"],
                            defaultCurrent: 1,
                            onChange: onChange,
                            total: totalTable,
                            pageSizeOptions: [10, 20, 50, 100],
                            showSizeChanger: true,
                            onShowSizeChange: (current, pageSize) => {
                                setPageSize(pageSize);
                            },
                            locale: {
                                items_per_page: t(
                                    "operations.table.itemsPerPage",
                                    { ns: ns }
                                ),
                            },
                        }}
                        columns={tableColumns}
                        dataSource={
                            isConnected == true ? processedData : undefined
                        }
                        scroll={{ y: lastOperationsHeight }}
                        style={{}}
                        loading={!ready && processedData.length === 0}
                    />
                </>
            ) : (
                <Skeleton active={true} paragraph={{ rows: 4 }}></Skeleton>
            )}
        </>
    );
}
