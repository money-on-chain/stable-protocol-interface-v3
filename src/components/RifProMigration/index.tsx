import "../TokenMigration/Modal/style.scss";

import { Button } from "antd";
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
    | "migrating"
    | "success";

export default function RifProMigration(): React.ReactElement | null {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [step, setStep] = useState<MigrationStep>("details");
    const { t, i18n } = useProjectTranslation();
    const {
        interfaceAllowUseRifProMigrator,
        interfaceMigrateRifPro,
        userBalance,
    } = useWalletContext();
    const legacyRifPro = userBalance.data?.rifProLegacy;

    if (!legacyRifPro) {
        return null;
    }

    const closeDialog = () => {
        setStep("details");
        setIsDialogOpen(false);
    };

    const reportMigrationError = (error: unknown) => {
        console.error("RIFPRO migration failed", error);
    };

    const migrate = async () => {
        try {
            if ((legacyRifPro.allowance ?? 0n) < legacyRifPro.balance) {
                await interfaceAllowUseRifProMigrator(
                    legacyRifPro.balance,
                    () => setStep("authorizing"),
                    () => undefined,
                    reportMigrationError
                );
            }
            setStep("migrating");
            await interfaceMigrateRifPro(
                () => undefined,
                () => undefined,
                reportMigrationError
            );
            setStep("success");
        } catch (error) {
            reportMigrationError(error);
        }
    };

    return (
        <div className="ShowTokenMigration">
            <div className="NotificationMigration">
                <div className="Information">
                    {t("rifProMigration.text1")}
                    <span
                        className="swapNow"
                        onClick={() => setIsDialogOpen(true)}
                        style={{ cursor: "pointer" }}
                    >
                        {t("rifProMigration.text2")}
                    </span>
                    <div data-testid="rifpro-migrator-legacy-balance">
                        {PrecisionNumbers({
                            amount: legacyRifPro.balance,
                            token: TokenSettings("TC_0"),
                            decimals: 4,
                            i18n,
                            compact: true,
                        })} {t("rifProMigration.legacyToken")}
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
            >
                <div className="Content" data-testid="rifpro-migrator-dialog">
                    <div className="Title">
                        {t(
                            step === "details"
                                ? "rifProMigration.modalTitle1"
                                : "rifProMigration.modalTitle2"
                        )}
                    </div>
                    {step === "details" && <p>{t("rifProMigration.explanation1")}</p>}
                    {step === "confirm" && (
                        <div data-testid="rifpro-migrator-confirm-container">
                            <p>{t("rifProMigration.explanation2")}</p>
                        </div>
                    )}
                    {step === "authorizing" && (
                        <div data-testid="rifpro-migrator-allowance-sign-container">
                            <p>{t("swapModal.authorizing")}</p>
                        </div>
                    )}
                    {step === "migrating" && (
                        <div data-testid="rifpro-migrator-migration-sign-container">
                            <p>{t("swapModal.migrating")}</p>
                        </div>
                    )}
                    {step === "success" && (
                        <div data-testid="rifpro-migrator-token-migration-success-container">
                            <p>{t("rifProMigration.operationSuccessful")}</p>
                        </div>
                    )}
                    <div className="cta-options-group">
                        {step === "details" && (
                            <Button data-testid="rifpro-migrator-dialog-primary-action" type="primary" onClick={() => setStep("confirm")}>
                                {t("defaultCTA.buttonSubmit")}
                            </Button>
                        )}
                        {step === "confirm" && (
                            <Button data-testid="rifpro-migrator-dialog-primary-action" type="primary" disabled={legacyRifPro.balance === 0n} onClick={() => void migrate()}>
                                {t("defaultCTA.buttonExchange")}
                            </Button>
                        )}
                        {step === "success" && (
                            <Button data-testid="rifpro-migrator-dialog-close-on-success" type="primary" onClick={closeDialog}>
                                {t("defaultCTA.buttonClose")}
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
