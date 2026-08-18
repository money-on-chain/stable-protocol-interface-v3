import "../LiquidityMiningClaims/Styles.scss";
import "./Styles.scss";

import { DownCircleOutlined, UpCircleOutlined } from "@ant-design/icons";
import { Table } from "antd";
import React, { useState } from "react";
import Moment from "react-moment";

import { useWalletContext } from "../../../context/Wallet";
import { TokenSettings } from "../../../helpers/currencies";
import date from "../../../helpers/date";
import type { IncentiveClaimStatus } from "../../../helpers/incentives";
import { claimStatus, truncateHash } from "../../../helpers/incentives";
import { useProjectTranslation } from "../../../helpers/translations";
import { useIncentivesClaims } from "../../../hooks/useIncentives";
import { PrecisionNumbers } from "../../PrecisionNumbers";

const STATUS_LABEL_KEY: Record<IncentiveClaimStatus, string> = {
    sent: "liquidityMining.v1.status.sent",
    confirming: "liquidityMining.v1.status.confirming",
    processing: "liquidityMining.v1.status.processing",
    failed: "liquidityMining.v1.status.failed",
    unknown: "liquidityMining.claimsTable.statusInProgress",
};

interface TableRowData {
    key: string;
    renderRow: React.ReactNode;
    description: React.ReactNode;
}

const PAGE_SIZE = 10;

// v1 port of Tables/LiquidityMiningClaims — that component is a hardcoded
// mock ("THIS TABLE IS FOR EMULATING DATA ONLY"); this one is backed by the
// real GET {incentives}claims/{address} endpoint (see hooks/useIncentives).
export default function LiquidityMiningClaimsV1(): React.ReactElement {
    const { t, i18n } = useProjectTranslation();
    const { address } = useWalletContext();
    const [page, setPage] = useState<number>(1);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

    const { claims, hasNextPage, isLoading } = useIncentivesClaims(
        address,
        page,
        PAGE_SIZE
    );

    const explorerUrl = String(
        import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL || ""
    );

    const handleExpand = (
        expanded: boolean,
        record: Pick<TableRowData, "key">
    ): void =>
        setExpandedKeys((prev) =>
            expanded
                ? [...prev, record.key]
                : prev.filter((key) => key !== record.key)
        );

    const tableColumns = [
        {
            title: (
                <div className="liquidityMiningClaimsV1__row liquidityMiningClaimsV1__header">
                    <div
                        className="liquidityMiningClaimsV1__expand"
                        aria-hidden="true"
                    ></div>
                    <div className="liquidityMiningClaimsV1__date">
                        {t("liquidityMining.claimsTable.date")}
                    </div>
                    <div className="liquidityMiningClaimsV1__amount">
                        {t("liquidityMining.claimsTable.amount")}
                    </div>
                    <div className="liquidityMiningClaimsV1__event">
                        {t("liquidityMining.claimsTable.event")}
                    </div>
                    <div className="liquidityMiningClaimsV1__status">
                        {t("liquidityMining.claimsTable.status")}
                    </div>
                </div>
            ),
            dataIndex: "renderRow",
        },
    ];

    const tableData: TableRowData[] = claims.map((claim, index) => {
        const status = claimStatus(claim.state, claim.result);
        const key = `${claim.creationUnix}-${claim.hash ?? claim.sentHash ?? index}`;
        const formattedAmount = PrecisionNumbers({
            amount: claim.mocs,
            token: TokenSettings("TG"),
            decimals: 6,
            i18n,
            compact: true,
            useNoLimit: true,
        });

        return {
            key,
            renderRow: (
                <div className="liquidityMiningClaimsV1__row">
                    <div className="liquidityMiningClaimsV1__expand">
                        {expandedKeys.includes(key) ? (
                            <UpCircleOutlined
                                onClick={() => handleExpand(false, { key })}
                            />
                        ) : (
                            <DownCircleOutlined
                                onClick={() => handleExpand(true, { key })}
                            />
                        )}
                    </div>
                    <div className="liquidityMiningClaimsV1__date">
                        <Moment
                            unix
                            format={
                                i18n.language === "en"
                                    ? date.DATE_EN
                                    : date.DATE_ES
                            }
                        >
                            {claim.creationUnix}
                        </Moment>
                    </div>
                    <div className="liquidityMiningClaimsV1__amount">
                        {formattedAmount}
                    </div>
                    <div className="liquidityMiningClaimsV1__event">
                        {t("liquidityMining.v1.claimEvent")}
                    </div>
                    <div className="liquidityMiningClaimsV1__status">
                        {t(STATUS_LABEL_KEY[status])}
                    </div>
                </div>
            ),
            description: (
                <div className="claimDetailV1">
                    <div className="claimDetailV1__field">
                        <span className="claimDetailV1__label">
                            {t("liquidityMining.claimsTable.amount")}
                        </span>
                        <span className="claimDetailV1__value">
                            {formattedAmount}
                        </span>
                    </div>
                    <div className="claimDetailV1__field">
                        <span className="claimDetailV1__label">
                            {t("liquidityMining.v1.gasCost")}
                        </span>
                        <span className="claimDetailV1__value">
                            {PrecisionNumbers({
                                amount: claim.gasCost,
                                token: TokenSettings("CA_0"),
                                decimals: 6,
                                i18n,
                                compact: true,
                                useNoLimit: true,
                            })}
                        </span>
                    </div>
                    {claim.sentHash && (
                        <div className="claimDetailV1__field">
                            <span className="claimDetailV1__label">
                                {t("liquidityMining.v1.sentTx")}
                            </span>
                            {explorerUrl ? (
                                <a
                                    href={`${explorerUrl}/tx/${claim.sentHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {truncateHash(claim.sentHash)}
                                </a>
                            ) : (
                                <span className="claimDetailV1__value">
                                    {truncateHash(claim.sentHash)}
                                </span>
                            )}
                        </div>
                    )}
                    {claim.hash && (
                        <div className="claimDetailV1__field">
                            <span className="claimDetailV1__label">
                                {t("liquidityMining.v1.payoutTx")}
                            </span>
                            {explorerUrl ? (
                                <a
                                    href={`${explorerUrl}/tx/${claim.hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {truncateHash(claim.hash)}
                                </a>
                            ) : (
                                <span className="claimDetailV1__value">
                                    {truncateHash(claim.hash)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            ),
        };
    });

    // The backend doesn't return a reliable total count — approximate it
    // from whether this page came back full (see useIncentivesClaims).
    const approximateTotal = hasNextPage
        ? page * PAGE_SIZE + 1
        : (page - 1) * PAGE_SIZE + claims.length;

    return (
        <div className="layout-card">
            <div className="layout-card-title">
                <h1>{t("liquidityMining.cardTitle")}</h1>
            </div>
            <div className="liquidityMiningClaimsV1__viewport">
                <Table
                    className="liquidityMiningClaimsV1"
                    columns={tableColumns}
                    dataSource={tableData}
                    loading={isLoading}
                    showHeader
                    pagination={{
                        current: page,
                        pageSize: PAGE_SIZE,
                        total: approximateTotal,
                        onChange: setPage,
                    }}
                    expandable={{
                        expandedRowKeys: expandedKeys,
                        onExpand: handleExpand,
                        expandedRowRender: (record) => record.description,
                        expandIconColumnIndex: -1,
                    }}
                />
            </div>
        </div>
    );
}
