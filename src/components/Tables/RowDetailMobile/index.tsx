import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import type { TokenConfig } from "../../../types/hooks";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface PriceData {
    value: bigint | null;
    currency: string | null;
    token: TokenConfig | null;
}

interface DetailData {
    event: string;
    created: React.ReactNode;
    gas_used: string | number;
    oper_id: string | number | null;
    confirmation: React.ReactNode | string;
    recipient: React.ReactNode | string;
    status: string;
    error_code: string | number;
    block: string | number;
    executed_tx_hash: string;
    executed_tx_hash_truncate: string;
    fee: string | number;
    tx_hash: string;
    tx_hash_truncate: string;
    msg: string;
    reason: string;
    price: PriceData | null;
    price_another_token: PriceData | null;
}

interface RowDetailProps {
    detail: DetailData;
}

interface ItemDataProps {
    label: string;
    data: React.ReactNode;
}

function ItemData(props: ItemDataProps): React.ReactElement {
    return (
        <div className="LastOp__expanded__item">
            <div className="LastOp__expanded__label">{props.label}</div>
            <div className="LastOp__expanded__data">{props.data}</div>
        </div>
    );
}

function RowDetail(props: RowDetailProps): React.ReactElement {
    const { t, ns, i18n } = useProjectTranslation();

    const renderPrice = (price: PriceData | null) =>
        price?.value && price.token ? (
            <>
                <PrecisionNumbers
                    amount={price.value}
                    token={price.token}
                    decimals={price.token.visibleDecimals ?? 6}
                    i18n={i18n}
                    compact={true}
                />
                <span> {price.currency}</span>
            </>
        ) : (
            "--"
        );

    return (
        <div className="LastOp__expanded__container">
            <div className="LastOp__expanded__main-grid">
                <div className="LastOp__expanded__group">
                    <ItemData
                        label={t(`operations.columns_detailed.event`, {
                            ns: ns,
                        })}
                        data={props.detail.event}
                    />
                    <ItemData
                        label={t(`operations.columns_detailed.oper_id`, {
                            ns: ns,
                        })}
                        data={props.detail.oper_id}
                    />
                    <ItemData
                        label={t(`operations.columns_detailed.executed_tx`, {
                            ns: ns,
                        })}
                        data={
                            <a
                                className="ant-descriptions-a"
                                href={`${import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL}/tx/${props.detail.executed_tx_hash}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <span>
                                    {props.detail.executed_tx_hash_truncate}{" "}
                                </span>
                            </a>
                        }
                    />
                    <ItemData
                        label={t(`operations.columns_detailed.recipient`, {
                            ns: ns,
                        })}
                        data={props.detail.recipient}
                    />
                </div>

                <div className="LastOp__expanded__group">
                    <ItemData
                        label={t(`operations.columns_detailed.created`, {
                            ns: ns,
                        })}
                        data={props.detail.created}
                    />
                    <ItemData
                        label={t(`operations.columns_detailed.confirmation`, {
                            ns: ns,
                        })}
                        data={props.detail.confirmation}
                    />
                    <ItemData
                        label={t(`operations.columns_detailed.gas_used`, {
                            ns: ns,
                        })}
                        data={props.detail.gas_used}
                    />
                    <ItemData
                        label={t(`operations.columns_detailed.block`, {
                            ns: ns,
                        })}
                        data={props.detail.block}
                    />
                    <ItemData
                        label={t(`operations.columns_detailed.tx`, {
                            ns: ns,
                        })}
                        data={
                            <a
                                className="ant-descriptions-a"
                                href={`${import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL}/tx/${props.detail.tx_hash}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <span>{props.detail.tx_hash_truncate} </span>
                            </a>
                        }
                    />
                </div>

                <div className="LastOp__expanded__group">
                    <ItemData
                        label={t(`operations.columns_detailed.price`, {
                            ns: ns,
                        })}
                        data={renderPrice(props.detail.price)}
                    />
                    <ItemData
                        label={t(
                            `operations.columns_detailed.price_another_token`,
                            {
                                ns: ns,
                            }
                        )}
                        data={renderPrice(props.detail.price_another_token)}
                    />
                    <ItemData
                        label={t(`operations.columns_detailed.fee`, {
                            ns: ns,
                        })}
                        data={props.detail.fee}
                    />
                </div>
            </div>

            <div className="LastOp__expanded__status-dump">
                <ItemData
                    label={t(`operations.columns_detailed.status`, {
                        ns: ns,
                    })}
                    data={props.detail.status}
                />
                <ItemData
                    label={t(`operations.columns_detailed.msg`, {
                        ns: ns,
                    })}
                    data={props.detail.msg}
                />
                <ItemData
                    label={t(`operations.columns_detailed.reason`, {
                        ns: ns,
                    })}
                    data={props.detail.reason}
                />
                <ItemData
                    label={t(`operations.columns_detailed.error_code`, {
                        ns: ns,
                    })}
                    data={props.detail.error_code}
                />
            </div>
        </div>
    );
}

export default RowDetail;
