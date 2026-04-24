import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import MetricCard from "../MiniComponents/MetricCard";

interface BorrowCardMetric {
    value: string;
    ticker: string;
    valueUsd: string;
}

type BorrowCardActionId =
    | "borrow"
    | "repay"
    | "repay-with-collateral"
    | "deposit-collateral"
    | "withdraw-collateral";

interface BorrowCardAction {
    id: BorrowCardActionId;
    isPrimary?: boolean;
}

interface MockBorrowCard {
    id: string;
    borrowTokenIconClassName: string;
    borrowTokenName: string;
    borrowTokenTicker: string;
    collateralTokenIconClassName: string;
    collateralTokenName: string;
    collateralTokenTicker: string;
    borrowApy: string;
    maxAvailable: BorrowCardMetric;
    currentDebt: BorrowCardMetric;
    depositedCollateral: BorrowCardMetric;
    liquidationDropPercentage: number;
    actions: BorrowCardAction[];
}

const BORROW_ACTION_LABELS: Record<BorrowCardActionId, string> = {
    borrow: "Borrow",
    repay: "Repay",
    "repay-with-collateral": "Repay with Collateral",
    "deposit-collateral": "Deposit Collateral",
    "withdraw-collateral": "Withdraw Collateral",
};

const BORROW_CARDS: MockBorrowCard[] = [
    {
        id: "arsflip-borrow",
        borrowTokenIconClassName: "icon-token-tp_0 token-icon",
        borrowTokenName: "Argentine Peso",
        borrowTokenTicker: "ARSFLIP",
        collateralTokenIconClassName: "icon-token-ca_1 token-icon",
        collateralTokenName: "Dollar on Chain",
        collateralTokenTicker: "DOC",
        borrowApy: "0.40",
        maxAvailable: {
            value: "12,450.00",
            ticker: "ARSFLIP",
            valueUsd: "10,000",
        },
        currentDebt: {
            value: "0.00",
            ticker: "ARSFLIP",
            valueUsd: "0",
        },
        depositedCollateral: {
            value: "0.00",
            ticker: "DOC",
            valueUsd: "0",
        },
        liquidationDropPercentage: 50,
        actions: [
            { id: "borrow", isPrimary: true },
            { id: "repay" },
            { id: "repay-with-collateral" },
            { id: "deposit-collateral" },
            { id: "withdraw-collateral" },
        ],
    },
    {
        id: "copflip-borrow",
        borrowTokenIconClassName: "icon-token-tp_1 token-icon",
        borrowTokenName: "Colombian Peso",
        borrowTokenTicker: "COPFLIP",
        collateralTokenIconClassName: "icon-token-ca_1 token-icon",
        collateralTokenName: "Dollar On Chain",
        collateralTokenTicker: "DOC",
        borrowApy: "0.55",
        maxAvailable: {
            value: "8,200.00",
            ticker: "COPFLIP",
            valueUsd: "1,950",
        },
        currentDebt: {
            value: "1,500.00",
            ticker: "COPFLIP",
            valueUsd: "357",
        },
        depositedCollateral: {
            value: "2.15",
            ticker: "RPRO",
            valueUsd: "2,280",
        },
        liquidationDropPercentage: 42.5,
        actions: [
            { id: "borrow", isPrimary: true },
            { id: "repay" },
            { id: "repay-with-collateral" },
            { id: "deposit-collateral" },
            { id: "withdraw-collateral" },
        ],
    },
];

export default function Borrow(): React.ReactElement {
    const { t } = useProjectTranslation();

    return (
        <div className={"layout-card"}>
            <div className={"layout-card-title"}>
                <h1>{t("borrowing.cardTitle.section")}</h1>
            </div>
            <div className="borrow-items">
                {BORROW_CARDS.map((card) => (
                    <div className="card borrow-card" key={card.id}>
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
                            <MetricCard
                                label="Max Available (Wallet + Collateral)"
                                localCurrencyValue={card.maxAvailable.valueUsd}
                                value={card.maxAvailable.value}
                                valueLabel={card.maxAvailable.ticker}
                            />
                            <div className="borrow-card-primary-spacer"></div>
                            {card.actions
                                .filter((action) => action.id === "borrow")
                                .map((action) => (
                                    <button
                                        className="button--compact borrow-card-primary-action"
                                        key={action.id}
                                    >
                                        {BORROW_ACTION_LABELS[action.id]}
                                    </button>
                                ))}
                            <div className="borrow-card-primary-spacer"></div>
                        </div>

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
                                    .filter((action) => action.id !== "borrow")
                                    .map((action) => (
                                        <button
                                            className="button--compact button--compact--secondary"
                                            key={action.id}
                                        >
                                            {BORROW_ACTION_LABELS[action.id]}
                                        </button>
                                    ))}
                            </div>

                            <div className="borrow-card-liquidation">
                                <div className="borrow-card-liquidation-value">
                                    Loan is liquidated if collateral price drops{" "}
                                    {card.liquidationDropPercentage.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
