import "../LastOperations/Styles.scss";

import { DownCircleOutlined, UpCircleOutlined } from "@ant-design/icons";
import { Modal, Skeleton, Table } from "antd";
import React, { useCallback, useMemo, useState } from "react";
import Moment from "react-moment";

import { useWalletContext } from "../../../context/Wallet";
import date from "../../../helpers/date";
import {
    getAssetV1,
    parseOperationV1,
    roundToVisibleDecimalsV1,
    statusIconV1,
    statusLabelKeyV1,
    truncateAddressV1,
} from "../../../helpers/operationsV1";
import { useProjectTranslation } from "../../../helpers/translations";
import { useOperationsV1 } from "../../../hooks/useOperationsV1";
import settings from "../../../settings";
import type { TokenConfig } from "../../../types/hooks";
import AboutQueue from "../../Modals/AboutQueue";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import RowDetailMobile from "../RowDetailMobile";

interface ListOperationsV1Props {
    token: string;
}

interface TableRowData {
    key: string;
    renderRow: React.ReactNode;
    description: React.ReactNode;
}

const PAGE_SIZE = 10;

// v1 port of the old dapp's ListOperations, rendered with v3's LastOperations
// UI (row layout, expand/collapse, status icons, About Queue modal) instead
// of the old antd-Progress-bar table look. Data comes from moc-v1's legacy
// `webapp/transactions/list/` endpoint (see hooks/useOperationsV1) — a much
// simpler event set than v3's caIndex-shaped operations (mint/redeem BPro or
// DOC, plus plain transfers).
export default function ListOperationsV1(
    props: ListOperationsV1Props
): React.ReactElement {
    const { token } = props;
    const { t, i18n, ns } = useProjectTranslation();
    const { isConnected } = useWalletContext();

    const [current, setCurrent] = useState(1);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [queueModal, setQueueModal] = useState(false);

    const { operations, total, ready } = useOperationsV1(
        token,
        current,
        PAGE_SIZE
    );

    const explorerUrl = String(
        import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL || ""
    );

    const handleExpand = useCallback(
        (expanded: boolean, record: { key: string }) => {
            setExpandedKeys((prevKeys) =>
                expanded
                    ? [...prevKeys, record.key]
                    : prevKeys.filter((key) => key !== record.key)
            );
        },
        []
    );

    const ExpandIcon: React.FC<{ expanded: boolean; onClick: () => void }> = ({
        expanded,
        onClick,
    }) => (
        <div onClick={onClick} style={{ cursor: "pointer" }}>
            {expanded ? <UpCircleOutlined /> : <DownCircleOutlined />}
        </div>
    );

    const renderSide = (
        side: { amount: bigint; token: TokenConfig | undefined; tokenId: string },
        title: string
    ) => {
        const { iconClass } = getAssetV1(side.tokenId);
        return (
            <div className="lastOp__detail__item">
                <div className="">
                    <div className="lastOp__detail__label">{title}</div>
                    <div className="table-amount">
                        {side.token ? (
                            <PrecisionNumbers
                                amount={roundToVisibleDecimalsV1(
                                    side.amount,
                                    side.token.decimals,
                                    side.token.visibleDecimals ?? 2
                                )}
                                token={side.token}
                                decimals={side.token.visibleDecimals ?? 2}
                                i18n={i18n}
                                compact={false}
                            />
                        ) : (
                            "--"
                        )}
                    </div>
                </div>
                <div className="lastOp__detail__token__container">
                    <div className={`${iconClass} icon-token-modif`} />
                    <div className="lastOp__detail__token__ticker">
                        {side.token?.name ?? side.tokenId}
                    </div>
                </div>
            </div>
        );
    };

    const processedData = useMemo<TableRowData[]>(() => {
        const rows: TableRowData[] = [];

        operations.forEach((raw) => {
            const parsed = parseOperationV1(raw);
            if (!parsed) return;

            const statusKey = statusLabelKeyV1(
                parsed.statusRaw,
                parsed.confirmingPercent
            );
            const confirmed = statusKey === "operations.actions.statusConfirmed";
            const exchangeTitle = t(
                confirmed
                    ? "operations.actions.exchanged"
                    : "operations.actions.exchanging"
            );
            const receiveTitle = t(
                confirmed
                    ? "operations.actions.received"
                    : "operations.actions.receiving"
            );

            const created = (
                <span>
                    <Moment
                        unix
                        format={
                            i18n.language === "en" ? date.DATE_EN : date.DATE_ES
                        }
                    >
                        {parsed.createdAtUnix}
                    </Moment>
                </span>
            );
            const confirmation = parsed.confirmationUnix ? (
                <span>
                    <Moment
                        unix
                        format={
                            i18n.language === "en" ? date.DATE_EN : date.DATE_ES
                        }
                    >
                        {parsed.confirmationUnix}
                    </Moment>
                </span>
            ) : (
                "--"
            );

            const txLink =
                parsed.txHash && explorerUrl
                    ? `${explorerUrl}/tx/${parsed.txHash}`
                    : undefined;

            const detail = {
                // Coarse bucket label (MINT/REDEEM/TRANSFER), matching the
                // old dapp's own set_event granularity — no per-token label
                // exists in locale for this, and the token pair is already
                // visible in the row itself.
                event: parsed.kind.toUpperCase(),
                created,
                gas_used: "--",
                oper_id: null,
                confirmation,
                recipient: parsed.address,
                recipient_truncate: parsed.address || "--",
                status: t(statusKey),
                error_code: "--",
                block: parsed.blockNumber,
                executed_tx_hash: "--",
                executed_tx_hash_truncate: "--",
                fee: parsed.fee ? (
                    <div className="LastOp__expanded__fee">
                        <PrecisionNumbers
                            amount={parsed.fee.amount}
                            token={parsed.fee.token}
                            decimals={parsed.fee.token.visibleDecimals ?? 6}
                            i18n={i18n}
                            compact={true}
                        />
                        <span className="token">
                            {"  "}
                            {t(`exchange.tokens.${parsed.fee.tokenId}.abbr`, {
                                ns,
                            })}
                        </span>
                    </div>
                ) : (
                    "--"
                ),
                tx_hash: parsed.txHash || "--",
                tx_hash_truncate: truncateAddressV1(parsed.txHash) || "--",
                msg: "--",
                reason: "--",
                price:
                    parsed.reservePriceUSD > 0n
                        ? {
                              value: parsed.reservePriceUSD,
                              currency: "USD",
                              token: settings.tokens.CA[0],
                          }
                        : null,
                price_another_token: null,
            };

            rows.push({
                key: parsed.key,
                renderRow: (
                    <div className="lastOp__row">
                        <div className="LastOp__expand-collapse">
                            <ExpandIcon
                                expanded={expandedKeys.includes(parsed.key)}
                                onClick={() =>
                                    handleExpand(
                                        !expandedKeys.includes(parsed.key),
                                        { key: parsed.key }
                                    )
                                }
                            />
                        </div>
                        <div
                            className={`LastOp__group__details LastOp__group__details--v1-wide-destination ${
                                parsed.kind === "transfer" ||
                                parsed.kind === "failed"
                                    ? "LastOp__group__details--one-two-merged"
                                    : "LastOp__group__details--single-single"
                            }`}
                        >
                            <div className="LastOp__divider LastOp__divider--details-start"></div>
                            {parsed.kind === "failed" ? (
                                <div className="LastOp__origin">
                                    <div className="lastOp__detail__item--double">
                                        <div className="lastOp__detail__transfer">
                                            <div className="lastOp__detail__label">
                                                {t(
                                                    "operations.actions.transactionFailed"
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="LastOp__origin">
                                        {renderSide(
                                            parsed.exchange,
                                            exchangeTitle
                                        )}
                                    </div>
                                    <div className="LastOp__divider LastOp__divider--details-middle"></div>
                                    <div className="LastOp__destination">
                                        {parsed.kind === "transfer" ? (
                                            <div className="lastOp__detail__item--double">
                                                <div className="lastOp__detail__transfer">
                                                    <div className="lastOp__detail__label">
                                                        {t(
                                                            "operations.actions.transfer"
                                                        )}
                                                    </div>
                                                    <div className="lastOp__detail__address">
                                                        {parsed.address ||
                                                            "--"}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            renderSide(
                                                parsed.receive,
                                                receiveTitle
                                            )
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="LastOp__group__dateStatus">
                            <div className="LastOp__divider"></div>
                            <div className="lastOp__date">
                                <span>{created}</span>
                            </div>
                            <div className="LastOp__divider"></div>
                            <div className="lastOp__status">
                                <div
                                    className={`tx-status-icon-${statusIconV1(statusKey)}`}
                                />
                                <div
                                    className={`table-status-icon ${
                                        statusKey ===
                                            "operations.actions.statusFailed" &&
                                        "table-status-icon-red"
                                    }`}
                                >
                                    {t(statusKey)}
                                </div>
                            </div>
                        </div>
                    </div>
                ),
                description: (
                    <RowDetailMobile
                        detail={
                            detail as unknown as Parameters<
                                typeof RowDetailMobile
                            >[0]["detail"]
                        }
                    />
                ),
            });
        });

        return rows;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operations, expandedKeys, i18n, t, explorerUrl, handleExpand]);

    const tableColumns = [{ dataIndex: "renderRow" }];

    const showModal = (): void => setQueueModal(true);
    const hideModal = (): void => setQueueModal(false);

    return (
        <>
            <div className="title layout-card-title">
                <h1 className="title-last-operations .layout-card-title">
                    {t("operations.sectionTitle", { ns })}
                </h1>
                <div className="aboutQueue__button" onClick={showModal}>
                    {t("operations.aboutQueue.button", { ns })}
                    <div className="logo-queue"></div>
                </div>
                {queueModal && (
                    <Modal
                        title={t("operations.aboutQueue.title", { ns })}
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
                <Table
                    className="vertical-middle custom-border-spacing-table custom-table"
                    showHeader={false}
                    expandable={{
                        expandedRowKeys: expandedKeys,
                        onExpand: handleExpand,
                        expandedRowRender: (record) => (
                            <div className="table-expanded-row">
                                {record.description}
                            </div>
                        ),
                        expandIconColumnIndex: -1,
                    }}
                    pagination={{
                        pageSize: PAGE_SIZE,
                        position: ["bottomRight"],
                        defaultCurrent: 1,
                        onChange: setCurrent,
                        total,
                        showSizeChanger: false,
                    }}
                    columns={tableColumns}
                    dataSource={isConnected ? processedData : undefined}
                    scroll={{ y: "auto" }}
                    loading={!ready && processedData.length === 0}
                />
            ) : (
                <Skeleton active={true} paragraph={{ rows: 4 }}></Skeleton>
            )}
        </>
    );
}
