import "./Styles.scss";

import React from "react";

import { TokenSettings } from "../../../helpers/currencies";
import { fromWei } from "../../../helpers/precision";
import { useProjectTranslation } from "../../../helpers/translations";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface CompletedBarProps {
    description: string;
    type: string;
    percentage: bigint; // BigInt with 18 decimals
    needed: bigint; // BigInt with 18 decimals
    label1?: string;
    amount1?: bigint; // BigInt with 18 decimals
    percentage1?: bigint; // BigInt with 18 decimals
    label2?: string;
    amount2?: bigint; // BigInt with 18 decimals
    percentage2?: bigint; // BigInt with 18 decimals
    label3?: string;
    amount3?: bigint; // BigInt with 18 decimals
    percentage3?: bigint; // BigInt with 18 decimals
}

export default function CompletedBar(props: CompletedBarProps): React.ReactElement {
    const { i18n } = useProjectTranslation();
    const space = "\u00A0";

    return (
        <div className="CompletedBar__wrapper">
            {props.description}
            <div className="CompletedBar__container">
                <div
                    className={`gauge ${props.type} ${props.percentage === 100000000000000000000n ? " maxvalue" : ""}`}
                    style={{ width: fromWei(props.percentage) + "%" }}
                ></div>
                <div
                    className={"needed " + props.type}
                    style={{
                        position: "absolute",
                        width: fromWei(props.needed) + "%",
                        zIndex: 100,
                    }}
                ></div>
            </div>

            <div className="extraData__container">
                {props.label1 != null && (
                    <div className="dataItem">
                        {props.label1}:{space}
                        {PrecisionNumbers({
                            amount: props.amount1 || 0n,
                            token: TokenSettings("TG"),
                            decimals: 2,
                            i18n: i18n,
                        })}
                        {space}(
                        {PrecisionNumbers({
                            amount: props.percentage1 || 0n,
                            token: TokenSettings("TG"),
                            decimals: 2,
                            i18n: i18n,
                        })}
                        %)
                    </div>
                )}
                {props.label2 != null && (
                    <div className="dataItem">
                        {props.label2}:{space}
                        {PrecisionNumbers({
                            amount: props.amount2 || 0n,
                            token: TokenSettings("TG"),
                            decimals: 2,
                            i18n: i18n,
                        })}
                        {space}(
                        {PrecisionNumbers({
                            amount: props.percentage2 || 0n,
                            token: TokenSettings("TG"),
                            decimals: 2,
                            i18n: i18n,
                        })}
                        %)
                    </div>
                )}
                {props.label3 != null && (
                    <div className="dataItem">
                        {props.label3}:{space}
                        {PrecisionNumbers({
                            amount: props.amount3 || 0n,
                            token: TokenSettings("TG"),
                            decimals: 2,
                            i18n: i18n,
                        })}
                        {space}(
                        {PrecisionNumbers({
                            amount: props.percentage3 || 0n,
                            token: TokenSettings("TG"),
                            decimals: 2,
                            i18n: i18n,
                        })}
                        %)
                    </div>
                )}
            </div>
            {/* 
            <div className="CompletedBar__labels__container">
                <div className="extraData">
                    {props.labelCurrent}:{space}
                    {PrecisionNumbers({
                        amount: props.valueCurrent,
                        token: TokenSettings('TG'),
                        decimals: 2,
                        t: t,
                        i18n: i18n,
                        ns: ns,
                        skipContractConvert: true
                    })}
                    {space}(
                    {PrecisionNumbers({
                        amount: props.pctCurrent,
                        token: TokenSettings('TG'),
                        decimals: 2,
                        t: t,
                        i18n: i18n,
                        ns: ns,
                        skipContractConvert: true
                    })}
                    %)
                </div>
                {props.labelNeedIt != null && (
                    <div className="extraData">
                        {props.labelNeedIt}:{space}
                        {PrecisionNumbers({
                            amount: props.valueNeedIt,
                            token: TokenSettings('TG'),
                            decimals: 2,
                            t: t,
                            i18n: i18n,
                            ns: ns,
                            skipContractConvert: true
                        })}
                        {space}(
                        {PrecisionNumbers({
                            amount: props.pctNeedIt,
                            token: TokenSettings('TG'),
                            decimals: 2,
                            t: t,
                            i18n: i18n,
                            ns: ns,
                            skipContractConvert: true
                        })}
                        %)
                    </div>
                )}
                {props.labelTotal != null && (
                    <div className="extraData">
                        {props.labelTotal}:{space}
                        {PrecisionNumbers({
                            amount: props.valueTotal,
                            token: TokenSettings('TG'),
                            decimals: 2,
                            t: t,
                            i18n: i18n,
                            ns: ns,
                            skipContractConvert: true
                        })}
                        {space}(100%)
                    </div>
                )}
            </div> */}
        </div>
    );
}
