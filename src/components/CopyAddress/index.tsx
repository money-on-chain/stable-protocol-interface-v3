import "./Styles.scss";

import React, { useEffect, useRef, useState } from "react";

import { useProjectTranslation } from "../../helpers/translations";

interface CopyAddressProps {
    address?: string;
    showAddress?: boolean;
    type?: string;
}

type AddressType = "tx" | "address" | "";

export default function CopyAddress(props: CopyAddressProps): JSX.Element {
    const { t } = useProjectTranslation();
    const [copiedAt, setCopiedAt] = useState<number | null>(null);
    const hideCopiedTimer = useRef<number | null>(null);

    const { address = "", showAddress = true, type = "" } = props;

    const truncateAddress = (address: string): string => {
        if (address === "") return "";
        return (
            address.substring(0, 6) +
            "..." +
            address.substring(address.length - 4, address.length)
        );
    };

    useEffect(
        () => () => {
            if (hideCopiedTimer.current !== null) {
                window.clearTimeout(hideCopiedTimer.current);
            }
        },
        []
    );

    const onClick = async (
        event: React.MouseEvent<HTMLButtonElement>
    ): Promise<void> => {
        event.stopPropagation();

        try {
            await navigator.clipboard.writeText(address);
            setCopiedAt(Date.now());

            if (hideCopiedTimer.current !== null) {
                window.clearTimeout(hideCopiedTimer.current);
            }
            hideCopiedTimer.current = window.setTimeout(() => {
                setCopiedAt(null);
                hideCopiedTimer.current = null;
            }, 1400);
        } catch (error) {
            console.error("Could not copy address to clipboard", error);
        }
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
        <div
            className={`address-section${
                showAddress ? "" : " address-section--copyOnly"
            }`}
        >
            {showAddress ? (
                <span className="address tx-id-address">
                    <a href={urlExplorer} target="_blank" rel="noreferrer">
                        {truncateAddress(address)}
                    </a>
                </span>
            ) : null}
            <button
                aria-label={t("feedback.clipboardAction")}
                className="copyAddress__button"
                onClick={(event) => void onClick(event)}
                type="button"
            >
                <i className="icon-copy" aria-hidden="true"></i>
                {copiedAt !== null ? (
                    <span
                        className="copyAddress__copied"
                        key={copiedAt}
                        role="status"
                    >
                        {t("feedback.clipboardCopy")}
                    </span>
                ) : null}
            </button>
        </div>
    );
}
