import "./Styles.scss";

import { Alert, message, Typography } from "antd";
import React from "react";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";

const { Text } = Typography;

type Props = {
    compact?: boolean;
};

export default function VestingStatusAlert({
    compact = false,
}: Props): React.ReactElement {
    const { t } = useProjectTranslation();

    const { vestingAddress, vestingOn, toggleVesting, onShowModalAccount } =
        useWalletContext();

    const isOn = vestingOn; // use vestingOn from context as source of truth

    // Prevent accidental navigation if parent is clickable
    const stopEvent = (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    /** Toggle vesting and then open the wallet settings modal */
    const openWalletSettings = (e?: React.SyntheticEvent) => {
        if (e) stopEvent(e);
        try {
            toggleVesting(); // flip first
            onShowModalAccount(); // then open modal
        } catch {
            message.info("Open wallet settings to change the vesting address.");
        }
    };

    return isOn ? (
        <Alert
            type="warning"
            showIcon
            className={`alert alert-info`}
            message={
                <div className="alert__message">
                    <div className="alert__title">
                        {t(`vesting.alert.vmEnabled.title`)}
                    </div>{" "}
                    <div className="alert__text">
                        {t(`vesting.alert.vmEnabled.text`)}
                    </div>
                    <div className="alert__label">
                        {t(`vesting.alert.vmEnabled.addressLabel`)}{" "}
                        <span className="alert__address">{vestingAddress}</span>
                    </div>
                </div>
            }
            action={
                <div className="alert__switch" onClick={stopEvent}>
                    <div className="alert__switch__button">
                        <button
                            className="button button--small"
                            onClick={(e) => {
                                stopEvent(e);
                                openWalletSettings();
                            }}
                            onMouseDown={stopEvent}
                            aria-label="Open wallet settings"
                        >
                            {t(`vesting.alert.vmEnabled.cta`)}
                        </button>
                    </div>
                </div>
            }
        />
    ) : (
        <Alert
            type="info"
            showIcon
            className={`alert alert-info`}
            message={
                <div className="alert__message">
                    <div className="alert__title">
                        {t(`vesting.alert.vmDisabled.title`)}
                    </div>
                    <div className="alert__text">
                        {t(`vesting.alert.vmDisabled.text`)}
                    </div>
                </div>
            }
            action={
                <div className="alert__switch" onClick={stopEvent}>
                    <div className="alert__switch__button">
                        <button
                            className="button button--small"
                            onClick={(e) => {
                                stopEvent(e);
                                openWalletSettings();
                            }}
                            onMouseDown={stopEvent}
                            aria-label="Open wallet settings"
                        >
                            {t(`vesting.alert.vmDisabled.cta`)}
                        </button>
                    </div>
                </div>
            }
        />
    );
}
