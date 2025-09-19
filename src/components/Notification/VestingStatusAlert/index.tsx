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
            className={`vesting-alert ${compact ? "vesting-alert--compact" : ""}`}
            message={
                <div className="vesting-alert__message">
                    <Text strong>Using Vesting Address</Text>
                    <Text>
                        VM: <Text code>{vestingAddress}</Text>
                    </Text>
                    <Text>
                        To use your regular wallet, toggle here to open{" "}
                        <Link to="/wallet/settings">wallet settings</Link>.
                    </Text>
                </div>
            }
            action={
                <div className="vesting-alert__action" onClick={stopEvent}>
                    <Text className="vesting-alert__label">Vesting</Text>
                    <Switch
                        checked
                        // Toggle + open modal
                        onChange={() => openWalletSettings()}
                        onClick={(_, e) => stopEvent(e as any)}
                        onMouseDown={stopEvent}
                        aria-label="Toggle vesting address"
                    />
                    <Button
                        size={compact ? "small" : "middle"}
                        type="link"
                        onClick={(e) => {
                            stopEvent(e);
                            onShowModalAccount(); // open modal only, no toggle
                        }}
                    >
                        Open wallet settings
                    </Button>
                </div>
            }
        />
    ) : (
        <Alert
            type="info"
            showIcon
            className={`vesting-alert ${compact ? "vesting-alert--compact" : ""}`}
            message={
                <div className="vesting-alert__message">
                    <Text strong>Not using a Vesting Address</Text>
                    <Text>
                        You can enable a Vesting Address to operate with your VM
                        when needed.
                    </Text>
                    <Text>
                        Toggle here to open{" "}
                        <Link to="/wallet/settings">wallet settings</Link>.
                    </Text>
                </div>
            }
            action={
                <div className="vesting-alert__action" onClick={stopEvent}>
                    <Text className="vesting-alert__label">Vesting</Text>
                    <Switch
                        checked={false}
                        // Toggle + open modal
                        onChange={() => openWalletSettings()}
                        onClick={(_, e) => stopEvent(e as any)}
                        onMouseDown={stopEvent}
                        aria-label="Toggle vesting address"
                    />
                    <Button
                        size={compact ? "small" : "middle"}
                        type="link"
                        onClick={(e) => {
                            stopEvent(e);
                            onShowModalAccount(); // open modal only, no toggle
                        }}
                    >
                        Open wallet settings
                    </Button>
                </div>
            }
        />
    );
}
