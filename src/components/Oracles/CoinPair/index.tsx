import "./Styles.scss";

import { Drawer, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useState } from "react";
import { formatUnits } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";
import type {
    CoinPairOracleInfo,
    CoinPairRoundInfo,
} from "../../../hooks/useCoinPairOracles";
import { useCoinPairOracles } from "../../../hooks/useCoinPairOracles";
import type { OracleCoinPairInfo } from "../../../hooks/useOracleCoinPairs";
import CopyAddress from "../../CopyAddress";
import InlineWarning from "../../InlineWarning";
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
        registeredOracles,
        publicClient,
    } = useWalletContext();

    const stakingInfo = userOmocBalance.data?.stakingmachine;
    const isOracleRegistered = stakingInfo?.isOracleRegistered ?? false;
    const isRegistrationKnown =
        typeof stakingInfo?.isOracleRegistered === "boolean";

    const currentStake = stakingInfo?.getBalance;
    const minCPSubscriptionStake =
        contractStatusOmoc.data?.oraclemanager?.getMinCPSubscriptionStake;
    const isStakeKnown =
        typeof currentStake === "bigint" &&
        typeof minCPSubscriptionStake === "bigint";
    const hasEnoughStake =
        !isStakeKnown || currentStake >= minCPSubscriptionStake;

    const [pendingPair, setPendingPair] = useState<`0x${string}` | null>(null);
    const [exploringPair, setExploringPair] =
        useState<OracleCoinPairInfo | null>(null);

    const coinPairOracles = useCoinPairOracles(
        publicClient,
        exploringPair?.coinPairPriceAddress,
        registeredOracles.data
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
            render: (pairName: string) =>
                t(`oracles.coinpair.pairMask.${pairName}`, {
                    defaultValue: pairName,
                }),
        },
        {
            title: t("oracles.coinpair.table.price"),
            dataIndex: "price",
            key: "price",
            render: (_value, row) => {
                if (!row.priceIsValid) {
                    return (
                        <Tooltip title={t("oracles.coinpair.table.priceStale")}>
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
            title: t("oracles.coinpair.table.capacity"),
            key: "capacity",
            render: (_value, row) => (
                <span>
                    {row.subscribedCount} / {row.maxSubscribedOracles}
                </span>
            ),
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
                const notRegistered =
                    isRegistrationKnown && !isOracleRegistered;
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
                    <button
                        type="button"
                        className={
                            row.isSubscribed
                                ? "button--compact button--compact--secondary"
                                : "button--compact"
                        }
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
                    </button>
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
        {
            title: t("oracles.coinpair.table.explore"),
            key: "explore",
            render: (_value, row) => (
                <button
                    type="button"
                    className="button--compact button--compact--secondary"
                    onClick={() => setExploringPair(row)}
                    data-testid={`coinpair-explore-${row.pairName}`}
                >
                    {t("oracles.coinpair.table.exploreButton")}
                </button>
            ),
        },
    ];

    const explorePairName = exploringPair
        ? t(`oracles.coinpair.pairMask.${exploringPair.pairName}`, {
              defaultValue: exploringPair.pairName,
          })
        : "";

    const coinPairOraclesColumns: ColumnsType<CoinPairOracleInfo> = [
        {
            title: t("oracles.coinpair.explore.owner"),
            dataIndex: "owner",
            key: "owner",
            render: (owner: string) => <CopyAddress address={owner} />,
        },
        {
            title: t("oracles.coinpair.explore.oracleAddress"),
            dataIndex: "oracleAddr",
            key: "oracleAddr",
            render: (oracleAddr: string) => (
                <CopyAddress address={oracleAddr} />
            ),
        },
        {
            title: t("oracles.coinpair.explore.points"),
            dataIndex: "points",
            key: "points",
            render: (points: bigint) => points.toString(),
        },
        {
            title: t("oracles.coinpair.explore.inRound"),
            dataIndex: "selectedInCurrentRound",
            key: "selectedInCurrentRound",
            render: (selectedInCurrentRound: boolean) => (
                <Tag color={selectedInCurrentRound ? "success" : "default"}>
                    {selectedInCurrentRound
                        ? t("oracles.coinpair.explore.inRoundYes")
                        : t("oracles.coinpair.explore.inRoundNo")}
                </Tag>
            ),
        },
        {
            title: t("oracles.coinpair.explore.missedRounds"),
            dataIndex: "missedSignatureRounds",
            key: "missedSignatureRounds",
            render: (missedSignatureRounds: bigint) => {
                const max = coinPairOracles.maxMissedSigRounds;
                if (max === 0n) {
                    return (
                        <span className="coinPair__missedRounds--disabled">
                            {t(
                                "oracles.coinpair.explore.autoUnsubscribeDisabled"
                            )}
                        </span>
                    );
                }

                const color =
                    missedSignatureRounds >= max
                        ? "error"
                        : missedSignatureRounds > 0n
                          ? "warning"
                          : "success";

                return (
                    <Tag color={color}>
                        {missedSignatureRounds.toString()} / {max.toString()}
                    </Tag>
                );
            },
        },
    ];

    const formatRoundStatus = (roundInfo: CoinPairRoundInfo | null): string => {
        if (!roundInfo) return "";
        if (roundInfo.round === 0n) {
            return t("oracles.coinpair.explore.roundNotStarted");
        }

        const round = roundInfo.round.toString();
        const now = BigInt(Math.floor(Date.now() / 1000));
        if (roundInfo.lockPeriodTimestamp <= now) {
            return t("oracles.coinpair.explore.roundReadyToSwitch", { round });
        }

        const secondsLeft = Number(roundInfo.lockPeriodTimestamp - now);
        const days = Math.floor(secondsLeft / 86_400);
        const hours = Math.floor((secondsLeft % 86_400) / 3_600);
        const minutes = Math.floor((secondsLeft % 3_600) / 60);
        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (days > 0 || hours > 0) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);

        return t("oracles.coinpair.explore.roundEndsIn", {
            round,
            time: parts.join(" "),
        });
    };

    return (
        <div className="layout-card coinPair">
            <div className="layout-card-title">
                <h1>{t("oracles.coinpair.cardTitle")}</h1>
            </div>
            {isRegistrationKnown && !isOracleRegistered && (
                <InlineWarning className="coinPair__warning">
                    {t("oracles.coinpair.notRegisteredWarning")}
                </InlineWarning>
            )}
            {isRegistrationKnown &&
                isOracleRegistered &&
                isStakeKnown &&
                !hasEnoughStake && (
                    <InlineWarning className="coinPair__warning">
                        {t("oracles.coinpair.insufficientStakeWarning", {
                            minStake: formatUnits(
                                minCPSubscriptionStake ?? 0n,
                                18
                            ),
                        })}
                    </InlineWarning>
                )}
            <Table<OracleCoinPairInfo>
                className="coinPair__subscriptionsTable"
                rowKey="pairRaw"
                columns={columns}
                dataSource={oracleCoinPairs.data}
                loading={oracleCoinPairs.isLoading}
                pagination={false}
                scroll={{ x: 760 }}
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
            <Drawer
                className="coinPair__exploreDrawer"
                title={t("oracles.coinpair.explore.title", {
                    pair: explorePairName,
                })}
                placement="right"
                width={640}
                open={!!exploringPair}
                onClose={() => setExploringPair(null)}
            >
                <div className="coinPair__roundStatus">
                    {formatRoundStatus(coinPairOracles.roundInfo)}
                </div>
                <Table<CoinPairOracleInfo>
                    rowKey="owner"
                    columns={coinPairOraclesColumns}
                    dataSource={coinPairOracles.data}
                    loading={coinPairOracles.isLoading}
                    pagination={false}
                    locale={{ emptyText: t("oracles.coinpair.explore.empty") }}
                />
            </Drawer>
        </div>
    );
}
