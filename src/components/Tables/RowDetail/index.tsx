import React from "react";

import { useProjectTranslation } from "../../../helpers/translations";

interface DetailData {
    event: string;
    created: string;
    gas_used: string | number;
    oper_id: string | number;
    confirmation: string | number;
    recipient: string;
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
}

interface RowDetailProps {
    detail: DetailData;
}

function RowDetail(props: RowDetailProps): React.ReactElement {
    const { t, ns } = useProjectTranslation();

    return (
        <table>
            <tbody>
                <tr className="ant-descriptions-row">
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.event`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.event}
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.created`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.created}
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.gas_used`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        <div>{props.detail.gas_used} </div>
                    </td>
                </tr>
                <tr className="ant-descriptions-row">
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.oper_id`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.oper_id}
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.confirmation`, {
                            ns: ns,
                        })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.confirmation}{" "}
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.recipient`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.recipient}{" "}
                    </td>
                </tr>
                <tr className="ant-descriptions-row">
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.status`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.status}
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.error_code`, {
                            ns: ns,
                        })}
                    </th>
                    <td className="ant-descriptions-item-content" colSpan={1}>
                        {props.detail.error_code}
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.block`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.block}{" "}
                    </td>
                </tr>
                <tr className="ant-descriptions-row">
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.executed_tx`, {
                            ns: ns,
                        })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
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
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.fee`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.fee}
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.tx`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        <a
                            className="ant-descriptions-a"
                            href={`${import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL}/tx/${props.detail.tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <span>{props.detail.tx_hash_truncate} </span>
                        </a>
                    </td>
                </tr>
                <tr className="ant-descriptions-row">
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.msg`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        <span>{props.detail.msg} </span>
                    </td>
                    <th
                        className="ant-descriptions-item-label-th ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {t(`operations.columns_detailed.reason`, { ns: ns })}
                    </th>
                    <td
                        className="ant-descriptions-item-content ant-descriptions-border-bottom"
                        colSpan={1}
                    >
                        {props.detail.reason}
                    </td>
                    {/*<th*/}
                    {/*    className="ant-descriptions-item-label-th ant-descriptions-border-bottom"*/}
                    {/*    colSpan="1"*/}
                    {/*>*/}
                    {/*    {t(`operations.columns_detailed.reserve_price`, {*/}
                    {/*        ns: ns*/}
                    {/*    })}*/}
                    {/*</th>*/}
                    {/*<td*/}
                    {/*    className="ant-descriptions-item-content ant-descriptions-border-bottom"*/}
                    {/*    colSpan="1"*/}
                    {/*>*/}
                    {/*    /!*props.detail.price*!/*/}
                    {/*</td>*/}
                </tr>
            </tbody>
        </table>
    );
}

export default RowDetail;
