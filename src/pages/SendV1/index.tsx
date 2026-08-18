import "../Send/Styles.scss";

import { Skeleton } from "antd";
import React from "react";

import SendV1 from "../../components/SendV1";
import ListOperationsV1 from "../../components/Tables/ListOperationsV1";
import { useWalletContext } from "../../context/Wallet";
import { useProjectTranslation } from "../../helpers/translations";

export default function SectionSendV1(): React.ReactElement {
    const { t } = useProjectTranslation();
    const { contractProtocolStatusV1, userBalanceV1 } = useWalletContext();

    const ready =
        contractProtocolStatusV1.data != null && userBalanceV1.data != null;

    return (
        <div className="section-container">
            <div className="layout-card">
                <div className="layout-card-title">
                    <h1>{t("send.cardTitle")}</h1>
                </div>
                <div className="content-body layout-card-content">
                    {ready ? <SendV1 /> : <Skeleton active />}
                </div>
            </div>

            <div className="section__innerCard--big content-last-operations">
                <ListOperationsV1 token="all" />
            </div>
        </div>
    );
}
