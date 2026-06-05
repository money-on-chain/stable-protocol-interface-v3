import React from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import { PrecisionNumbers } from "../PrecisionNumbers";
import {
    buildCollateralDistributionRows,
    type CollateralDistributionRow,
} from "./collateralDistribution";

// Type definitions
interface TokensProps {
    caIndex: number;
}

interface Column {
    key: string;
    title: string;
}

interface TokenData {
    name: JSX.Element;
    price: React.ReactNode;
    ema: string | React.ReactNode;
    caUsed: React.ReactNode;
    minted: React.ReactNode;
    mintable: string | React.ReactNode;
    redeemable: React.ReactNode;
    coverage: React.ReactNode;
    [key: string]: React.ReactNode | string;
}

export default function Tokens({ caIndex }: TokensProps): JSX.Element {
    const { t, i18n, ns } = useProjectTranslation();
    const { contractProtocolStatus } = useWalletContext();
    const noLimitLabel = t("numberFormat.noLimit", {
        defaultValue: "No limit",
    });
    const collateralTicker = settings.tokens.CA[caIndex]?.name ?? "";

    const columns: Column[] = [
        {
            key: "name",
            title: t("performance.pegged.colName"),
        },
        {
            key: "price",
            title: t("performance.pegged.colPriceIn", {
                ticker: collateralTicker,
            }),
        },
        {
            key: "ema",
            title: t("performance.pegged.colEMA"),
        },
        {
            key: "caUsed",
            title: t("performance.pegged.colCAUsed"),
        },
        {
            key: "minted",
            title: t("performance.pegged.colMinted"),
        },
        {
            key: "mintable",
            title: t("performance.pegged.colMintable"),
        },
        {
            key: "redeemable",
            title: "Redeem",
        },
        // {
        //     key: "coverage",
        //     title: t("performance.pegged.colTargetCoverage"),
        // },
    ];

    const renderPriceInCollateral = (
        amount: bigint,
        decimals: number
    ): React.ReactNode =>
        !amount ? (
            "--"
        ) : (
            <>
                {PrecisionNumbers({
                    amount,
                    token: TokenSettings(`CA_${caIndex}`),
                    decimals,
                    i18n,
                    compact: true,
                })}{" "}
                {collateralTicker}
            </>
        );

    const renderPercent = (ratio: bigint | null): React.ReactNode => {
        if (ratio === null) return "--";

        const precision = 10n ** 18n;
        const basisPoints = (ratio * 10000n + precision / 2n) / precision;
        const integer = basisPoints / 100n;
        const decimals = (basisPoints % 100n).toString().padStart(2, "0");

        return `${integer.toString()}.${decimals}%`;
    };

    const renderAmount = (
        amount: bigint | null,
        token: CollateralDistributionRow["mintedToken"],
        decimals: number
    ): React.ReactNode =>
        !amount
            ? "--"
            : PrecisionNumbers({
                  amount,
                  token,
                  decimals,
                  i18n,
                  compact: true,
              });

    const bucketRows = buildCollateralDistributionRows(
        contractProtocolStatus.data?.[caIndex],
        caIndex,
        contractProtocolStatus
    );

    const tokensData: TokenData[] = bucketRows.map((row) => ({
        name: (
            <div className="token">
                <div className={`${row.iconClassName} token__icon`} />
                <span className="token__name">{row.fullName}</span>
                <span className="token__ticker">{row.symbol}</span>
            </div>
        ),
        price: renderPriceInCollateral(row.price, row.priceDecimals),
        ema:
            row.ema === null
                ? "--"
                : renderPriceInCollateral(row.ema, row.emaDecimals),
        caUsed: renderPercent(row.collateralUsedRatio),
        minted: renderAmount(row.minted, row.mintedToken, row.mintedDecimals),
        mintable: row.isMintableUnlimited
            ? noLimitLabel
            : renderAmount(
                  row.mintable,
                  row.mintableToken,
                  row.mintableDecimals
              ),
        redeemable: row.isRedeemableUnlimited
            ? noLimitLabel
            : renderAmount(
                  row.redeemable,
                  row.redeemableToken,
                  row.redeemableDecimals
              ),
        coverage:
            row.coverage === null ? (
                <div className="item-usd">--</div>
            ) : (
                renderAmount(
                    row.coverage,
                    row.coverageToken,
                    row.coverageDecimals
                )
            ),
    }));

    return (
        <table className="token-table">
            <thead>
                <tr className="token-table__header-row">
                    {columns.map((col) => (
                        <th
                            key={col.key}
                            className={`token-table__header token-table__header--${col.key}`}
                        >
                            {col.title}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {tokensData.map((token, index) => (
                    <tr key={index} className="token-table__row">
                        {columns.map((col) => (
                            <td
                                key={col.key}
                                className={`token-table__cell token-table__cell--${col.key}`}
                            >
                                {token[col.key]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
