import type { RadioChangeEvent } from "antd";
import { Radio, Space } from "antd";
import React from "react";

import { TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import type { CommissionsState } from "../../types/status";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface CommissionsSelectorProps {
    onChangeFee: (e: RadioChangeEvent) => void;
    radioSelectFee: number;
    currencyYouExchange: string;
    commissionsByKey: CommissionsState;
    caIndex: number;
    operationType: string;
}

export default function CommissionsSelector(
    props: CommissionsSelectorProps
): React.ReactElement {
    const {
        onChangeFee,
        radioSelectFee,
        currencyYouExchange,
        commissionsByKey,
        caIndex,
        operationType,
    } = props;

    const { t, i18n, ns } = useProjectTranslation();
    const collateralAvailable = [];

    if (operationType === "SWAP_TPFORTP") {
        for (let i = 0; i < settings.tokens.CA.length; i++) {
            collateralAvailable.push(i);
        }
    } else {
        collateralAvailable.push(caIndex);
    }

    return (
        <>
            <div className={"radioButton"}>
                <Radio.Group onChange={onChangeFee} value={radioSelectFee}>
                    <Space direction="vertical">
                        <Radio
                            value={0}
                            disabled={
                                commissionsByKey["FeeToken"]?.commission >
                                commissionsByKey["FeeToken"]?.balance
                            }
                        >
                            <span className={""}>
                                {t("fees.labelFee")} (
                                {PrecisionNumbers({
                                    amount:
                                        commissionsByKey["FeeToken"]
                                            ?.commissionPercent ?? 0n,
                                    token: TokenSettings(currencyYouExchange),
                                    decimals: 2,
                                    i18n: i18n,
                                    compact: true,
                                })}
                                %)
                            </span>
                            <span className={""}> ≈ </span>
                            <span className={""}>
                                {PrecisionNumbers({
                                    amount:
                                        commissionsByKey["FeeToken"]
                                            ?.commission ?? 0n,
                                    token: TokenSettings(`TF_${caIndex}`),
                                    i18n: i18n,
                                    compact: true,
                                })}
                            </span>
                            <span className={""}>
                                {" "}
                                {t(`exchange.tokens.TF.abbr`, { ns: ns })}
                            </span>
                            <span className={""}> (</span>
                            <span>
                                {PrecisionNumbers({
                                    amount:
                                        commissionsByKey["FeeToken"]
                                            ?.commissionUSD ?? 0n,
                                    decimals: 2,
                                    token: TokenSettings(`CA_${caIndex}`),
                                    i18n: i18n,
                                    isUSD: true,
                                    compact: true,
                                })}
                            </span>
                            <span className={""}>
                                {" "}
                                {t("exchange.exchangingCurrency")}
                            </span>
                            <span className={""}>) </span>
                        </Radio>
                        {collateralAvailable.map((ca, index) => (
                            <Radio
                                value={index + 1}
                                key={index + 1}
                                disabled={
                                    commissionsByKey[`CA_${ca}`]?.commission >
                                    commissionsByKey[`CA_${ca}`]?.balance
                                }
                            >
                                <span className={"token_exchange"}>
                                    {t("fees.labelFee")} (
                                    {PrecisionNumbers({
                                        amount:
                                            commissionsByKey[`CA_${ca}`]
                                                ?.commissionPercent ?? 0n,
                                        token: TokenSettings(
                                            currencyYouExchange
                                        ),
                                        decimals: 2,
                                        i18n: i18n,
                                        compact: true,
                                    })}
                                    %)
                                </span>
                                <span className={""}> ≈ </span>
                                <span className={""}>
                                    {PrecisionNumbers({
                                        amount:
                                            commissionsByKey[`CA_${ca}`]
                                                ?.commission ?? 0n,
                                        token: TokenSettings(`CA_${ca}`),
                                        i18n: i18n,
                                        compact: true,
                                    })}
                                </span>
                                <span className={""}>
                                    {" "}
                                    {t(`exchange.tokens.CA_${ca}.abbr`, {
                                        ns: ns,
                                    })}
                                </span>
                                <span className={""}> (</span>
                                <span>
                                    {PrecisionNumbers({
                                        amount:
                                            commissionsByKey[`CA_${ca}`]
                                                ?.commissionUSD ?? 0n,
                                        decimals: 2,
                                        token: TokenSettings(`CA_${ca}`),
                                        i18n: i18n,
                                        isUSD: true,
                                        compact: true,
                                    })}
                                </span>
                                <span className={""}>
                                    {" "}
                                    {t("exchange.exchangingCurrency")}
                                </span>
                                <span className={""}>) </span>
                            </Radio>
                        ))}
                    </Space>
                </Radio.Group>
            </div>
        </>
    );
}
