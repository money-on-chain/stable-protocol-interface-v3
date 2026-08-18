import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import MetricCard from "../MiniComponents/MetricCard";
import RateDisplay from "../MiniComponents/RateDisplay";
import {
    BORROW_ACTION_LABEL_KEYS,
    type BorrowCardActionId,
    type BorrowCardData,
    parseMetricNumber,
} from "./data";

interface BorrowProps {
    cards: BorrowCardData[];
    onOpenBorrow: (card: BorrowCardData) => void;
    onOpenDepositCollateral: (card: BorrowCardData) => void;
    onOpenRepay: (card: BorrowCardData) => void;
    onOpenRepayWithCollateral: (card: BorrowCardData) => void;
    onOpenWithdrawCollateral: (card: BorrowCardData) => void;
}

const BORROW_SECONDARY_ACTION_ORDER: BorrowCardActionId[] = [
    "repay",
    "deposit-collateral",
    "repay-with-collateral",
    "withdraw-collateral",
];

export default function Borrow({
    cards,
    onOpenBorrow,
    onOpenDepositCollateral,
    onOpenRepay,
    onOpenRepayWithCollateral,
    onOpenWithdrawCollateral,
}: BorrowProps): React.ReactElement {
    const { t } = useProjectTranslation();

    return (
        <div className={"layout-card"}>
            <div className={"layout-card-title"}>
                <h1>{t("borrowing.cardTitle.section")}</h1>
            </div>
            <div className="borrow-items">
                {cards.map((card) => (
                    <div className="card borrow-card" data-testid={`borrow-card-${card.id}`} key={card.id}>
                        {(() => {
                            const hasCurrentDebt =
                                parseMetricNumber(card.currentDebt.value) > 0;
                            const hasDepositedCollateral =
                                parseMetricNumber(
                                    card.depositedCollateral.value
                                ) > 0;
                            const hasDebtOrCollateral =
                                hasCurrentDebt || hasDepositedCollateral;
                            const borrowPair = `${card.borrowTokenTicker}/${card.collateralTokenTicker}`;

                            const isActionDisabled = (
                                actionId: BorrowCardActionId
                            ) => {
                                if (card.isVaultLiquidating) return true;

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
                                        <RateDisplay
                                            number={card.borrowApy}
                                            title={t("borrowing.labelInterest")}
                                        />
                                    </div>

                                    <div className="borrow-card-assets">
                                        <div className="borrow-card-asset">
                                            <div className="borrow-card-asset-label">
                                                {t("borrowing.labelLoanToken")}
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
                                                        (
                                                        {card.borrowTokenTicker}
                                                        )
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="borrow-card-asset">
                                            <div className="borrow-card-asset-label">
                                                {t(
                                                    "borrowing.labelCollateralToken"
                                                )}
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
                                                        (
                                                        {
                                                            card.collateralTokenTicker
                                                        }
                                                        )
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {card.isVaultLiquidating ? (
                                        <div className="borrow-card-liquidating-banner">
                                            {t("borrowing.liquidating.banner")}
                                        </div>
                                    ) : null}

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
                                                label={t(
                                                    "borrowing.labelMaxAvailable"
                                                )}
                                                localCurrencyValue={
                                                    card.maxAvailable.valueUsd
                                                }
                                                value={card.maxAvailable.value}
                                                valueLabel={
                                                    card.maxAvailable.ticker
                                                }
                                            />
                                        </div>
                                        {hasDebtOrCollateral ? (
                                            <div className="borrow-card-primary-spacer"></div>
                                        ) : null}
                                        {card.actions
                                            .filter(
                                                (action) =>
                                                    action.id === "borrow"
                                            )
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
                                                    data-testid={`borrow-card-borrow-${card.id}`}
                                                    disabled={isActionDisabled(
                                                        action.id
                                                    )}
                                                    onClick={() =>
                                                        onOpenBorrow(card)
                                                    }
                                                    key={action.id}
                                                    type="button"
                                                >
                                                    {t(
                                                        BORROW_ACTION_LABEL_KEYS[
                                                            action.id
                                                        ]
                                                    )}
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
                                                        label: t(
                                                            "borrowing.labelCurrentDebt"
                                                        ),
                                                        metric: card.currentDebt,
                                                    },
                                                    {
                                                        id: "deposited-collateral",
                                                        label: t(
                                                            "borrowing.labelDepositedCollateral"
                                                        ),
                                                        metric: card.depositedCollateral,
                                                    },
                                                ].map(
                                                    ({ id, label, metric }) => (
                                                        <MetricCard
                                                            key={id}
                                                            label={label}
                                                            localCurrencyValue={
                                                                metric.valueUsd
                                                            }
                                                            value={metric.value}
                                                            valueLabel={
                                                                metric.ticker
                                                            }
                                                        />
                                                    )
                                                )}
                                            </div>

                                            <div className="borrow-card-footer">
                                                <div className="borrow-card-actions">
                                                    {card.actions
                                                        .filter(
                                                            (action) =>
                                                                action.id !==
                                                                "borrow"
                                                        )
                                                        .sort(
                                                            (
                                                                leftAction,
                                                                rightAction
                                                            ) =>
                                                                BORROW_SECONDARY_ACTION_ORDER.indexOf(
                                                                    leftAction.id
                                                                ) -
                                                                BORROW_SECONDARY_ACTION_ORDER.indexOf(
                                                                    rightAction.id
                                                                )
                                                        )
                                                        .map((action) => (
                                                            <button
                                                                className="button--compact button--compact--secondary"
                                                                disabled={isActionDisabled(
                                                                    action.id
                                                                )}
                                                                onClick={() => {
                                                                    if (
                                                                        action.id ===
                                                                        "repay"
                                                                    ) {
                                                                        onOpenRepay(
                                                                            card
                                                                        );
                                                                    }

                                                                    if (
                                                                        action.id ===
                                                                        "repay-with-collateral"
                                                                    ) {
                                                                        onOpenRepayWithCollateral(
                                                                            card
                                                                        );
                                                                    }

                                                                    if (
                                                                        action.id ===
                                                                        "deposit-collateral"
                                                                    ) {
                                                                        onOpenDepositCollateral(
                                                                            card
                                                                        );
                                                                    }

                                                                    if (
                                                                        action.id ===
                                                                        "withdraw-collateral"
                                                                    ) {
                                                                        onOpenWithdrawCollateral(
                                                                            card
                                                                        );
                                                                    }
                                                                }}
                                                                key={action.id}
                                                                type="button"
                                                            >
                                                                {t(
                                                                    BORROW_ACTION_LABEL_KEYS[
                                                                        action
                                                                            .id
                                                                    ]
                                                                )}
                                                            </button>
                                                        ))}
                                                </div>

                                                <div className="borrow-card-liquidation">
                                                    <div className="borrow-card-liquidation-value">
                                                        {t(
                                                            "borrowing.labelLiquidationPercentage"
                                                        )}{" "}
                                                        {card.liquidationDropPercentage.toFixed(
                                                            2
                                                        )}
                                                        %
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : null}

                                    {card.previousLiquidation ? (
                                        <div className="borrow-card-previous-liquidation">
                                            <div className="borrow-card-previous-liquidation__header">
                                                <div className="borrow-card-previous-liquidation__title">
                                                    {t(
                                                        "borrowing.liquidated.title"
                                                    )}
                                                </div>
                                                <button
                                                    className="borrow-card-previous-liquidation__cta"
                                                    type="button"
                                                >
                                                    <span>
                                                        {t(
                                                            "borrowing.liquidated.ctaDetails"
                                                        )}
                                                    </span>
                                                    <div className="icon__button__arrow borrow-card-previous-liquidation__cta-icon"></div>
                                                </button>
                                            </div>
                                            <div className="borrow-card-previous-liquidation__metrics">
                                                <div className="borrow-card-previous-liquidation__metric">
                                                    <div className="borrow-card-previous-liquidation__metric-value">
                                                        {
                                                            card
                                                                .previousLiquidation
                                                                .amount
                                                        }
                                                    </div>
                                                    <div className="borrow-card-previous-liquidation__metric-label">
                                                        {t(
                                                            "borrowing.liquidated.labelAmount"
                                                        )}{" "}
                                                        (
                                                        {
                                                            card
                                                                .previousLiquidation
                                                                .amountTicker
                                                        }
                                                        )
                                                    </div>
                                                </div>
                                                <div className="borrow-card-previous-liquidation__metric borrow-card-previous-liquidation__metric--right">
                                                    <div className="borrow-card-previous-liquidation__metric-value">
                                                        {
                                                            card
                                                                .previousLiquidation
                                                                .liquidationPrice
                                                        }
                                                    </div>
                                                    <div className="borrow-card-previous-liquidation__metric-label">
                                                        {t(
                                                            "borrowing.liquidated.labelLiquidationPrice"
                                                        )}{" "}
                                                        ({borrowPair})
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
