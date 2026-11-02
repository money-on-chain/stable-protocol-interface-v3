import { Modal } from "antd";
import React, { useMemo, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { CheckStatusGlobal } from "../../helpers/checkStatus";
import { invalidPriceBuckets } from "../../helpers/priceValidation";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings";
import GlobalStatusModal from "../Modals/GlobalStatus";
import { PRICE_INVALID_STATUS_CODE } from "../Modals/GlobalStatus/bucket";
import Buckets from "./buckets";
import MultiCollateral from "./multicollateral";
import TVL from "./tvl";

export default function Performance(): JSX.Element {
    const space = "\u00A0";
    const [showGlobalStatusModal, setShowGlobalStatusModal] =
        useState<boolean>(false);
    const { t } = useProjectTranslation();
    const { contractProtocolStatus, userBalance, blockNumber } =
        useWalletContext();
    const { checkerStatus } = CheckStatusGlobal();

    const status = useMemo(() => {
        if (!contractProtocolStatus.data || !userBalance.data) {
            return {
                statusLabel: "--",
                statusLabelClass: "status-neutral",
                statusText: "--",
                statusCode: [],
            };
        }

        // Asumo que checkerStatus usa esas data internamente
        const result = checkerStatus();

        // Buckets with an invalid price can't operate, whatever the coverage:
        // mark them with PRICE_INVALID_STATUS_CODE and override the summary.
        const invalidBuckets = invalidPriceBuckets(
            contractProtocolStatus.data,
            { CA: settings.tokens.CA.length, TP: settings.tokens.TP.length },
            contractProtocolStatus.isRetryingPeeks
        );
        if (!invalidBuckets.some(Boolean)) return result;

        return {
            ...result,
            statusLabel: t("performance.status.statusTitlePriceInvalid"),
            statusLabelClass: "status-negative",
            statusText: t("performance.status.statusDescriptionPriceInvalid"),
            statusCode: result.statusCode.map((code, caIndex) =>
                invalidBuckets[caIndex] ? PRICE_INVALID_STATUS_CODE : code
            ),
        };
    }, [
        contractProtocolStatus.data,
        contractProtocolStatus.isRetryingPeeks,
        userBalance.data,
        checkerStatus,
        t,
    ]);

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
                                    className={`stat-label  ${status.statusLabelClass}`}
                                >
                                    {status.statusLabel}
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
                                {status.statusText}
                            </div>
                            <button
                                className="aboutShowModal__button"
                                onClick={showModal}
                            >
                                <div className="icon__button__arrow buttonArrow"></div>
                                <div className="buttonText">
                                    {t("performance.status.buttonDetails")}
                                </div>
                            </button>
                            {showGlobalStatusModal && (
                                <Modal
                                    title={t(
                                        "performance.detailedStatus.modalTitle"
                                    )}
                                    width={800}
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
                                        statusCode={status.statusCode || []}
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
                return <Buckets caIndex={caIndex} key={caIndex} />;
            })}
        </div>
    );
}
