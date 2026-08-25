import "./Styles.scss";

import { Alert, Button, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useState } from "react";
import { formatUnits } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";
import type { OracleCoinPairInfo } from "../../../hooks/useOracleCoinPairs";
import OperationStatusModal from "../../Modals/OperationStatusModal/OperationStatusModal";

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

export default function CoinPair(): React.ReactElement {
    const { t } = useProjectTranslation();
    const {
        oracleCoinPairs,
        interfaceOracleSubscribeCoinPair,
        interfaceOracleUnsubscribeCoinPair,
        userOmocBalance,
        contractStatusOmoc,
    } = useWalletContext();

    const stakingInfo = userOmocBalance.data?.stakingmachine;
    const isOracleRegistered = stakingInfo?.isOracleRegistered ?? false;
    const isRegistrationKnown = typeof stakingInfo?.isOracleRegistered === "boolean";

    const currentStake = stakingInfo?.getBalance;
    const minCPSubscriptionStake =
        contractStatusOmoc.data?.oraclemanager?.getMinCPSubscriptionStake;
    const isStakeKnown =
        typeof currentStake === "bigint" &&
        typeof minCPSubscriptionStake === "bigint";
    const hasEnoughStake =
        !isStakeKnown || currentStake >= minCPSubscriptionStake;

    const [pendingPair, setPendingPair] = useState<`0x${string}` | null>(
        null
    );
    const [operationModalInfo, setOperationModalInfo] =
        useState<OperationModalInfo>({
            operationStatus: "",
            txHash: "",
        });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);

    const onToggleSubscription = async (
        row: OracleCoinPairInfo
    ): Promise<void> => {
        setPendingPair(row.pairRaw);
        setOperationModalInfo({ operationStatus: "sign", txHash: "" });
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            setOperationModalInfo({ operationStatus: "pending", txHash });
        };
        const onReceipt = (): void => {
            setOperationModalInfo((prev) => ({
                ...prev,
                operationStatus: "success",
            }));
        };
        const onError = (error: unknown): void => {
            console.error("Coin pair subscription error!...:", error);
            setOperationModalInfo((prev) => ({
                ...prev,
                operationStatus: "error",
            }));
        };

        const action = row.isSubscribed
            ? interfaceOracleUnsubscribeCoinPair
            : interfaceOracleSubscribeCoinPair;

        await action(row.pairRaw, onTransaction, onReceipt, onError)
            .then(() => {
                void oracleCoinPairs.refetch();
            })
            .catch((error) => {
                console.error(error);
                setOperationModalInfo((prev) => ({
                    ...prev,
                    operationStatus: "error",
                }));
            })
            .finally(() => {
                setPendingPair(null);
            });
    };

    const columns: ColumnsType<OracleCoinPairInfo> = [
        {
            title: t("oracles.coinpair.table.pair"),
            dataIndex: "pairName",
            key: "pairName",
        },
        {
            title: t("oracles.coinpair.table.price"),
            dataIndex: "price",
            key: "price",
            render: (_value, row) => {
                if (!row.priceIsValid) {
                    return (
                        <Tooltip
                            title={t("oracles.coinpair.table.priceStale")}
                        >
                            <span className="coinPair__price--stale">
                                {t("oracles.coinpair.table.priceNotAvailable")}
                            </span>
                        </Tooltip>
                    );
                }

                const formattedPrice = Number(
                    formatUnits(row.price, 18)
                ).toLocaleString(undefined, { maximumFractionDigits: 4 });

                return <span>{formattedPrice}</span>;
            },
        },
        {
            title: t("oracles.coinpair.table.status"),
            dataIndex: "isSubscribed",
            key: "isSubscribed",
            render: (isSubscribed: boolean) => (
                <span
                    className={
                        isSubscribed
                            ? "coinPair__status coinPair__status--subscribed"
                            : "coinPair__status coinPair__status--notSubscribed"
                    }
                >
                    {isSubscribed
                        ? t("oracles.coinpair.table.subscribed")
                        : t("oracles.coinpair.table.notSubscribed")}
                </span>
            ),
        },
        {
            title: t("oracles.coinpair.table.action"),
            key: "action",
            render: (_value, row) => {
                const notRegistered = isRegistrationKnown && !isOracleRegistered;
                const insufficientStake = !row.isSubscribed && !hasEnoughStake;
                const disabledReason = notRegistered
                    ? t("oracles.coinpair.notRegisteredWarning")
                    : insufficientStake
                      ? t("oracles.coinpair.insufficientStakeWarning", {
                            minStake: formatUnits(
                                minCPSubscriptionStake ?? 0n,
                                18
                            ),
                        })
                      : null;

                const button = (
                    <Button
                        type="primary"
                        className="button"
                        disabled={
                            pendingPair === row.pairRaw ||
                            notRegistered ||
                            insufficientStake
                        }
                        onClick={() => void onToggleSubscription(row)}
                        data-testid={`coinpair-toggle-${row.pairName}`}
                    >
                        {row.isSubscribed
                            ? t("oracles.coinpair.table.unsubscribeButton")
                            : t("oracles.coinpair.table.subscribeButton")}
                    </Button>
                );

                return disabledReason ? (
                    <Tooltip title={disabledReason}>
                        <span>{button}</span>
                    </Tooltip>
                ) : (
                    button
                );
            },
        },
    ];

    return (
        <div className="layout-card coinPair">
            <div className="layout-card-title">
                <h1>{t("oracles.coinpair.cardTitle")}</h1>
            </div>
            {isRegistrationKnown && !isOracleRegistered && (
                <Alert
                    className="coinPair__warning"
                    type="warning"
                    showIcon
                    message={t("oracles.coinpair.notRegisteredWarning")}
                />
            )}
            {isRegistrationKnown &&
                isOracleRegistered &&
                isStakeKnown &&
                !hasEnoughStake && (
                    <Alert
                        className="coinPair__warning"
                        type="warning"
                        showIcon
                        message={t(
                            "oracles.coinpair.insufficientStakeWarning",
                            {
                                minStake: formatUnits(
                                    minCPSubscriptionStake ?? 0n,
                                    18
                                ),
                            }
                        )}
                    />
                )}
            <Table<OracleCoinPairInfo>
                rowKey="pairRaw"
                columns={columns}
                dataSource={oracleCoinPairs.data}
                loading={oracleCoinPairs.isLoading}
                pagination={false}
                locale={{ emptyText: t("oracles.coinpair.table.empty") }}
            />
            {isOperationModalVisible && (
                <OperationStatusModal
                    visible={isOperationModalVisible}
                    onCancel={() => setIsOperationModalVisible(false)}
                    operationStatus={operationModalInfo.operationStatus}
                    txHash={operationModalInfo.txHash}
                    title={t("oracles.coinpair.modalTitle")}
                />
            )}
        </div>
    );
}
