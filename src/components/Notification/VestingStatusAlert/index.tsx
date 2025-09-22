import React from "react";
import { Alert, Button, Switch, Typography, message } from "antd";
import { Link } from "react-router-dom";
import { useWalletContext } from "../../../context/Wallet";
import "./Styles.scss";

const { Text } = Typography;

type Props = {
    compact?: boolean;
};

export default function VestingStatusAlert({
    compact = false,
}: Props): React.ReactElement {
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
                    <div className="alert__title">Using Vesting Address</div>{" "}
                    <div className="alert__text">
                        You are using Vesting Address. You can disable vesting
                        address with the switch.{" "}
                    </div>
                    <div className="alert__text">
                        VM: <span code>{vestingAddress}</span>
                    </div>
                    {/* <div className="alert__title">
                        To use your regular wallet, toggle here to open{" "}
                        <Link to="/wallet/settings">wallet settings</Link>.
                    </div> */}
                </div>
            }
            action={
                <div className="alert__switch" onClick={stopEvent}>
                    {/* <div className="vesting-alert__label">
                        Use Vesting Address
                    </div> */}
                    {/* <div className="alert__switch__button">
                        <Switch
                            checked
                            // Toggle + open modal
                            onChange={() => openWalletSettings()}
                            onClick={(_, e) => stopEvent(e as any)}
                            onMouseDown={stopEvent}
                            aria-label="Toggle vesting address"
                        />
                    </div>{" "} */}
                    <div className="alert__switch__button">
                        <button
                            className="button button--small"
                            type="default" // or "primary" if you want it highlighted
                            onClick={(e) => {
                                stopEvent(e);
                                openWalletSettings();
                            }}
                            onMouseDown={stopEvent}
                            aria-label="Open wallet settings"
                        >
                            Disable Vesting Address
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
                        Not using a Vesting Address
                    </div>
                    <div className="alert__text">
                        ou can enable the Vesting Address in the wallet
                        configuration section or by clicking the “Enable Vesting
                        Address” button.
                    </div>
                    {/* <div>
                        Toggle here to open{" "}
                        <Link to="/wallet/settings">wallet settings</Link>.
                    </div> */}
                </div>
            }
            action={
                <div className="alert__switch" onClick={stopEvent}>
                    {/* <div className="alert__switch__label">
                        Use Vesting Address
                    </div>{" "} */}
                    {/* <div className="alert__switch__button">
                        <Switch
                            checked={false}
                            // Toggle + open modal
                            onChange={() => openWalletSettings()}
                            onClick={(_, e) => stopEvent(e as any)}
                            onMouseDown={stopEvent}
                            aria-label="Toggle vesting address"
                        />{" "}
                    </div> */}
                    <div className="alert__switch__button">
                        <button
                            className="button button--small"
                            type="default" // or "primary" if you want it highlighted
                            onClick={(e) => {
                                stopEvent(e);
                                openWalletSettings();
                            }}
                            onMouseDown={stopEvent}
                            aria-label="Open wallet settings"
                        >
                            Enable Vesting Address
                        </button>
                    </div>
                    {/* <Button
                        size={compact ? "small" : "middle"}
                        type="link"
                        onClick={(e) => {
                            stopEvent(e);
                            onShowModalAccount(); // open modal only, no toggle
                        }}
                    >
                        Open wallet settings
                    </Button> */}
                </div>
            }
        />
    );
}
