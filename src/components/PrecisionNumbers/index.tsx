import React, { Fragment } from "react";
import { Tooltip } from "antd";
// @ts-ignore
import NumericLabel from "react-pretty-numbers";
import BigNumber from "bignumber.js";

interface Token {
    decimals: number;
    visibleDecimals: number;
}

interface I18n {
    languages: readonly string[];
}

interface PrecisionNumbersProps {
    amount: any; // BigNumber or string/number
    token: Token;
    decimals?: number;
    numericLabelParams?: any;
    i18n: I18n;
    skipContractConvert?: boolean;
    isUSD?: boolean;
}

const fromContractPrecisionDecimals = (amount: any, decimals: number): BigNumber => {
    return new BigNumber(amount).div(
        new BigNumber(10).exponentiatedBy(decimals)
    );
};

const formatLargeNumber = (numberBig: BigNumber, decimals: number): string => {
    const billion = new BigNumber(1e9);
    const million = new BigNumber(1e6);

    if (numberBig.gte(billion)) {
        const billions = numberBig.div(billion);
        return (
            billions.toFormat(decimals, BigNumber.ROUND_HALF_EVEN, {
                decimalSeparator: ".",
                groupSeparator: ",",
            }) + " B "
        );
    } else if (numberBig.gte(million)) {
        const millions = numberBig.div(million);
        return (
            millions.toFormat(decimals, BigNumber.ROUND_HALF_EVEN, {
                decimalSeparator: ".",
                groupSeparator: ",",
            }) + " M "
        );
    } else {
        return numberBig.toFormat(decimals, BigNumber.ROUND_UP, {
            decimalSeparator: ".",
            groupSeparator: ",",
        });
    }
};

const PrecisionNumbers: React.FC<PrecisionNumbersProps> = ({
    amount,
    token,
    decimals,
    numericLabelParams = {},
    i18n,
    skipContractConvert = false,
    isUSD = false,
}) => {
    let amountBig: BigNumber;
    if (skipContractConvert) {
        amountBig = amount;
    } else {
        amountBig = fromContractPrecisionDecimals(amount, token.decimals);
    }

    if (!decimals) {
        decimals = token.visibleDecimals;
    }
    let amountFormat: string;
    if (!isUSD) {
        amountFormat = amountBig.toFormat(decimals, BigNumber.ROUND_UP, {
            decimalSeparator: ".",
            groupSeparator: ",",
        });
    } else {
        amountFormat = formatLargeNumber(amountBig, decimals);
    }

    const params = Object.assign(
        {
            shortFormat: !isUSD,
            justification: "L",
            locales: i18n.languages[0],
            shortFormatMinValue: 1000000,
            commafy: true,
            shortFormatPrecision: decimals,
            precision: decimals,
            title: "",
            cssClass: ["display-inline"],
        },
        numericLabelParams
    );

    // If is very big number
    if (amountBig.gte(new BigNumber(115792089237316200000000000000000000))) {
        return <span>Infinity +</span>;
    } else {
        return isUSD ? (
            <Fragment>{amountFormat}</Fragment>
        ) : (
            <Tooltip title={amountBig.eq(0) ? "0" : amountBig.toString()}>
                <NumericLabel {...{ params }}>{amountFormat}</NumericLabel>
            </Tooltip>
        );
    }
};

export { PrecisionNumbers };
