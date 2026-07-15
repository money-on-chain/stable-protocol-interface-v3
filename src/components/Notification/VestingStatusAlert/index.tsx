import "./Styles.scss";

import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";
import { AppNotification } from "../../Notifications";

type Props = {
    compact?: boolean;
};

export default function VestingStatusAlert({
    compact = false,
}: Props): React.ReactElement {
    const { t } = useProjectTranslation();

    const { vestingAddress, vestingOn, toggleVesting, onShowModalAccount } =
        useWalletContext();

    const isOn = vestingOn; // Source of truth from context

    /** Prevents parent click bubbling */
    const stopEvent = (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    /** Toggle vesting and then open wallet settings modal */
    const openWalletSettings = (e?: React.SyntheticEvent) => {
        if (e) stopEvent(e);
        toggleVesting();
        onShowModalAccount();
    };

    /**
     * Renders an inline notification using the AppNotification system.
     * This replaces the previous Ant Design Alert component completely.
     */
    return isOn ? (
        <AppNotification
            type="info"
            deliveryMode="inline"
            dismissible={false}
            title={t("vesting.alert.vmEnabled.title")}
            content={
                <div className="alert__message">
                    <div className="alert__text">
                        {t("vesting.alert.vmEnabled.text")}
                    </div>

                    <div className="alert__label">
                        {t("vesting.alert.vmEnabled.addressLabel")}{" "}
                        <strong>
                            <span className="alert__address">
                                {vestingAddress}
                            </span>
                        </strong>
                    </div>
                </div>
            }
            actions={[
                {
                    key: "edit-vesting",
                    label: t("vesting.alert.vmEnabled.cta"),
                    type: "primary",
                    onClick: openWalletSettings,
                },
            ]}
            notificationId="vesting-status-alert"
            lingerMs={4000}
        />
    ) : (
        <AppNotification
            type="info"
            deliveryMode="inline"
            dismissible={false}
            title={t("vesting.alert.vmDisabled.title")}
            content={
                <div className="alert__message">
                    <div className="alert__text">
                        {t("vesting.alert.vmDisabled.text")}
                    </div>
                </div>
            }
            actions={[
                {
                    key: "enable-vesting",
                    label: t("vesting.alert.vmDisabled.cta"),
                    type: "primary",
                    onClick: openWalletSettings,
                },
            ]}
            notificationId="vesting-status-alert"
            lingerMs={4000}
        />
    );
}
