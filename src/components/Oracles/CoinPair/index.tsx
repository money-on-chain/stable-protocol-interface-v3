import "./Styles.scss";

import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useMemo, useState } from "react";
import { formatUnits } from "viem";

import { useWalletContext } from "../../../context/Wallet";
import { ConvertAmount } from "../../../helpers/currencies";
import { WAD, wadMul } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import type {
    CoinPairOracleInfo,
    CoinPairPriceStatus,
    CoinPairRoundInfo,
} from "../../../hooks/useCoinPairOracles";
import { useCoinPairOracles } from "../../../hooks/useCoinPairOracles";
import type { OracleCoinPairInfo } from "../../../hooks/useOracleCoinPairs";
import CardHeaderMetrics, {
    type CardHeaderMetric,
} from "../../CardHeaderMetrics";
import CopyAddress from "../../CopyAddress";
import InlineWarning from "../../InlineWarning";
import OperationStatusModal from "../../Modals/OperationStatusModal/OperationStatusModal";

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

// The oracle reward token distributed on round close (RoundManager.token) is
// the protocol's MOC token — same token wired as "TG" everywhere else in
// this dapp. moc-v1 exposes its USD price as a flat field; v3-style flavors
// (roc) derive it via ConvertAmount, same split TokenPriceStrip uses.
const IS_MOC_V1 =
    import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT === "moc-v1";

