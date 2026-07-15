import "./Styles.scss";

import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import type { TokenConfig } from "../../../types/hooks";
import { PrecisionNumbers } from "../../PrecisionNumbers";
import ExpandedDetailField from "./ExpandedDetailField";

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
    recipient: string;
    status: string;
    error_code: string | number;
    block: string | number;
    executed_tx_hash: string;
    executed_tx_hash_truncate: string;
    fee: string | number;
    recipient_truncate: string;
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

function hasStatusValue(value: string | number): boolean {
    const normalized = String(value).trim().toLowerCase();

    return !["", "--", "null", "undefined", "0"].includes(normalized);
}

function RowDetail(props: RowDetailProps): React.ReactElement {
    const { t, ns, i18n } = useProjectTranslation();
    const explorerUrl = String(
        import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL || ""
    );
    const txHashLink =
        props.detail.tx_hash && props.detail.tx_hash !== "--"
            ? `${explorerUrl}/tx/${props.detail.tx_hash}`
            : undefined;
    const executedTxLink =
        props.detail.executed_tx_hash && props.detail.executed_tx_hash !== "--"
            ? `${explorerUrl}/tx/${props.detail.executed_tx_hash}`
            : undefined;
    const recipientLink =
        props.detail.recipient && props.detail.recipient !== "--"
            ? `${explorerUrl}/address/${props.detail.recipient}`
            : undefined;
    const shouldShowStatus = hasStatusValue(props.detail.status);
    const shouldShowErrorCode = hasStatusValue(props.detail.error_code);
    const shouldShowMessage = hasStatusValue(props.detail.msg);
    const shouldShowReason = hasStatusValue(props.detail.reason);
    const shouldShowStatusDump =
        shouldShowStatus ||
        shouldShowErrorCode ||
        shouldShowMessage ||
        shouldShowReason;

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
            <h3 className="LastOp__expanded__title">{props.detail.event}</h3>

            <div className="LastOp__expanded__grid">
                <div className="LastOp__expanded__group">
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.oper_id`, {
                            ns: ns,
                        })}
                        text={props.detail.oper_id || "--"}
                    />
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.created`, {
                            ns: ns,
                        })}
                        text={props.detail.created}
                    />
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.confirmation`, {
                            ns: ns,
                        })}
                        text={props.detail.confirmation}
                    />
                </div>

                <div className="LastOp__expanded__group">
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.executed_tx`, {
                            ns: ns,
                        })}
                        text={props.detail.executed_tx_hash_truncate}
                        link={executedTxLink}
                        enableCopy={true}
                        copyText={props.detail.executed_tx_hash}
                    />
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.tx`, {
                            ns: ns,
                        })}
                        text={props.detail.tx_hash_truncate}
                        link={txHashLink}
                        enableCopy={true}
                        copyText={props.detail.tx_hash}
                    />
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.recipient`, {
                            ns: ns,
                        })}
                        text={props.detail.recipient_truncate}
                        link={recipientLink}
                        enableCopy={true}
                        copyText={props.detail.recipient}
                    />
                </div>

                <div className="LastOp__expanded__group">
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.block`, {
                            ns: ns,
                        })}
                        text={props.detail.block}
                    />
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.gas_used`, {
                            ns: ns,
                        })}
                        text={props.detail.gas_used}
                    />
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.fee`, {
                            ns: ns,
                        })}
                        text={props.detail.fee}
                    />
                </div>

                <div className="LastOp__expanded__group">
                    <ExpandedDetailField
                        label={t(`operations.columns_detailed.price`, {
                            ns: ns,
                        })}
                        text={renderPrice(props.detail.price)}
                    />
                    <ExpandedDetailField
                        label={t(
                            `operations.columns_detailed.price_another_token`,
                            {
                                ns: ns,
                            }
                        )}
                        text={renderPrice(props.detail.price_another_token)}
                    />
                </div>
            </div>

            {shouldShowStatusDump && (
                <ExpandedDetailField
                    label={t(`operations.columns_detailed.status`, {
                        ns: ns,
                    })}
                    text={
                        <div className="LastOp__expanded__status-lines">
                            {shouldShowStatus && (
                                <div>{props.detail.status}</div>
                            )}
                            {shouldShowErrorCode && (
                                <div>
                                    {t(
                                        `operations.columns_detailed.error_code`,
                                        {
                                            ns: ns,
                                        }
                                    )}{" "}
                                    {props.detail.error_code}
                                </div>
                            )}
                            {shouldShowMessage && (
                                <div>
                                    {t(`operations.columns_detailed.msg`, {
                                        ns: ns,
                                    })}{" "}
                                    {props.detail.msg}
                                </div>
                            )}
                            {shouldShowReason && (
                                <div>
                                    {t(`operations.columns_detailed.reason`, {
                                        ns: ns,
                                    })}{" "}
                                    {props.detail.reason}
                                </div>
                            )}
                        </div>
                    }
                />
            )}
        </div>
    );
}

export default RowDetail;
