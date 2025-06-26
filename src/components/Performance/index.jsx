import React, { useContext, useState, useEffect } from "react";
import { Modal } from "antd";

import { useProjectTranslation } from "../../helpers/translations";
import { AuthenticateContext } from "../../context/Auth";
import { CheckStatusGlobal } from "../../helpers/checkStatus";
import GlobalStatusModal from "../Modals/GlobalStatus";
import settings from "../../settings/settings.json";
import Buckets from './buckets';
import TVL from './tvl'
import MultiCollateral from './multicollateral'


export default function Performance() {    
    const [statusIcon, setStatusIcon] = useState("");
    const [statusLabel, setStatusLabel] = useState("--");
    const [statusText, setStatusText] = useState("--");
    const [statusCode, setStatusCode] = useState([]);
    const [showGlobalStatusModal, setShowGlobalStatusModal] = useState(false);
    const { t } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const { checkerStatus } = CheckStatusGlobal();
    useEffect(() => {
        if ((auth.contractStatusData, auth.userBalanceData)) {
            const { statusIcon, statusLabel, statusText, statusCode } = checkerStatus();            
            setStatusIcon(statusIcon);
            setStatusLabel(statusLabel);
            setStatusText(statusText);
            setStatusCode(statusCode);
        }
    }, [auth.contractStatusData, auth.userBalanceData]);

    const showModal = () => {
        setShowGlobalStatusModal(true);
    };
    const hideModal = () => {
        setShowGlobalStatusModal(false);
    };

    return (
        <div className="section sectionPerformance">
            {/* System Status */}
            <div className="section__innerCard--small dash__perfSystemStatus">
                <div className="card-system-status">
                    <div className="layout-card-title">
                        <h1>{t("performance.status.cardTitle")}</h1>
                        <a className="aboutShowModal__button" onClick={showModal}>
                            <div>Status</div>
                            <div className="logo-status"></div>
                        </a>
                        {showGlobalStatusModal && (
                            <Modal
                                title={'Global Status'}
                                width={505}
                                open={true}
                                onCancel={hideModal}
                                footer={null}
                                closable={false}
                                className="aboutGlobalStatus__modal ModalAccount "
                                centered={true}
                                maskStyle={{}}
                            >
                                <GlobalStatusModal hideModal={hideModal} statusCode={statusCode} />
                            </Modal>
                        )}
                    </div>

                    <div className="card-content">
                        <div className="coll-1">
                            <div className="stat-text">{statusText}</div>
                        </div>
                        <div className="coll-2">
                            <div className="stat-icon">
                                <div className={`${statusIcon}`}></div>
                                {statusLabel}
                            </div>
                            <div className="block-info">
                                {t("performance.status.showingBlock")}
                                {auth.contractStatusData
                                    ? BigInt(
                                          auth.contractStatusData.blockHeight
                                      ).toString()
                                    : "--"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Total Value Locked */}
            <TVL key={'tvl'} />

            {/* MultiCollateral */}
            <MultiCollateral key={'multicollateral'} />

            {/* Buckets */}
            {settings.tokens.CA.map(function(tokenSetting, caIndex){
                return <Buckets tokenSettings={tokenSetting} caIndex={caIndex} key={caIndex} />;
            })}
        </div>
    );
}
