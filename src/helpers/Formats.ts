import BigNumber from "bignumber.js";

interface FormatConfig {
    decimalSeparator: string;
    groupSeparator: string;
}

interface FormatLocalMap {
    es: FormatConfig;
    en: FormatConfig;
}

const formatLocalMap: FormatLocalMap = {
    es: {
        decimalSeparator: ",",
        groupSeparator: ".",
    },
    en: {
        decimalSeparator: ".",
        groupSeparator: ",",
    },
};

// default format
BigNumber.config({
    FORMAT: formatLocalMap.en,
});

const fromContractPrecisionDecimals = (
    amount: string | number | BigNumber,
    decimals: number
): BigNumber => {
    return new BigNumber(amount).div(
        new BigNumber(10).exponentiatedBy(decimals)
    );
};

export { formatLocalMap, fromContractPrecisionDecimals };
