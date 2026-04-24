import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import {
    BORROW_ACTION_LABELS,
    BORROW_CARDS,
    parseMetricNumber,
    type BorrowCardActionId,
    type BorrowCardData,
} from "./data";
import MetricCard from "../MiniComponents/MetricCard";

interface BorrowProps {
    onOpenBorrow: (card: BorrowCardData) => void;
}

export default function Borrow({ onOpenBorrow }: BorrowProps): React.ReactElement {
    const { t } = useProjectTranslation();

    return (
        <div className={"layout-card"}>
            <div className={"layout-card-title"}>
                <h1>{t("borrowing.cardTitle.section")}</h1>
            </div>
            <div className="borrow-items">
                {BORROW_CARDS.map((card) => (
                    <div className="card borrow-card" key={card.id}>
                        {(() => {
                            const hasCurrentDebt =
                                parseMetricNumber(card.currentDebt.value) > 0;
                            const hasDepositedCollateral =
                                parseMetricNumber(
                                    card.depositedCollateral.value
                                ) > 0;
                            const hasDebtOrCollateral =
                                hasCurrentDebt || hasDepositedCollateral;

                            const isActionDisabled = (
                                actionId: BorrowCardActionId
                            ) => {
                                if (
                                    actionId === "repay" ||
                                    actionId === "repay-with-collateral"
                                ) {
                                    return !hasCurrentDebt;
                                }

                                if (actionId === "withdraw-collateral") {
                                    return !hasDepositedCollateral;
                                }

                                return false;
                            };

                            return (
                                <>
                        <div className="card-header">
                            <div className="interest-wrapper">
                                <div className="label">
                                    {t("borrowing.labelInterest")}
                                </div>
                                <div className="interest-data">
                                    <div>{card.borrowApy}</div>
                                    <div>%</div>
                                </div>
                            </div>
                        </div>

                        <div className="borrow-card-assets">
                            <div className="borrow-card-asset">
                                <div className="borrow-card-asset-label">
                                    Loan Token
                                </div>
                                <div className="token">
                                    <div
                                        className={
                                            card.borrowTokenIconClassName
                                        }
                                    ></div>
                                    <div className="token-name">
                                        {card.borrowTokenName}
                                        <div className="token-ticker">
                                            ({card.borrowTokenTicker})
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="borrow-card-asset">
                                <div className="borrow-card-asset-label">
                                    Collateral Token
                                </div>
                                <div className="token">
                                    <div
                                        className={
                                            card.collateralTokenIconClassName
                                        }
                                    ></div>
                                    <div className="token-name">
                                        {card.collateralTokenName}
                                        <div className="token-ticker">
                                            ({card.collateralTokenTicker})
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="borrow-card-primary-metrics">
                            <div
                                className={[
                                    "borrow-card-primary-metric",
                                    !hasDebtOrCollateral &&
                                        "borrow-card-primary-metric--full",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                            >
                                <MetricCard
                                    label="Max Available (Wallet + Collateral)"
                                    localCurrencyValue={card.maxAvailable.valueUsd}
                                    value={card.maxAvailable.value}
                                    valueLabel={card.maxAvailable.ticker}
                                />
                            </div>
                            {hasDebtOrCollateral ? (
                                <div className="borrow-card-primary-spacer"></div>
                            ) : null}
                            {card.actions
                                .filter((action) => action.id === "borrow")
                                .map((action) => (
                                    <button
                                        className={[
                                            "button--compact",
                                            "borrow-card-primary-action",
                                            !hasDebtOrCollateral &&
                                                "borrow-card-primary-action--single",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        disabled={isActionDisabled(action.id)}
                                        onClick={() => onOpenBorrow(card)}
                                        key={action.id}
                                        type="button"
                                    >
                                        {BORROW_ACTION_LABELS[action.id]}
                                    </button>
                                ))}
                            {hasDebtOrCollateral ? (
                                <div className="borrow-card-primary-spacer"></div>
                            ) : null}
                        </div>

                        {hasDebtOrCollateral ? (
                            <>
                                <div className="borrow-card-metrics">
                                    {[
                                        {
                                            id: "current-debt",
                                            label: "Current Debt",
                                            metric: card.currentDebt,
                                        },
                                        {
                                            id: "deposited-collateral",
                                            label: "Deposited Collateral",
                                            metric: card.depositedCollateral,
                                        },
                                    ].map(({ id, label, metric }) => (
                                        <MetricCard
                                            key={id}
                                            label={label}
                                            localCurrencyValue={metric.valueUsd}
                                            value={metric.value}
                                            valueLabel={metric.ticker}
                                        />
                                    ))}
                                </div>

                                <div className="borrow-card-footer">
                                    <div className="borrow-card-actions">
                                        {card.actions
                                            .filter(
                                                (action) =>
                                                    action.id !== "borrow"
                                            )
                                            .map((action) => (
                                                <button
                                                    className="button--compact button--compact--secondary"
                                                    disabled={isActionDisabled(
                                                        action.id
                                                    )}
                                                    key={action.id}
                                                    type="button"
                                                >
                                                    {
                                                        BORROW_ACTION_LABELS[
                                                            action.id
                                                        ]
                                                    }
                                                </button>
                                            ))}
                                    </div>

                                    <div className="borrow-card-liquidation">
                                        <div className="borrow-card-liquidation-value">
                                            Loan is liquidated if collateral
                                            price drops{" "}
                                            {card.liquidationDropPercentage.toFixed(
                                                2
                                            )}
                                            %
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}
                                </>
                            );
                        })()}
                    </div>
                ))}
            </div>
        </div>
    );
}
