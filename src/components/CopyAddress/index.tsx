import { notification } from "antd";
import PropTypes from "prop-types";
import React from "react";

import { useProjectTranslation } from "../../helpers/translations";

interface CopyAddressProps {
    address?: string;
    type?: string;
}

type AddressType = "tx" | "address" | "";

export default function CopyAddress(props: CopyAddressProps): JSX.Element {
    const { t } = useProjectTranslation();

    const { address = "", type = "" } = props;

    const truncateAddress = (address: string): string => {
        if (address === "") return "";
        return (
            address.substring(0, 6) +
            "..." +
            address.substring(address.length - 4, address.length)
        );
    };

    const onClick = (): void => {
        navigator.clipboard.writeText(address);
        notification.open({
            message: t("feedback.clipboardCopy"),
            description: `${address} ` + t("feedback.clipboardTo"),
            placement: "bottomRight",
            onClose: () => {                
                notification.destroy();
            },
        });
    };

    let urlExplorer: string =
        import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL +
        "/address/" +
        address;
    switch (type as AddressType) {
        case "tx":
            urlExplorer =
                import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL +
                "/tx/" +
                address;
            break;
        default:
            break;
    }

    return (
        <>
            <div className="address-section">
                <span className="address tx-id-address">
                    <a href={urlExplorer} target="_blank" rel="noreferrer">
                        {truncateAddress(address)}
                    </a>
                </span>
                <a onClick={onClick}>
                    <i className="icon-copy"></i>
                </a>
            </div>
        </>
    );
}

CopyAddress.propTypes = {
    address: PropTypes.string,
    type: PropTypes.string,
};
