import { notification } from "antd";
import PropTypes from "prop-types";
import React from "react";

import IconCopy from "./../../assets/icons/CopyOutline.svg";

interface CopyProps {
    textToShow?: string;
    textToCopy?: string;
    fastBTC?: boolean;
    typeUrl?: string;
}

type UrlType = "tx" | "address" | "";

export default function Copy(props: CopyProps): JSX.Element {
    const {
        textToShow = "",
        textToCopy = "",
        fastBTC = false,
        typeUrl = "",
    } = props;

    const onClick = (): void => {
        void navigator.clipboard.writeText(textToCopy);
        notification.open({
            message: "Copied",
            description: `${textToCopy} to clipboard`,
            placement: "bottomRight",
            onClose: () => {
                // Destruye el contenedor cuando se cierra la notificación
                notification.destroy();
            },
        });
    };

    let url_set: string =
        import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL +
        "/address/" +
        textToCopy;
    switch (typeUrl as UrlType) {
        case "tx":
            url_set =
                import.meta.env.REACT_APP_ENVIRONMENT_EXPLORER_URL +
                "/tx/" +
                textToCopy;
            break;
        default:
            break;
    }

    return (
        <>
            <div>
                {textToCopy && (
                    <img
                        onClick={onClick}
                        width={17}
                        height={17}
                        src={IconCopy}
                        alt=""
                        style={{
                            marginRight: 10,
                            cursor: "pointer",
                            flexGrow: "0",
                            marginTop: "3px",
                        }}
                    />
                )}
                <span style={{ display: fastBTC ? "flex" : "inline" }}>
                    <a
                        style={{
                            flexGrow: "1",
                            fontWeight: "bold",
                        }}
                        href={url_set}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {textToShow}
                    </a>
                </span>
            </div>
        </>
    );
}

Copy.propTypes = {
    textToShow: PropTypes.string,
    textToCopy: PropTypes.string,
    fastBTC: PropTypes.bool,
    typeUrl: PropTypes.string,
};
