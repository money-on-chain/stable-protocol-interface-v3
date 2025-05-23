import React, { Fragment, useContext, useEffect, useState } from "react";
import { DownCircleOutlined, UpCircleOutlined } from "@ant-design/icons";
import { Table, Skeleton, Modal } from "antd";
import Moment from "react-moment";
import BigNumber from "bignumber.js";
import PropTypes from "prop-types";

import RowDetailMobile from "../RowDetailMobile";
import api from "../../../services/api";
import Copy from "../../Copy";
import date from "../../../helpers/date";
import { AuthenticateContext } from "../../../context/Auth";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import { fromContractPrecisionDecimals } from "../../../helpers/Formats";
import { TokenSettings } from "../../../helpers/currencies";
import AboutQueue from "../../Modals/AboutQueue";
import "./Styles.scss";

export default function LastOperations(props) {
    const { token } = props;
    const [current, setCurrent] = useState(1);
    const { t, i18n, ns } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const [ready, setReady] = useState(false);
    /*useEffect(() => {
        if (auth.contractStatusData) {
            setReady(true);
        }
    }, [auth]);*/

    const { accountData = {} } = auth;
    const [dataJson, setDataJson] = useState([]);
    const [totalTable, setTotalTable] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    //const [loadingSke, setLoadingSke] = useState(true);
    const [queueModal, setQueueModal] = useState(false);
    const lastOperationsHeight = getComputedStyle(
        document.querySelector(":root")
    )
        .getPropertyValue("--lastOperationsHeight")
        .split('"')
        .join("");
    /*const timeSke = 1500;*/
    var data = [];
    const received_row = [];
    var txList = [];
    const transactionsList = (/*skip*/) => {
        if (auth.isLoggedIn) {
            console.log("Loading table…");
            /*const datas = {
                address: accountData.Owner,
                limit: 10,
                skip: (skip - 1 + (skip - 1)) * 10,
            };*/
            setTimeout(() => {
                const baseUrl = `${import.meta.env.REACT_APP_ENVIRONMENT_API_OPERATIONS}operations/list/`;
                const queryParams = new URLSearchParams({
                    recipient: accountData.Owner,
                    limit: 1000,
                    skip: 0,
                }).toString();
                const url = `${baseUrl}?${queryParams}`;

                api("get", url)
                    .then((response) => {
                        setDataJson(response);
                        setTotalTable(response.total);
                        setReady(true);
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }, 500);
        }
    };
    // #section Operation detail custom expand function
    const [expandedKeys, setExpandedKeys] = useState([]);

    // Expansion / Contraction
    const handleExpand = (expanded, record) => {
        const newExpandedKeys = expanded
            ? [...expandedKeys, record.key]
            : expandedKeys.filter((key) => key !== record.key);
        setExpandedKeys(newExpandedKeys);
    };

    // Expansion Icon
    const ExpandIcon = ({ expanded, onClick }) => (
        <div onClick={onClick} style={{ cursor: "pointer" }}>
            {expanded ? <UpCircleOutlined /> : <DownCircleOutlined />}
        </div>
    );

    ExpandIcon.propTypes = {
        expanded: PropTypes.bool,
        onClick: PropTypes.func,
    };

    // #endsection Operation detail custom expand function

    const columns = [
        {
            dataIndex: "renderRow",
            // width: 200,
            hidden: false,
        },
    ].filter((item) => !item.hidden);
    useEffect(() => {
        const interval = setInterval(() => {
            transactionsList(current);
        }, 3000);
        return () => clearInterval(interval);
    }, [accountData.Owner]);
    useEffect(() => {
        transactionsList(current);
    }, [accountData.Owner]);
    const onChange = (page) => {
        if (accountData !== undefined) {
            setCurrent(page);
            data_row(page);
            transactionsList(page, true);
        }
    };

    function tokenExchange(row_operation) {
        let status = "";
        if (row_operation["executed"]) {
            status = "executed";
        } else if (row_operation["params"]) {
            status = "params";
        }

        const caIndex = row_operation["bucket_index"]

        if (!status) {
            return {
                exchange: {
                    amount: 0,
                    name: "",
                    token: settings.tokens.CA[caIndex],
                    icon: `CA_${caIndex}`,
                    title: t("operations.actions.exchanged"),
                },
                receive: {
                    amount: 0,
                    name: "",
                    token: settings.tokens.CA[caIndex],
                    icon: `CA_${caIndex}`,
                    title: t("operations.actions.received"),
                },
            };
        }

        if (row_operation["operation"] === "TCMint") {
            return {
                exchange: {
                    action: "TCMint",
                    amount:
                        status === "executed"
                            ? row_operation[status]["qAC_"]
                            : row_operation[status]["qACmax"],
                    name: settings.tokens.CA[caIndex].name,
                    token: settings.tokens.CA[caIndex],
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
                            ? row_operation[status]["qTC_"]
                            : row_operation[status]["qTC"],
                    name: settings.tokens.TC[caIndex].name,
                    token: settings.tokens.TC[caIndex],
                    icon: `TC_${caIndex}`,
                    title:
                        status === "executed"
                            ? t("operations.actions.received")
                            : t("operations.actions.receiving"),
                },
            };
        } else if (row_operation["operation"] === "TCRedeem") {
            return {
                exchange: {
                    action: "TCRedeem",
                    amount:
                        status === "executed"
                            ? row_operation[status]["qTC_"]
                            : row_operation[status]["qTC"],
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
                            ? row_operation[status]["qAC_"]
                            : row_operation[status]["qACmin"],
                    name: settings.tokens.CA[caIndex].name,
                    token: settings.tokens.CA[caIndex],
                    icon: `CA_${caIndex}`,
                    title:
                        status === "executed"
                            ? t("operations.actions.received")
                            : t("operations.actions.receiving"),
                },
            };
        } else if (row_operation["operation"] === "TPMint") {
            let tp_index = row_operation[status]["tpIndex_"];
            if (tp_index === undefined) tp_index = 0;

            return {
                exchange: {
                    action: "TPMint",
                    amount:
                        status === "executed"
                            ? row_operation[status]["qAC_"]
                            : row_operation[status]["qACmax"],
                    name: settings.tokens.CA[caIndex].name,
                    token: settings.tokens.CA[caIndex],
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
                            ? row_operation[status]["qTP_"]
                            : row_operation[status]["qTP"],
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
            let tp_index = row_operation[status]["tpIndex_"];
            if (tp_index === undefined) tp_index = 0;

            return {
                exchange: {
                    action: "TPRedeem",
                    amount:
                        status === "executed"
                            ? row_operation[status]["qTP_"]
                            : row_operation[status]["qTP"],
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
                            ? row_operation[status]["qAC_"]
                            : row_operation[status]["qACmin"],
                    name: settings.tokens.CA[caIndex].name,
                    token: settings.tokens.CA[caIndex],
                    icon: `CA_${caIndex}`,
                    title:
                        status === "executed"
                            ? t("operations.actions.received")
                            : t("operations.actions.receiving"),
                },
            };
        } else if (row_operation["operation"] === "Transfer") {
            let token = row_operation["params"]["token"];
            const token_info = getTokenInfo(token);
            return {
                exchange: {
                    action: "Transfer",
                    amount: row_operation["params"]["amount"],
                    name: token_info.name,
                    token: token_info.token,
                    icon: row_operation["params"]["token"],
                    title:
                        status === "executed"
                            ? "TRANSFERRED"
                            : t("operations.actions.transfer"),
                },
                receive: {
                    action: "Transfer",
                    amount: row_operation["params"]["amount"],
                    name: token_info.name,
                    token: token_info.token,
                    icon: row_operation["params"]["token"],
                    title:
                        status === "executed"
                            ? "TRANSFERRED"
                            : t("operations.actions.transfer"),
                },
            };
        } else if (row_operation["operation"] === "ERROR") {
            return {
                exchange: {
                    action: "Error",
                    amount: 0,
                    name: "",
                    token: settings.tokens.CA[caIndex],
                    icon: `CA_${caIndex}`,
                    title: "Revert",
                },
                receive: {
                    action: "Error",
                    amount: 0,
                    name: "",
                    token: settings.tokens.CA[caIndex],
                    icon: `CA_${caIndex}`,
                    title: "Revert",
                },
            };
        } else {
            console.log("CAN'T OPERATE: " + row_operation.operation);
        }
    }
    const getErrorMessage = (error) => {
        switch (error) {
            case "qAC below minimum required":
                return `${settings.tokens.CA[0].name} ${t("operations.errors.qACBelow")} `;
            case "Insufficient qac sent":
                return `${settings.tokens.CA[0].name} ${t("operations.errors.insufficientQAC1")} ${settings.tokens.CA[0].name} ${t("operations.errors.insufficientQAC2")}`;
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
                return error;
        }
    };
    const data_row = () => {
        /*******************************sort descending by block number and then by operID***********************************/
        if (dataJson.operations !== undefined) {
            dataJson.operations.sort((a, b) => {
                if (a.blockNumber !== b.blockNumber) {
                    return b.blockNumber - a.blockNumber;
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
        var pre_datas = [];
        if (dataJson.operations !== undefined) {
            pre_datas = dataJson.operations.filter((data_j) => {
                return token !== "all" ? data_j.tokenInvolved === token : true;
            });
        }
        txList = pre_datas;
        data = [];
        txList.forEach((data) => {
            const token = tokenExchange(data);

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
                    data["params"]["recipient"] !== "--" ? (
                        <Copy
                            textToShow={TruncatedAddress(
                                data["params"]["recipient"]
                            )}
                            textToCopy={data["params"]["recipient"]}
                        />
                    ) : (
                        "--"
                    ),
                block: data["blockNumber"] || "--",
                tx_hash_truncate: TruncatedAddress(data["hash"]) || "--",
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
                    TruncatedAddress(data["params"]["hash"]) || "--",
                executed_tx_hash: data["params"]["hash"] || "--",
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
                                            {PrecisionNumbers({
                                                amount: token.exchange.amount,
                                                token:
                                                    token.exchange.token[0] ??
                                                    token.exchange.token,
                                                decimals:
                                                    token.exchange.token
                                                        .visibleDecimals ?? 2,
                                                t: t,
                                                i18n: i18n,
                                                ns: ns,
                                            })}{" "}
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
                                                {PrecisionNumbers({
                                                    amount: token.receive
                                                        .amount,
                                                    token: token.receive.token,
                                                    decimals:
                                                        token.receive.token
                                                            .visibleDecimals ??
                                                        2,
                                                    t: t,
                                                    i18n: i18n,
                                                    ns: ns,
                                                })}
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
            });
        });

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
                description: <RowDetailMobile detail={element.detail} />,
            });
        });
    };

    data_row(current);
    const tableColumns = columns.map((item) => ({ ...item }));
    /*useEffect(() => {
        setTimeout(() => setLoadingSke(false), timeSke);
    }, [auth]);*/
    function TruncatedAddress(address, length = 6) {
        if (!address) return "";

        return (
            address.substring(0, length + 2) +
            "…" +
            address.substring(address.length - length)
        );
    }
    function getFee(row_operation) {
        const fee = { amount: new BigNumber(0), token: null, decimals: 18 };
        const caIndex = row_operation["bucket_index"]

        if (
            row_operation["executed"] &&
            row_operation["executed"]["qFeeToken_"]
        ) {
            const qFeeToken = new BigNumber(
                fromContractPrecisionDecimals(
                    row_operation["executed"]["qFeeToken_"],
                    settings.tokens.TF[0].decimals
                )
            );

            const qFeeTokenVendorMarkup = new BigNumber(
                fromContractPrecisionDecimals(
                    row_operation["executed"]["qFeeTokenVendorMarkup_"],
                    settings.tokens.TF[0].decimals
                )
            );

            fee["amount"] = qFeeToken.plus(qFeeTokenVendorMarkup);
            fee["token"] = "TF";
            fee["decimals"] = settings.tokens.TF[0].decimals;
        }

        if (
            row_operation["executed"] &&
            row_operation["executed"]["qACfee_"] &&
            fee["amount"].eq(0)
        ) {
            const qACfee = new BigNumber(
                fromContractPrecisionDecimals(
                    row_operation["executed"]["qACfee_"],
                    settings.tokens.CA[caIndex].decimals
                )
            );

            const qACVendorMarkup = new BigNumber(
                fromContractPrecisionDecimals(
                    row_operation["executed"]["qACVendorMarkup_"],
                    settings.tokens.CA[caIndex].decimals
                )
            );

            fee["amount"] = qACfee.plus(qACVendorMarkup);
            fee["token"] = `CA_${caIndex}`;
            fee["decimals"] = settings.tokens.CA[caIndex].decimals;
        }

        if (fee["amount"].gt(0)) {
            return (
                <div className="LastOp__expanded__fee">
                    {/* <span className="value"> */}
                    {PrecisionNumbers({
                        amount: new BigNumber(fee["amount"]),
                        token: TokenSettings(fee["token"]),
                        decimals: 6,
                        t: t,
                        i18n: i18n,
                        ns: ns,
                        skipContractConvert: true,
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
    }
    function getTransferAction(row_operation) {
        if (
            row_operation["params"]["sender"].toLowerCase() ===
            accountData.Owner.toLowerCase()
        ) {
            return t("operations.actions.destination");
        } else {
            return t("operations.actions.origin");
        }
    }
    /*
    function truncateAddress(address) {
        if (address === "") return "";
        return (
            address.substring(0, 6) +
            "..." +
            address.substring(address.length - 4, address.length)
        );
    }*/
    function getTransferAddress(row_operation) {
        if (
            row_operation["params"]["sender"].toLowerCase() ===
            accountData.Owner.toLowerCase()
        ) {
            // return truncateAddress(row_operation['params']['recipient'].toLowerCase())
            return row_operation["params"]["recipient"].toLowerCase();
        } else {
            //return truncateAddress(row_operation['params']['sender'].toLowerCase())
            return row_operation["params"]["sender"].toLowerCase();
        }
    }
    function getStatus(row_operation) {
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
                    auth.contractStatusData &&
                    BigInt(auth.contractStatusData.blockHeight) <
                        BigInt(row_operation["params"]["blockNumber"]) +
                            confirmedBlocks
                )
                    return t("operations.actions.statusQueuing");
                else return t("operations.actions.statusQueued");
            case 1:
                if (
                    row_operation["executed"] &&
                    auth.contractStatusData &&
                    BigInt(auth.contractStatusData.blockHeight) <
                        BigInt(row_operation["executed"]["blockNumber"]) +
                            confirmedBlocks
                )
                    return t("operations.actions.statusConfirming");
                else if (
                    row_operation["operation"] === "Transfer" &&
                    auth.contractStatusData &&
                    BigInt(auth.contractStatusData.blockHeight) <
                        BigInt(row_operation["blockNumber"]) + confirmedBlocks
                )
                    return t("operations.actions.statusConfirming");
                else return t("operations.actions.statusConfirmed");
        }
    }
    function getTokenInfo(token) {
        switch (token) {
            case "CA_0":
                return {
                    name: settings.tokens.CA[0].name,
                    token: settings.tokens.CA[0],
                };
            case "CA_1":
                return {
                    name: settings.tokens.CA[1].name,
                    token: settings.tokens.CA[1],
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
                    token: settings.tokens.TP,
                };
            case "TP_1":
                return {
                    name: settings.tokens.TP[1].name,
                    token: settings.tokens.TP,
                };
            default:
                console.log("UNRECOGNIZED TOKEN: " + token);
        }
    }

    function setStatusIcon(status) {
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
        }
    }

    function getAsset(name) {
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
            default:
                console.log("UNRECOGNIZED TOKEN: " + name);
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
    }
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
            {ready ? (
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
                            position: ["none", "bottomRight"],
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
                        dataSource={auth.isLoggedIn == true ? data : null}
                        scroll={{ y: lastOperationsHeight }}
                        style={{}}
                    />
                </>
            ) : (
                <Skeleton active={true} paragraph={{ rows: 4 }}></Skeleton>
            )}
        </>
    );
}

LastOperations.propTypes = {
    token: PropTypes.string,
    /*expanded: PropTypes.bool,
    onClick: PropTypes.func,*/
};
