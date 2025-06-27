import React, { useContext, useState, useEffect } from "react";
import { Modal } from "antd";

import { useProjectTranslation } from "../../helpers/translations";
import { AuthenticateContext } from "../../context/Auth";
import { CheckStatusGlobal } from "../../helpers/checkStatus";
import GlobalStatusModal from "../Modals/GlobalStatus";
import settings from "../../settings/settings.json";
import Buckets from "./buckets";
import TVL from "./tvl";
import MultiCollateral from "./multicollateral";

export default function Performance() {
    const space = "\u00A0";
    const [statusLabel, setStatusLabel] = useState("--");
    const [statusText, setStatusText] = useState("--");
    const [statusLabelClass, setStatusLabelClass] = useState("");
    const [statusCode, setStatusCode] = useState([]);
    const [showGlobalStatusModal, setShowGlobalStatusModal] = useState(false);
    const { t } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const { checkerStatus } = CheckStatusGlobal();
    useEffect(() => {
        if ((auth.contractStatusData, auth.userBalanceData)) {
            const { statusLabel, statusLabelClass, statusText, statusCode } =
                checkerStatus();
            setStatusLabel(statusLabel);
            setStatusText(statusText);
            setStatusLabelClass(statusLabelClass);
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
                    </div>

                    <div className="card-content">
                        <div className="coll-1">
                            <div className="stat-icon">
                                <div className="status-lights-container">
                                    <div
                                        className={`icon-status-lights-lamp icon-status-lights-${statusLabelClass}`}
                                    ></div>
                                    <div className="icon-status-lights"></div>
                                </div>
                                <div
                                    className={`stat-label  ${statusLabelClass}`}
                                >
                                    {statusLabel}
                                    <div className="block-info">
                                        {t("performance.status.showingBlock")}
                                        {space}
                                        {auth.contractStatusData
                                            ? BigInt(
                                                  auth.contractStatusData
                                                      .blockHeight
                                              ).toString()
                                            : "--"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="coll-2">
                            <div className="status-text">{statusText}</div>
                            <button
                                className="aboutShowModal__button"
                                onClick={showModal}
                            >
                                <div className="icon__button__arrow buttonArrow"></div>
                                <div className="buttonText">View Details</div>
                                {/* <div className="logo-status"></div> */}
                            </button>
                            {showGlobalStatusModal && (
                                <Modal
                                    title={"Global Status"}
                                    width={505}
                                    open={true}
                                    onCancel={hideModal}
                                    footer={null}
                                    closable={false}
                                    className="aboutGlobalStatus__modal ModalAccount "
                                    centered={true}
                                    maskStyle={{}}
                                >
                                    <GlobalStatusModal
                                        hideModal={hideModal}
                                        statusCode={statusCode}
                                    />
                                </Modal>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Total Value Locked */}
            <TVL key={"tvl"} />

            {/* MultiCollateral */}
            <MultiCollateral key={"multicollateral"} />

            {/* Buckets */}
            {settings.tokens.CA.map(function (tokenSetting, caIndex) {
                return (
                    <Buckets
                        tokenSettings={tokenSetting}
                        caIndex={caIndex}
                        key={caIndex}
                    />
                );
            })}
        </div>
    );
}
