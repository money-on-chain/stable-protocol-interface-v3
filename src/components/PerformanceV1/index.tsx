import { Modal } from "antd";
import React, { useMemo, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { systemStatusV1 } from "../../helpers/performanceV1";
import { useProjectTranslation } from "../../helpers/translations";
import GlobalStatusModalV1 from "../Modals/GlobalStatusV1";
import CollateralV1 from "./collateral";
import GlobalMetricsV1 from "./globalMetrics";
import { BproMetricsV1, DocMetricsV1 } from "./tokens";
import TVLV1 from "./tvl";

// v1 port of components/Performance, following the same card layout (system
// status + dataGroup metric cards) but sourced from contractProtocolStatusV1's
// flat, single-bucket data instead of v3's caIndex-indexed one. The details
// modal mirrors v3's GlobalStatusModal (see components/Modals/GlobalStatusV1),
// scaled down to v1's single collateral bucket (see helpers/performanceV1.ts's
// systemStatusV1 for the mint/redeem availability per coverage band).
export default function PerformanceV1(): React.ReactElement {
    const space = " ";
    const [showGlobalStatusModal, setShowGlobalStatusModal] =
        useState<boolean>(false);
    const { t } = useProjectTranslation();
    const { contractProtocolStatusV1, blockNumber } = useWalletContext();

    const status = useMemo(
        () => systemStatusV1(contractProtocolStatusV1.data),
        [contractProtocolStatusV1.data]
    );

    const showModal = (): void => {
        setShowGlobalStatusModal(true);
    };

    const hideModal = (): void => {
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
                                        className={`icon-status-lights-lamp icon-status-lights-${status.statusLabelClass}`}
                                    ></div>
                                    <div className="icon-status-lights"></div>
                                </div>
                                <div
                                    className={`stat-label ${status.statusLabelClass}`}
                                >
                                    {t(status.titleKey)}
                                    <div className="block-info">
                                        {t("performance.status.showingBlock")}
                                        {space}
                                        {blockNumber
                                            ? blockNumber.toString()
                                            : "--"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="coll-2">
                            <div className="status-text">
                                {t(status.descriptionKey)}
                            </div>
                            <button
                                className="aboutShowModal__button"
                                onClick={showModal}
                            >
                                <div className="icon__button__arrow buttonArrow"></div>
                                <div className="buttonText">
                                    {t("performance.v1.buttonDetails")}
                                </div>
                            </button>
                            {showGlobalStatusModal && (
                                <Modal
                                    title={t(
                                        "performance.v1.detailedStatus.modalTitle"
                                    )}
                                    width={505}
                                    open={true}
                                    onCancel={hideModal}
                                    footer={null}
                                    closable={false}
                                    className="aboutGlobalStatus__modal ModalAccount "
                                    centered={true}
                                    maskStyle={{}}
                                >
                                    <GlobalStatusModalV1
                                        hideModal={hideModal}
                                        status={status}
                                    />
                                </Modal>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Total Value Locked */}
            <TVLV1 />

            {/* Coverage / target coverage / leverage */}
            <GlobalMetricsV1 />

            {/* DOC metrics */}
            <DocMetricsV1 />

            {/* Collateral assets share a row on desktop */}
            <div className="perfAssetRowV1">
                <CollateralV1 />
                <BproMetricsV1 />
            </div>
        </div>
    );
}
