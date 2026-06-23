import { notification } from "antd";
import type React from "react";

interface ExpandedDetailFieldProps {
    label: string;
    text: React.ReactNode;
    link?: string;
    enableCopy?: boolean;
    copyText?: string;
}

function ExpandedDetailField(
    props: ExpandedDetailFieldProps
): React.ReactElement {
    const copyValue =
        props.copyText || (typeof props.text === "string" ? props.text : "");
    const canCopy = Boolean(
        props.enableCopy && copyValue && copyValue !== "--"
    );

    const onCopy = (): void => {
        if (!canCopy) return;

        void navigator.clipboard.writeText(copyValue);
        notification.open({
            message: "Copied",
            description: `${copyValue} to clipboard`,
            placement: "bottomRight",
            onClose: () => {
                notification.destroy();
            },
        });
    };

    const content = props.link ? (
        <a
            className="LastOp__expanded__value-link"
            href={props.link}
            target="_blank"
            rel="noreferrer"
        >
            {props.text}
        </a>
    ) : (
        props.text
    );

    return (
        <div className="LastOp__expanded__field">
            <div className="LastOp__expanded__label">{props.label}</div>
            <div className="LastOp__expanded__value-row">
                <div className="LastOp__expanded__value">{content}</div>
                {canCopy && (
                    <button
                        type="button"
                        className="LastOp__expanded__copy"
                        onClick={onCopy}
                        aria-label={`Copy ${props.label}`}
                    >
                        <span className="icon-copy" aria-hidden="true" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default ExpandedDetailField;
