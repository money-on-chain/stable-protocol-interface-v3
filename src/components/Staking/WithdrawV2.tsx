import "./WithdrawV2.scss";

import { Skeleton, Table } from "antd";
import moment from "moment-timezone";
import React, { useCallback, useEffect, useState } from "react";
import Moment from "react-moment";

import { useWalletContext } from "../../context/Wallet";
import date from "../../helpers/date";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings";
import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import StakingOptionsModal from "../Modals/StakingOptionsModal/index";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface PendingWithdrawalItem {
    id: bigint;
    amount: bigint;
    expiration: bigint;
    status: string;
}

interface WithdrawV2Props {
    userInfoStaking: {
        pendingWithdrawals: PendingWithdrawalItem[];
        totalPendingExpiration: bigint;
        totalAvailableToWithdraw: bigint;
        [key: string]: unknown;
    };
}

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

interface TableColumn {
    title: string;
    dataIndex: string;
    align?: "left" | "right" | "center";
    width?: number;
}

interface TableDataItem {
    key: number;
    rowContent: JSX.Element;
}

type ModalMode = "restake" | "withdraw" | null;

export default function WithdrawV2(props: WithdrawV2Props): JSX.Element {
    const { userInfoStaking } = props;
    const { t, i18n } = useProjectTranslation();
    const { contractStatusOmoc } = useWalletContext();
    const [totalTable, setTotalTable] = useState<number | null>(null);
    const [data, setData] = useState<TableDataItem[] | null>(null);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [withdrawalId, setWithdrawalId] = useState<string>("0");
    const [modalAmount, setModalAmount] = useState<bigint>(0n);
    const [operationModalInfo, setOperationModalInfo] =
        useState<OperationModalInfo>({
            operationStatus: "",
            txHash: "",
        });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);

    const columnsData: TableColumn[] = [];
    const ProvideColumnsTG: TableColumn[] = [
        { title: "Unique Cell", dataIndex: "rowContent" },
    ];

    const getWithdrawals = useCallback((): void => {
        setTotalTable(userInfoStaking["pendingWithdrawals"].length);
        const tokensData: TableDataItem[] = userInfoStaking[
            "pendingWithdrawals"
        ].map((withdrawal: PendingWithdrawalItem, index: number) => ({
            key: index,
            rowContent: (
                <div className="withdraw__row">
                    <div className="withdraw__first__column">
                        <div className="item-data withdraw__date">
                            <Moment
                                format={
                                    i18n.language === "en"
                                        ? date.DATE_EN
                                        : date.DATE_ES
                                }
                                date={moment.tz(
                                    Number(withdrawal.expiration) * 1000,
                                    moment.tz.guess()
                                )}
                            />
                        </div>
                        <div className="item-data withdraw__amount">
                            {PrecisionNumbers({
                                amount: withdrawal.amount,
                                token: settings.tokens.TG[0],
                                decimals: Number(t("staking.display_decimals")),
                                i18n: i18n,
                                compact: true,
                            })}
                        </div>{" "}
                        <div className="item-data withdraw__status">
                            {t(`staking.withdraw.status.${withdrawal.status}`)}
                        </div>
                    </div>

                    <div className="withdraw__cta">
                        <div
                            className={`cta__button restake action__container${withdrawal.status !== "PENDING" && withdrawal.status !== "AVAILABLE" ? " action__container--disabled" : ""}`}
                            onClick={() =>
                                handleActionClick("restake", withdrawal)
                            }
                        >
                            <span
                                className={`action__description${withdrawal.status !== "PENDING" && withdrawal.status !== "AVAILABLE" ? "--disabled" : ""}`}
                            >
                                {t("staking.withdraw.buttons.restake")}
                            </span>
                            {/* <div className="action__icon">
                                <Image
                                    src={ActionIcon}
                                    alt="Action"
                                    preview={false}
                                />
                            </div> */}
                        </div>
                        <div
                            className={`cta__button withdraw  action__container${withdrawal.status === "PENDING" ? " cta__button--disabled" : ""}`}
                            onClick={() =>
                                handleActionClick("withdraw", withdrawal)
                            }
                        >
                            <span
                                className={`action__description${withdrawal.status === "PENDING" ? "--disabled" : ""}`}
                            >
                                {t("staking.withdraw.buttons.withdraw")}
                            </span>
                            {/* <div className="action__icon">
                                <Image
                                    src={ActionIcon}
                                    alt="Action"
                                    preview={false}
                                />
                            </div> */}
                        </div>
                    </div>
                </div>
            ),
        }));
        setData(tokensData);
    }, [userInfoStaking, i18n, t]);

    useEffect(() => {
        if (contractStatusOmoc.data && userInfoStaking["pendingWithdrawals"]) {
            getWithdrawals();
        }
    }, [contractStatusOmoc.data, userInfoStaking, getWithdrawals]);

    // Columns
    (ProvideColumnsTG || []).forEach(function (dataItem: TableColumn) {
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

    const handleActionClick = (
        action: "restake" | "withdraw",
        withdrawal: PendingWithdrawalItem
    ): void => {
        // if (status !== 'PENDING' && status !== 'AVAILABLE' && action === 'restake') return;
        if (withdrawal.status === "PENDING" && action === "withdraw") return;
        if (action === "restake") {
            setModalMode("restake");
        } else {
            setModalMode("withdraw");
        }
        setWithdrawalId(withdrawal.id.toString());
        setModalAmount(withdrawal.amount);
    };

    return (
        <div
            id="stakingWithdrawCard"
            className="section__innerCard--big card-withdraw"
        >
            <div className="layout-card-title">
                <h1>{t("staking.withdraw.title")}</h1>
                <div className="withdraw-header-balance">
                    {userInfoStaking["totalPendingExpiration"] !==
                        undefined && (
                        <div className="withdraw-header-group">
                            <div className="withdraw-header-balance-number">
                                {PrecisionNumbers({
                                    amount: userInfoStaking[
                                        "totalPendingExpiration"
                                    ],
                                    token: settings.tokens.TG[0],
                                    decimals: Number(
                                        t("staking.display_decimals")
                                    ),
                                    i18n: i18n,
                                    compact: true,
                                })}{" "}
                                {`${settings.tokens.TG[0].name}`}
                            </div>
                            <div className="withdraw-header-balance-title">
                                {t("staking.withdraw.processing_unstake")}
                            </div>
                        </div>
                    )}
                    {userInfoStaking["totalAvailableToWithdraw"] !==
                        undefined && (
                        <div className="withdraw-header-group">
                            <div className="withdraw-header-balance-number">
                                {PrecisionNumbers({
                                    amount: userInfoStaking[
                                        "totalAvailableToWithdraw"
                                    ],
                                    token: settings.tokens.TG[0],
                                    decimals: Number(
                                        t("staking.display_decimals")
                                    ),
                                    i18n: i18n,
                                    compact: true,
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
                <>
                    <div className="withdraw__header ">
                        <div className="withdraw__first__column">
                            <div className="withdraw__date">
                                {t("staking.withdraw.table.expiration")}
                            </div>
                            <div className="withdraw__amount">
                                {t("staking.withdraw.table.amount")}
                            </div>{" "}
                            <div className="withdraw__status">
                                {t("staking.withdraw.table.status")}
                            </div>
                        </div>

                        <div className="withdraw__cta">
                            {t("staking.withdraw.table.actions")}
                        </div>
                    </div>
                    <div className="divider-horizontal"></div>
                    <Table
                        columns={columnsData}
                        dataSource={data}
                        pagination={{
                            pageSize: 1000,
                            position: ["bottomRight"],
                            defaultCurrent: 1,
                            total: totalTable || 0,
                        }}
                        showHeader={false}
                        scroll={{ y: "auto" }}
                    />
                </>
            ) : (
                <Skeleton active />
            )}
            {modalMode !== null && (
                <StakingOptionsModal
                    mode={modalMode}
                    visible={modalMode !== null}
                    onClose={() => setModalMode(null)}
                    withdrawalId={withdrawalId}
                    amount={modalAmount}
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
