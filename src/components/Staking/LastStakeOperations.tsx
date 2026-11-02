import "./LastStakeOperations.scss";

import React from "react";

import { useWalletContext } from "../../context/Wallet";
import type {
    StakingActivity,
    StakingActivityType,
} from "../../helpers/stakingActivity";
import { useProjectTranslation } from "../../helpers/translations";
import { useStakingActivity } from "../../hooks/useStakingActivity";
import settings from "../../settings";
import { PrecisionNumbers } from "../PrecisionNumbers";
import DataTable from "../Tables/DataTable";

type StatusKind =
    | "confirmed"
    | "pending"
    | "available"
    | "withdrawn"
    | "restaked";

function truncateHash(hash: string): string {
    return hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : "--";
}

export default function LastStakeOperations(): React.ReactElement {
    const { i18n, t } = useProjectTranslation();
    const { address, isConnected, vestingAddress } = useWalletContext();
    // Vesting holders stake through their vesting contract, so that's the
    // address the staking events are emitted for.
    const stakerAddress = isConnected ? (vestingAddress ?? address) : undefined;
    const { activity, isError, isLoading } = useStakingActivity(stakerAddress);
    const explorerUrl = String(
        import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL || ""
    ).replace(/\/$/, "");
    const token = settings.tokens.TG[0];

    const formatDate = (timestamp: string): string =>
        new Intl.DateTimeFormat(i18n.language, {
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(timestamp));

    const renderType = (type: StakingActivityType): React.ReactNode => (
        <span className="staking-activity__operation">
            {t(`staking.history.types.${type}`)}
        </span>
    );

    const renderAmount = (operation: StakingActivity): React.ReactNode => (
        <span className="staking-activity__amount">
            {PrecisionNumbers({
                amount: operation.amount,
                token: token,
                decimals: Number(t("staking.display_decimals")),
                i18n: i18n,
                compact: true,
            })}{" "}
            {token.name}
        </span>
    );

    const renderStatus = (operation: StakingActivity): React.ReactNode => {
        const kind: StatusKind = operation.unstakeState ?? "confirmed";
        return (
            <span
                className={`staking-activity__status staking-activity__status--${kind}`}
            >
                {kind === "pending" && operation.unlockTimestamp
                    ? t("staking.history.status.pending", {
                          date: formatDate(operation.unlockTimestamp),
                      })
                    : t(`staking.history.status.${kind}`)}
            </span>
        );
    };

    const renderTransaction = (operation: StakingActivity): React.ReactNode => {
        const content = (
            <>
                <span>{truncateHash(operation.transactionHash)}</span>
                <span className="icon-external-link" aria-hidden="true" />
            </>
        );

        return explorerUrl ? (
            <a
                className="staking-activity__transaction"
                href={`${explorerUrl}/tx/${operation.transactionHash}`}
                rel="noreferrer"
                target="_blank"
            >
                {content}
            </a>
        ) : (
            <span className="staking-activity__transaction">{content}</span>
        );
    };

    const emptyText = isError
        ? t("staking.history.error")
        : t("staking.history.empty");

    return (
        <section
            id="stakingActivityCard"
            className="layout-card staking-activity"
            data-testid="staking-activity"
        >
            <div className="layout-card-title">
                <h1>{t("staking.history.title")}</h1>
                <p>{t("staking.history.description")}</p>
            </div>

            <DataTable
                preserveHeight
                items={activity}
                search={{
                    label: t("common.dataTable.search"),
                    placeholder: t("common.dataTable.searchTransaction"),
                    fields: ["transactionHash"],
                }}
                filters={[
                    {
                        id: "operation",
                        label: t("staking.history.columns.operation"),
                        allLabel: t("common.dataTable.all"),
                        options: (
                            [
                                "stake",
                                "unstake",
                                "restake",
                                "withdraw",
                            ] as StakingActivityType[]
                        ).map((value) => ({
                            value,
                            label: t(`staking.history.types.${value}`),
                        })),
                        matches: (operation, value) => operation.type === value,
                    },
                    {
                        id: "status",
                        label: t("staking.history.columns.status"),
                        allLabel: t("common.dataTable.all"),
                        options: (
                            [
                                "confirmed",
                                "pending",
                                "available",
                                "withdrawn",
                                "restaked",
                            ] as StatusKind[]
                        ).map((value) => ({
                            value,
                            label:
                                value === "pending"
                                    ? t("common.dataTable.pending")
                                    : t(`staking.history.status.${value}`),
                        })),
                        matches: (operation, value) =>
                            (operation.unstakeState ?? "confirmed") === value,
                    },
                ]}
                noResultsText={t("common.dataTable.noResults")}
                rowKey={(operation) => operation.id}
                resetKey={stakerAddress}
                label={t("staking.history.title")}
                emptyText={emptyText}
                loading={isLoading}
                loadingText={t("common.dataTable.loading")}
                pagination={{
                    pageSize: 8,
                    labels: {
                        navigation: t("common.dataTable.pagination"),
                        previous: t("common.dataTable.previous"),
                        next: t("common.dataTable.next"),
                        page: (page) => t("common.dataTable.page", { page }),
                        range: (first, last, total) =>
                            t("common.dataTable.range", { first, last, total }),
                        summary: (page, total) =>
                            t("common.dataTable.summary", { page, total }),
                    },
                }}
                testId="staking-activity-table"
                headerClassName="staking-activity__table-header"
                header={
                    <div className="staking-activity__grid staking-activity__desktop">
                        {[
                            "date",
                            "operation",
                            "amount",
                            "status",
                            "transaction",
                        ].map((column) => (
                            <span
                                key={column}
                                className={
                                    column === "amount"
                                        ? "staking-activity__numeric"
                                        : undefined
                                }
                            >
                                {t(`staking.history.columns.${column}`)}
                            </span>
                        ))}
                    </div>
                }
                renderRow={(operation) => (
                    <>
                        <div className="staking-activity__grid staking-activity__desktop">
                            <span className="staking-activity__date">
                                {formatDate(operation.timestamp)}
                            </span>
                            {renderType(operation.type)}
                            {renderAmount(operation)}
                            {renderStatus(operation)}
                            {renderTransaction(operation)}
                        </div>
                        <div className="staking-activity__mobile">
                            <article className="staking-activity__mobile-row">
                                <div className="staking-activity__mobile-heading">
                                    {renderType(operation.type)}
                                    {renderStatus(operation)}
                                </div>
                                <div className="staking-activity__mobile-details">
                                    <div className="staking-activity__mobile-field staking-activity__mobile-field--right">
                                        <span className="staking-activity__mobile-label">
                                            {t(
                                                "staking.history.columns.amount"
                                            )}
                                        </span>
                                        {renderAmount(operation)}
                                    </div>
                                    <div className="staking-activity__mobile-field staking-activity__mobile-field--right">
                                        <span className="staking-activity__mobile-label">
                                            {t("staking.history.columns.date")}
                                        </span>
                                        <span className="staking-activity__date">
                                            {formatDate(operation.timestamp)}
                                        </span>
                                    </div>
                                    <div className="staking-activity__mobile-field">
                                        <span className="staking-activity__mobile-label">
                                            {t(
                                                "staking.history.columns.transaction"
                                            )}
                                        </span>
                                        {renderTransaction(operation)}
                                    </div>
                                </div>
                            </article>
                        </div>
                    </>
                )}
            />
        </section>
    );
}
