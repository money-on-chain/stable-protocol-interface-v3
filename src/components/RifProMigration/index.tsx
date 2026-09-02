import "./Styles.scss";

import Modal from "antd/lib/modal/Modal";
import React, { useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

type MigrationStep =
    | "details"
    | "confirm"
    | "authorizing"
    | "authorizationPending"
    | "migrating"
    | "migrationPending"
    | "success"
    | "error";

export default function RifProMigration(): React.ReactElement | null {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [step, setStep] = useState<MigrationStep>("details");
    const { t, i18n } = useProjectTranslation();
    const { interfaceAllowUseRifProMigrator, interfaceMigrateRifPro, userBalance } = useWalletContext();
    const legacyRifPro = userBalance.data?.rifProLegacy;
    const isProcessing = ["authorizing", "authorizationPending", "migrating", "migrationPending"].includes(step);

    if (!legacyRifPro) {
        return null;
    }

    const closeDialog = () => {
        setStep("details");
        setIsDialogOpen(false);
    };

    const reportMigrationError = (error: unknown) => {
        console.error("RIFPRO migration failed", error);
        setStep("error");
    };

    const migrate = async () => {
        try {
            if ((legacyRifPro.allowance ?? 0n) < legacyRifPro.balance) {
                setStep("authorizing");
                await interfaceAllowUseRifProMigrator(
                    legacyRifPro.balance,
                    () => setStep("authorizationPending"),
                    () => undefined,
                    reportMigrationError
                );
            }
            setStep("migrating");
            let migrationFailed = false;
            await interfaceMigrateRifPro(
                () => setStep("migrationPending"),
                () => undefined,
                (error) => {
                    migrationFailed = true;
                    reportMigrationError(error);
                }
            );
            if (!migrationFailed) {
                setStep("success");
            }
        } catch (error) {
            reportMigrationError(error);
        }
    };

    return (
        <div className="ShowTokenMigration">
            <div className="NotificationMigration">
                <div className="Information">
                    {t("rifProMigration.text1")}
                    <span className="swapNow" onClick={() => setIsDialogOpen(true)} style={{ cursor: "pointer" }}>
                        {t("rifProMigration.text2")}
                    </span>
                    <div data-testid="rifpro-migrator-legacy-balance">
                        {PrecisionNumbers({
                            amount: legacyRifPro.balance,
                            token: TokenSettings("TC_0"),
                            decimals: 4,
                            i18n,
                            compact: true,
                        })}{" "}
                        {t("rifProMigration.legacyToken")}
                    </div>
                </div>
                <div className="cta-options-group">
                    <button
                        data-testid="rifpro-migrator-start"
                        type="button"
                        className="button"
                        onClick={() => setIsDialogOpen(true)}
                    >
                        {t("rifProMigration.button")}
                    </button>
                </div>
            </div>
            <Modal
                title=""
                width={560}
                open={isDialogOpen}
                onCancel={closeDialog}
                footer={null}
                className="ModalTokenMigration"
                centered={true}
                closable={!isProcessing}
                keyboard={!isProcessing}
                maskClosable={!isProcessing}
            >
                <div className="Content" data-testid="rifpro-migrator-dialog">
                    <div className="Title">{t(`rifProMigration.titles.${step}`)}</div>
                    <div className="Body">
                        {step === "details" && <p>{t("rifProMigration.explanation1")}</p>}
                        {step === "confirm" && (
                            <div data-testid="rifpro-migrator-confirm-container">
                                <p>{t("rifProMigration.explanation2")}</p>
                                <div className="MigrationAssets">
                                    <div className="MigrationAssetCard">
                                        <div className="MigrationAssetLabel">{t("rifProMigration.exchanging")}</div>
                                        <div className="MigrationAssetContent">
                                            <div
                                                className="icon-token-RIFP_LEGACY MigrationTokenIcon"
                                                aria-hidden="true"
                                            ></div>
                                            <div className="MigrationAssetDetails">
                                                <div className="MigrationAssetAmount">
                                                    {PrecisionNumbers({
                                                        amount: legacyRifPro.balance,
                                                        token: TokenSettings("TC_0"),
                                                        decimals: 4,
                                                        i18n,
                                                        compact: true,
                                                    })}
                                                </div>
                                                <div className="MigrationAssetToken">
                                                    {t("rifProMigration.legacyToken")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="MigrationArrow" aria-hidden="true"></div>
                                    <div className="MigrationAssetCard">
                                        <div className="MigrationAssetLabel">{t("rifProMigration.receiving")}</div>
                                        <div className="MigrationAssetContent">
                                            <div
                                                className="icon-token-RIFP MigrationTokenIcon"
                                                aria-hidden="true"
                                            ></div>
                                            <div className="MigrationAssetDetails">
                                                <div className="MigrationAssetAmount">
                                                    {PrecisionNumbers({
                                                        amount: legacyRifPro.balance,
                                                        token: TokenSettings("TC_0"),
                                                        decimals: 4,
                                                        i18n,
                                                        compact: true,
                                                    })}
                                                </div>
                                                <div className="MigrationAssetToken">
                                                    {t("rifProMigration.newToken")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {step === "authorizing" && (
                            <div data-testid="rifpro-migrator-allowance-sign-container">
                                <div className="tx-logo-status">
                                    <i className="icon-tx-signWallet"></i>
                                </div>
                                <p className="Center">{t("rifProMigration.authorizationSignText")}</p>
                            </div>
                        )}
                        {step === "authorizationPending" && (
                            <div data-testid="rifpro-migrator-allowance-waiting-container">
                                <div className="tx-logo-status">
                                    <i className="icon-tx-waiting rotate"></i>
                                </div>
                                <p className="Center">{t("rifProMigration.authorizationPendingText")}</p>
                            </div>
                        )}
                        {step === "migrating" && (
                            <div data-testid="rifpro-migrator-migration-sign-container">
                                <div className="tx-logo-status">
                                    <i className="icon-tx-signWallet"></i>
                                </div>
                                <p className="Center">{t("rifProMigration.migrationSignText")}</p>
                            </div>
                        )}
                        {step === "migrationPending" && (
                            <div data-testid="rifpro-migrator-migration-waiting-container">
                                <div className="tx-logo-status">
                                    <i className="icon-tx-waiting rotate"></i>
                                </div>
                                <p className="Center">{t("rifProMigration.migrationPendingText")}</p>
                            </div>
                        )}
                        {step === "success" && (
                            <div data-testid="rifpro-migrator-token-migration-success-container">
                                <div className="tx-logo-status">
                                    <i className="icon-tx-success"></i>
                                </div>
                                <p className="Center">{t("rifProMigration.operationSuccessful")}</p>
                            </div>
                        )}
                        {step === "error" && (
                            <div data-testid="rifpro-migrator-token-migration-error-container">
                                <div className="tx-logo-status">
                                    <i className="icon-tx-error"></i>
                                </div>
                                <p className="Center">{t("rifProMigration.operationFailed")}</p>
                            </div>
                        )}
                    </div>
                    <div className="cta-container">
                        <div className="cta-options-group">
                            {step === "details" && (
                                <button
                                    className="button secondary"
                                    data-testid="rifpro-migrator-dialog-cancel"
                                    type="button"
                                    onClick={closeDialog}
                                >
                                    {t("defaultCTA.buttonCancel")}
                                </button>
                            )}
                            {step === "details" && (
                                <button
                                    className="button"
                                    data-testid="rifpro-migrator-dialog-primary-action"
                                    type="button"
                                    onClick={() => setStep("confirm")}
                                >
                                    {t("defaultCTA.buttonSubmit")}
                                </button>
                            )}
                            {step === "confirm" && (
                                <button
                                    className="button secondary"
                                    data-testid="rifpro-migrator-dialog-cancel"
                                    type="button"
                                    onClick={closeDialog}
                                >
                                    {t("defaultCTA.buttonCancel")}
                                </button>
                            )}
                            {step === "confirm" && (
                                <button
                                    className="button"
                                    data-testid="rifpro-migrator-dialog-primary-action"
                                    type="button"
                                    disabled={legacyRifPro.balance === 0n}
                                    onClick={() => void migrate()}
                                >
                                    {t("defaultCTA.buttonExchange")}
                                </button>
                            )}
                            {step === "success" && (
                                <button
                                    className="button"
                                    data-testid="rifpro-migrator-dialog-close-on-success"
                                    type="button"
                                    onClick={closeDialog}
                                >
                                    {t("defaultCTA.buttonClose")}
                                </button>
                            )}
                            {step === "error" && (
                                <button
                                    className="button"
                                    data-testid="rifpro-migrator-dialog-close-on-error"
                                    type="button"
                                    onClick={closeDialog}
                                >
                                    {t("defaultCTA.buttonClose")}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
