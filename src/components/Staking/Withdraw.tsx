import React, { useContext, useState, useEffect } from "react";
import { Image, Skeleton, Table } from "antd";
import Moment from "react-moment";
import moment from "moment-timezone";
import PropTypes from "prop-types";

import date from "../../helpers/date";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import settings from "../../settings/settings.json";
import ActionIcon from "../../assets/icons/Action.svg";
import StakingOptionsModal from "../Modals/StakingOptionsModal/index";
import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import { useWalletContext } from "../../context/Wallet";
import { toBigIntPrecision } from "../../helpers/precision";

interface WithdrawProps {
    userInfoStaking: {
        pendingWithdrawals: WithdrawalItem[];
        totalPendingExpiration: any;
        totalAvailableToWithdraw: any;
        [key: string]: any;
    };
}

interface WithdrawalItem {
    id: number;
    expiration: number;
    amount: any;
    status: string;
}

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

interface TableColumn {
    title: string;
    dataIndex: string;
    align: "left" | "right" | "center";
    width: number;
}

interface TableDataItem {
    key: number;
    expiration: JSX.Element;
    amount: JSX.Element;
    status: JSX.Element;
    available_actions: JSX.Element;
}

type ModalMode = "restake" | "withdraw" | null;

export default function Withdraw(props: WithdrawProps): JSX.Element {
    const { userInfoStaking } = props;
    const { t, i18n } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext()
    const [totalTable, setTotalTable] = useState<number | null>(null);
    const [data, setData] = useState<TableDataItem[] | null>(null);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [withdrawalId, setWithdrawalId] = useState<string>("0");
    const [modalAmount, setModalAmount] = useState<string>("0");
    const [operationModalInfo, setOperationModalInfo] = useState<OperationModalInfo>({
        operationStatus: "",
        txHash: ""
    });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);

    const columnsData: TableColumn[] = [];
    const ProvideColumnsTG: TableColumn[] = [
        {
            title: t("staking.withdraw.table.expiration"),
            dataIndex: "expiration",
            align: "left",
            width: 120,
        },
        {
            title: t("staking.withdraw.table.amount"),
            dataIndex: "amount",
            align: "right",
            width: 100,
        },
        {
            title: t("staking.withdraw.table.status"),
            dataIndex: "status",
            align: "right",
            width: 140,
        },
        {
            title: t("staking.withdraw.table.actions"),
            dataIndex: "available_actions",
            align: "right",
            width: 160,
        },
    ];
    
    useEffect(() => {
        if (contractProtocolStatus.data && userInfoStaking["pendingWithdrawals"]) {
            getWithdrawals();
        }
    }, [contractProtocolStatus.data, userInfoStaking["pendingWithdrawals"], i18n.language]);

    const getWithdrawals = (): void => {
        setTotalTable(userInfoStaking["pendingWithdrawals"].length);
        const tokensData: TableDataItem[] = userInfoStaking["pendingWithdrawals"].map(
            (withdrawal: WithdrawalItem, index: number) => ({
                key: index,
                expiration: (
                    <div className="item-data">
                        <Moment
                            format={
                                i18n.language === "en"
                                    ? date.DATE_EN
                                    : date.DATE_ES
                            }
                            date={moment.tz(
                                parseInt(withdrawal.expiration.toString()) * 1000,
                                moment.tz.guess()
                            )}
                        />
                    </div>
                ),
                amount: (
                    <div className="item-data">
                        {PrecisionNumbers({
                            amount: withdrawal.amount,
                            token: settings.tokens.TG[0],
                            decimals: Number(t("staking.display_decimals")),
                            i18n: i18n,
                        })}
                    </div>
                ),
                status: (
                    <div className="item-data">
                        {t(`staking.withdraw.status.${withdrawal.status}`)}
                    </div>
                ),
                available_actions: (
                    <div className="group-container">
                        <div
                            className={`action__container${withdrawal.status !== "PENDING" && withdrawal.status !== "AVAILABLE" ? " action__container--disabled" : ""}`}
                            onClick={() =>
                                handleActionClick("restake", withdrawal)
                            }
                        >
                            <span
                                className={`action__description${withdrawal.status !== "PENDING" && withdrawal.status !== "AVAILABLE" ? "--disabled" : ""}`}
                            >
                                {t("staking.withdraw.buttons.restake")}
                            </span>
                            <div className="action__icon">
                                <Image
                                    src={ActionIcon}
                                    alt="Action"
                                    preview={false}
                                />
                            </div>
                        </div>
                        <div
                            className={`action__container${withdrawal.status === "PENDING" ? " action__container--disabled" : ""}`}
                            onClick={() =>
                                handleActionClick("withdraw", withdrawal)
                            }
                        >
                            <span
                                className={`action__description${withdrawal.status === "PENDING" ? "--disabled" : ""}`}
                            >
                                {t("staking.withdraw.buttons.withdraw")}
                            </span>
                            <div className="action__icon">
                                <Image
                                    src={ActionIcon}
                                    alt="Action"
                                    preview={false}
                                />
                            </div>
                        </div>
                    </div>
                ),
            })
        );
        setData(tokensData);
    };

    // Columns
    ProvideColumnsTG.forEach(function (dataItem: TableColumn) {
        columnsData.push({
            title: dataItem.title,
            dataIndex: dataItem.dataIndex,
            align: dataItem.align,
            width: dataItem.width,
        });
    });

    const onConfirm = (operationStatus: string, txHash: string): void => {
        const operationInfo: OperationModalInfo = {
            operationStatus,
            txHash,
        };

        setOperationModalInfo(operationInfo);
        setIsOperationModalVisible(true);

        if (operationStatus === "success") {
            // Update the withdrawal list
            getWithdrawals();
        }
    };

    const handleActionClick = (action: "restake" | "withdraw", withdrawal: WithdrawalItem): void => {
        // if (status !== 'PENDING' && status !== 'AVAILABLE' && action === 'restake') return;
        if (withdrawal.status === "PENDING" && action === "withdraw") return;
        if (action === "restake") {
            setModalMode("restake");
        } else {
            setModalMode("withdraw");
        }
        setWithdrawalId(withdrawal.id.toString());
        setModalAmount(withdrawal.amount.toString());
    };

    return (
        <div className="section__innerCard--big card-withdraw">
            <div className="layout-card-title">
                <h1>{t("staking.withdraw.title")}</h1>
                <div className="withdraw-header-balance">
                    {userInfoStaking["totalPendingExpiration"] && (
                        <div className="withdraw-header-group">
                            <div className="withdraw-header-balance-number">
                                {PrecisionNumbers({
                                    amount: userInfoStaking[
                                        "totalPendingExpiration"
                                    ],
                                    token: settings.tokens.TG[0],
                                    decimals: Number(t("staking.display_decimals")),
                                    i18n: i18n,
                                })}{" "}
                                {`${settings.tokens.TG[0].name}`}
                            </div>
                            <div className="withdraw-header-balance-title">
                                {t("staking.withdraw.processing_unstake")}
                            </div>
                        </div>
                    )}
                    {userInfoStaking["totalAvailableToWithdraw"] && (
                        <div className="withdraw-header-group">
                            <div className="withdraw-header-balance-number">
                                {PrecisionNumbers({
                                    amount: userInfoStaking[
                                        "totalAvailableToWithdraw"
                                    ],
                                    token: settings.tokens.TG[0],
                                    decimals: Number(t("staking.display_decimals")),
                                    i18n: i18n,
                                })}{" "}
                                {`${settings.tokens.TG[0].name}`}
                            </div>
                            <div className="withdraw-header-balance-title">
                                {t("staking.withdraw.ready_to_withdraw")}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {data ? (
                <Table
                    columns={columnsData}
                    dataSource={data}
                    pagination={{
                        pageSize: 1000,
                        position: ["bottomRight"],
                        defaultCurrent: 1,
                        total: totalTable || 0,
                    }}
                    scroll={{ y: 200 }}
                />
            ) : (
                <Skeleton active />
            )}
            {modalMode !== null && (
                <StakingOptionsModal
                    mode={modalMode}
                    visible={modalMode !== null}
                    onClose={() => setModalMode(null)}
                    withdrawalId={withdrawalId}
                    amount={toBigIntPrecision(modalAmount)}
                    onConfirm={onConfirm}
                />
            )}
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

Withdraw.propTypes = {
    userInfoStaking: PropTypes.object,
};
