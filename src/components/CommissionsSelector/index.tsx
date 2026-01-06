import type { RadioChangeEvent } from "antd";
import { Radio, Space } from "antd";
import React from "react";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import type { CommissionsState } from "../../types/status";
import settings from "../../settings/settings.json";

interface CommissionsSelectorProps {
    onChangeFee: (e: RadioChangeEvent) => void;
    radioSelectFee: number;
    currencyYouExchange: string;
    commissionsByKey: CommissionsState;
    caIndex: number;
    radioSelectFeeTokenDisabled: boolean;
    TYPE_OPERATION: string;
}

export default function CommissionsSelector(props: CommissionsSelectorProps): React.ReactElement {

    const { 
        onChangeFee, 
        radioSelectFee,         
        currencyYouExchange, 
        commissionsByKey, 
        caIndex, 
        radioSelectFeeTokenDisabled,
        TYPE_OPERATION
    } = props;

    const { t, i18n, ns } = useProjectTranslation();
    const collateralAvailable = [];
    
    if (TYPE_OPERATION === "SWAP_TPFORTP") {
        for (let i = 0; i < settings.tokens.CA.length; i++) {
            collateralAvailable.push(i);
        }        
    } else {
        collateralAvailable.push(caIndex);
    }

    return (
        <>
            <div className={"radioButton"}>
                <Radio.Group
                    onChange={onChangeFee}
                    value={radioSelectFee}
                >
                    <Space direction="vertical">
                    <Radio
                            value={0}
                            disabled={
                                radioSelectFeeTokenDisabled
                            }
                        >
                            <span className={""}>
                                {t("fees.labelFee")} (
                                {PrecisionNumbers({
                                    amount: commissionsByKey["FeeToken"]?.commissionPercent ?? 0n,
                                    token: TokenSettings(
                                        currencyYouExchange
                                    ),
                                    decimals: 2,
                                    i18n: i18n,
                                })}
                                %)
                            </span>
                            <span className={""}> ≈ </span>
                            <span className={""}>
                                {PrecisionNumbers({
                                    amount: commissionsByKey["FeeToken"]?.commission ?? 0n,
                                    token: TokenSettings(
                                        `TF_${caIndex}`
                                    ),
                                    i18n: i18n,
                                })}
                            </span>
                            <span className={""}>
                                {" "}
                                {t(
                                    `exchange.tokens.TF.abbr`,
                                    { ns: ns }
                                )}
                            </span>
                            <span className={""}> (</span>
                            <span>
                                {PrecisionNumbers({
                                    amount: commissionsByKey["FeeToken"]?.commissionUSD ?? 0n,
                                    decimals: 2,
                                    token: TokenSettings(
                                        `CA_${caIndex}`
                                    ),
                                    i18n: i18n,
                                    isUSD: true,
                                })}
                            </span>
                            <span className={""}>
                                {" "}
                                {t(
                                    "exchange.exchangingCurrency"
                                )}
                            </span>
                            <span className={""}>) </span>
                        </Radio>
                        {collateralAvailable.map((ca, index) => (
                            <Radio value={index + 1} key={index + 1}>
                            <span
                                className={"token_exchange"}
                            >
                                {t("fees.labelFee")} (
                                {PrecisionNumbers({
                                    amount: commissionsByKey[`CA_${ca}`]?.commissionPercent ?? 0n,
                                    token: TokenSettings(
                                        currencyYouExchange
                                    ),
                                    decimals: 2,
                                    i18n: i18n,
                                })}
                                %)
                            </span>
                            <span className={""}> ≈ </span>
                            <span className={""}>
                                {PrecisionNumbers({
                                    amount: commissionsByKey[`CA_${ca}`]?.commission ?? 0n,
                                    token: TokenSettings(
                                        `CA_${ca}`
                                    ),
                                    i18n: i18n,
                                })}
                            </span>
                            <span className={""}>
                                {" "}
                                {t(
                                    `exchange.tokens.CA_${ca}.abbr`,
                                    { ns: ns }
                                )}
                            </span>
                            <span className={""}> (</span>
                            <span>
                                {PrecisionNumbers({
                                    amount: commissionsByKey[`CA_${ca}`]?.commissionUSD ?? 0n,
                                    decimals: 2,
                                    token: TokenSettings(
                                        `CA_${ca}`
                                    ),
                                    i18n: i18n,
                                    isUSD: true,
                                })}
                            </span>
                            <span className={""}>
                                {" "}
                                {t(
                                    "exchange.exchangingCurrency"
                                )}
                            </span>
                            <span className={""}>) </span>
                        </Radio>))}
                        
                    </Space>
                </Radio.Group>
            </div>
        </>
    );
}