function formatDurationParts(totalSeconds: number): string {
    const safeSeconds = Math.max(0, totalSeconds);
    const days = Math.floor(safeSeconds / 86_400);
    const hours = Math.floor((safeSeconds % 86_400) / 3_600);
    const minutes = Math.floor((safeSeconds % 3_600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (days > 0 || hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(" ");
}

export default function CoinPair(): React.ReactElement {
    const { t } = useProjectTranslation();
    const {
        oracleCoinPairs,
        interfaceOracleSubscribeCoinPair,
        interfaceOracleUnsubscribeCoinPair,
        interfaceOracleSwitchRound,
        userOmocBalance,
        contractStatusOmoc,
        contractProtocolStatus,
        contractProtocolStatusV1,
        registeredOracles,
        publicClient,
    } = useWalletContext();

    const mocUsdPrice = IS_MOC_V1
        ? (contractProtocolStatusV1.data?.mocUsdPrice ?? 0n)
        : ConvertAmount(contractProtocolStatus, "TG", "USD", WAD, 0);

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
    const [switchingPair, setSwitchingPair] = useState<`0x${string}` | null>(
        null
    );
    const [exploringPair, setExploringPair] =
        useState<OracleCoinPairInfo | null>(null);

    const coinPairOracles = useCoinPairOracles(
        publicClient,
        exploringPair?.coinPairPriceAddress,
        registeredOracles.data
    );
    const sortedCoinPairOracles = useMemo(
        () =>
            [...coinPairOracles.data].sort((a, b) =>
                b.points > a.points ? 1 : b.points < a.points ? -1 : 0
            ),
        [coinPairOracles.data]
    );
    const [operationModalInfo, setOperationModalInfo] =
        useState<OperationModalInfo>({
            operationStatus: "",
            txHash: "",
        });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);
    const expiredPriceCount = oracleCoinPairs.data.filter(
        (pair) => !pair.priceIsValid
    ).length;

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

    // Mirrors RoundInfoLib.isReadyToSwitch on-chain: round 0 (never started)
    // is always switchable; otherwise the lock period must have elapsed.
    const canSwitchRound = (roundInfo: CoinPairRoundInfo | null): boolean => {
        if (!roundInfo) return false;
        if (roundInfo.round === 0n) return true;
        const now = BigInt(Math.floor(Date.now() / 1000));
        return roundInfo.lockPeriodTimestamp <= now;
    };

    const onSwitchRound = async (row: OracleCoinPairInfo): Promise<void> => {
        setSwitchingPair(row.pairRaw);
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
            console.error("Switch round error!...:", error);
            setOperationModalInfo((prev) => ({
                ...prev,
                operationStatus: "error",
            }));
        };

        await interfaceOracleSwitchRound(
            row.coinPairPriceAddress,
            onTransaction,
            onReceipt,
            onError
        )
            .then(() => {
                void coinPairOracles.refetch();
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
                setSwitchingPair(null);
            });
    };

    const columns: ColumnsType<OracleCoinPairInfo> = [
        {
            title: "",
            key: "explore",
            width: 44,
            render: (_value, row) => {
                const isExpanded = exploringPair?.pairRaw === row.pairRaw;

                return (
                    <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label={t("oracles.coinpair.table.exploreButton")}
                        className="coinPair__expandToggle"
                        onClick={() =>
                            setExploringPair(isExpanded ? null : row)
                        }
                        data-testid={`coinpair-explore-${row.pairName}`}
                    >
                        <span
                            className={`coinPair__expandIcon coinPair__expandIcon--${
                                isExpanded ? "collapse" : "expand"
                            }`}
                            aria-hidden="true"
                        />
                    </button>
                );
            },
        },
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
                        <span
                            className="coinPair__price--stale"
                            title={t("oracles.coinpair.table.priceStale")}
                        >
                            {t("oracles.coinpair.table.priceNotAvailable")}
                        </span>
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
                    <span
                        className="coinPair__actionHint"
                        title={disabledReason}
                    >
                        {button}
                    </span>
                ) : (
                    button
                );
            },
        },
    ];

    const coinPairOraclesColumns: ColumnsType<CoinPairOracleInfo> = [
        {
            title: "#",
            key: "rank",
            width: 40,
            render: (_value, _record, index) => index + 1,
        },
        {
            title: t("oracles.coinpair.explore.owner"),
            dataIndex: "owner",
            key: "owner",
            width: 160,
            render: (owner: string) => <CopyAddress address={owner} />,
        },
        {
            title: t("oracles.coinpair.explore.oracleAddress"),
            dataIndex: "oracleAddr",
            key: "oracleAddr",
            width: 160,
            render: (oracleAddr: string) => (
                <CopyAddress address={oracleAddr} />
            ),
        },
        {
            title: t("oracles.coinpair.explore.stake"),
            dataIndex: "stake",
            key: "stake",
            align: "right",
            width: 96,
            render: (stake: bigint) =>
                Number(formatUnits(stake, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                }),
        },
        {
            title: t("oracles.coinpair.explore.points"),
            dataIndex: "points",
            key: "points",
            align: "right",
            width: 72,
            render: (points: bigint) => points.toString(),
        },
        {
            title: t("oracles.coinpair.explore.inRound"),
            dataIndex: "selectedInCurrentRound",
            key: "selectedInCurrentRound",
            align: "center",
            width: 104,
            render: (selectedInCurrentRound: boolean) => (
                <span
                    className={`coinPair__detailTag coinPair__detailTag--${
                        selectedInCurrentRound ? "positive" : "negative"
                    }`}
                >
                    {selectedInCurrentRound
                        ? t("oracles.coinpair.explore.inRoundYes")
                        : t("oracles.coinpair.explore.inRoundNo")}
                </span>
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

                const tone =
                    missedSignatureRounds >= max
                        ? "negative"
                        : missedSignatureRounds > 0n
                          ? "warning"
                          : "positive";

                return (
                    <span
                        className={`coinPair__detailTag coinPair__detailTag--${tone}`}
                    >
                        {missedSignatureRounds.toString()} / {max.toString()}
                    </span>
                );
            },
        },
    ];

    const getRoundMetrics = (
        roundInfo: CoinPairRoundInfo | null
    ): CardHeaderMetric[] => {
        if (!roundInfo) {
            return [
                {
                    label: t("oracles.coinpair.explore.roundLabel"),
                    value: "…",
                },
                {
                    label: t("oracles.coinpair.explore.statusLabel"),
                    value: "…",
                },
            ];
        }

        const selectedMetric: CardHeaderMetric = {
            label: t("oracles.coinpair.explore.selectedLabel"),
            value: `${roundInfo.selectedCount} / ${roundInfo.maxOraclesPerRound.toString()}`,
        };
        const totalPointsMetric: CardHeaderMetric = {
            label: t("oracles.coinpair.explore.totalPointsLabel"),
            value: roundInfo.totalPoints.toString(),
        };

        if (roundInfo.round === 0n) {
            return [
                {
                    label: t("oracles.coinpair.explore.roundLabel"),
                    value: "0",
                },
                {
                    label: t("oracles.coinpair.explore.statusLabel"),
                    value: t("oracles.coinpair.explore.roundNotStartedValue"),
                },
                selectedMetric,
                totalPointsMetric,
            ];
        }

        const round = roundInfo.round.toString();
        const now = BigInt(Math.floor(Date.now() / 1000));
        if (roundInfo.lockPeriodTimestamp <= now) {
            return [
                {
                    label: t("oracles.coinpair.explore.roundLabel"),
                    value: round,
                },
                {
                    label: t("oracles.coinpair.explore.statusLabel"),
                    value: t("oracles.coinpair.explore.roundReadyValue"),
                },
                selectedMetric,
                totalPointsMetric,
            ];
        }

        const secondsLeft = Number(roundInfo.lockPeriodTimestamp - now);

        return [
            {
                label: t("oracles.coinpair.explore.roundLabel"),
                value: round,
            },
            {
                label: t("oracles.coinpair.explore.endsInLabel"),
                value: formatDurationParts(secondsLeft),
            },
            selectedMetric,
            totalPointsMetric,
        ];
    };

    const getAvailableRewardValue = (
        availableRewardFees: bigint,
        mocPriceUsd: bigint
    ): React.ReactNode => {
        const moc = Number(formatUnits(availableRewardFees, 18)).toLocaleString(
            undefined,
            { maximumFractionDigits: 4 }
        );

        if (mocPriceUsd <= 0n) {
            return (
                <span className="coinPair__rewardValue">
                    <span className="coinPair__rewardAmount">
                        <span className="coinPair__rewardNumber">{moc}</span>
                    </span>
                </span>
            );
        }

        const usd = Number(
            formatUnits(wadMul(availableRewardFees, mocPriceUsd), 18)
        ).toLocaleString(undefined, { maximumFractionDigits: 2 });

        return (
            <span className="coinPair__rewardValue">
                <span className="coinPair__rewardAmount">
                    <span className="coinPair__rewardNumber">{moc}</span>
                </span>
                <span className="coinPair__rewardUsd">≈ {usd} USD</span>
            </span>
        );
    };

    const getPriceMetrics = (
        priceStatus: CoinPairPriceStatus
    ): CardHeaderMetric[] => {
        const lastPublishedValue =
            priceStatus.lastPublishedAgoSeconds === null
                ? t("oracles.coinpair.explore.neverPublishedValue")
                : t("oracles.coinpair.explore.agoValue", {
                      time: formatDurationParts(
                          priceStatus.lastPublishedAgoSeconds
                      ),
                  });

        const expiresValue =
            priceStatus.expiresInSeconds === null
                ? t("oracles.coinpair.explore.neverPublishedValue")
                : priceStatus.expiresInSeconds >= 0
                  ? t("oracles.coinpair.explore.expiresInValue", {
                        time: formatDurationParts(priceStatus.expiresInSeconds),
                    })
                  : t("oracles.coinpair.explore.expiredAgoValue", {
                        time: formatDurationParts(
                            Math.abs(priceStatus.expiresInSeconds)
                        ),
                    });

        return [
            {
                label: t("oracles.coinpair.explore.lastPublishedLabel"),
                value: lastPublishedValue,
            },
            {
                label: t("oracles.coinpair.explore.expiresLabel"),
                value: expiresValue,
            },
        ];
    };

    return (
        <div className="layout-card coinPair">
            <div className="coinPair__header">
                <div className="layout-card-title">
                    <h1>{t("oracles.coinpair.cardTitle")}</h1>
                </div>
                <CardHeaderMetrics
                    items={[
                        {
                            label: t("oracles.coinpair.totalPairsLabel"),
                            value: oracleCoinPairs.data.length,
                        },
                        {
                            label: t("oracles.coinpair.expiredPricesLabel"),
                            value: expiredPriceCount,
                        },
                    ]}
                />
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
                rowClassName={(row) =>
                    exploringPair?.pairRaw === row.pairRaw
                        ? "coinPair__row--expanded"
                        : ""
                }
                scroll={{ x: 760 }}
                expandable={{
                    expandedRowKeys: exploringPair
                        ? [exploringPair.pairRaw]
                        : [],
                    expandedRowRender: (row) => {
                        const pair = t(
                            `oracles.coinpair.pairMask.${row.pairName}`,
                            { defaultValue: row.pairName }
                        );
                        const roundMetrics = getRoundMetrics(
                            coinPairOracles.roundInfo
                        );
                        const priceMetrics = getPriceMetrics(
                            coinPairOracles.priceStatus
                        );
                        const availableRewardMetric: CardHeaderMetric = {
                            label: t(
                                "oracles.coinpair.explore.availableRewardFeesLabel"
                            ),
                            value: getAvailableRewardValue(
                                coinPairOracles.availableRewardFees,
                                mocUsdPrice
                            ),
                        };

                        return (
                            <div className="coinPair__expanded">
                                <div
                                    className={`coinPair__expandedHeader ${
                                        roundMetrics.length < 4
                                            ? "coinPair__expandedHeader--compact"
                                            : ""
                                    }`}
                                >
                                    <div className="coinPair__expandedIdentity">
                                        <div className="coinPair__expandedLabel">
                                            {t(
                                                "oracles.coinpair.explore.subtitle"
                                            )}
                                        </div>
                                        <div className="coinPair__expandedTitle">
                                            {pair}
                                        </div>
                                    </div>
                                    {!coinPairOracles.isLoading && (
                                        <div className="coinPair__headlineMetric">
                                            <span
                                                className="coinPair__switchRoundHint"
                                                title={
                                                    canSwitchRound(
                                                        coinPairOracles.roundInfo
                                                    )
                                                        ? undefined
                                                        : t(
                                                              "oracles.coinpair.explore.switchRoundNotReady"
                                                          )
                                                }
                                            >
                                                <button
                                                    type="button"
                                                    className="button--compact button--compact--secondary coinPair__switchRoundButton"
                                                    disabled={
                                                        switchingPair ===
                                                            row.pairRaw ||
                                                        !canSwitchRound(
                                                            coinPairOracles.roundInfo
                                                        )
                                                    }
                                                    onClick={() =>
                                                        void onSwitchRound(row)
                                                    }
                                                    data-testid={`coinpair-switchround-${row.pairName}`}
                                                >
                                                    {t(
                                                        "oracles.coinpair.explore.switchRoundButton"
                                                    )}
                                                </button>
                                            </span>
                                            <CardHeaderMetrics
                                                items={roundMetrics.slice(0, 1)}
                                                size="primary"
                                            />
                                        </div>
                                    )}
                                </div>
                                {!coinPairOracles.isLoading && (
                                    <div
                                        className={`coinPair__metricsDashboard ${
                                            roundMetrics.length < 4
                                                ? "coinPair__metricsDashboard--compact"
                                                : ""
                                        }`}
                                    >
                                        <div className="coinPair__metricGroup coinPair__metricGroup--round">
                                            <CardHeaderMetrics
                                                items={roundMetrics.slice(1)}
                                                size="secondary"
                                            />
                                        </div>
                                        <div className="coinPair__metricGroup coinPair__metricGroup--price">
                                            <CardHeaderMetrics
                                                items={priceMetrics}
                                                size="secondary"
                                            />
                                        </div>
                                        <div className="coinPair__metricGroup coinPair__metricGroup--reward">
                                            <CardHeaderMetrics
                                                items={[availableRewardMetric]}
                                                size="secondary"
                                            />
                                        </div>
                                    </div>
                                )}
                                {coinPairOracles.isLoading ? (
                                    <div
                                        className="coinPair__detailLoading"
                                        role="status"
                                        aria-live="polite"
                                    >
                                        <span
                                            className="icon-tx-waiting coinPair__detailLoadingIcon"
                                            aria-hidden="true"
                                        />
                                        <div className="coinPair__detailLoadingBody">
                                            <div className="coinPair__detailLoadingText">
                                                {t(
                                                    "oracles.coinpair.explore.loadingDetails"
                                                )}
                                            </div>
                                            <div
                                                className="coinPair__detailSkeleton"
                                                aria-hidden="true"
                                            >
                                                <span />
                                                <span />
                                                <span />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Table<CoinPairOracleInfo>
                                        className="coinPair__oraclesTable"
                                        rowKey="owner"
                                        columns={coinPairOraclesColumns}
                                        dataSource={sortedCoinPairOracles}
                                        pagination={false}
                                        scroll={{ x: 560 }}
                                        locale={{
                                            emptyText: t(
                                                "oracles.coinpair.explore.empty"
                                            ),
                                        }}
                                    />
                                )}
                            </div>
                        );
                    },
                    expandIconColumnIndex: -1,
                }}
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
