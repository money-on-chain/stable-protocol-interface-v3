import "./Styles.scss";

import { Modal } from "antd";
import React from "react";

export interface TokenAmountInputOption {
    iconClassName?: string;
    label: string;
    value: string;
}

interface TokenAmountInputProps {
    balanceLabel?: string;
    balanceValue?: React.ReactNode;
    displayOnly?: boolean;
    feedbackMessage?: React.ReactNode;
    feedbackState?: "default" | "negative" | "neutral" | "positive";
    fiatLabel?: string;
    fiatValue?: React.ReactNode;
    inputValue?: string;
    label?: string;
    onMaxClick?: () => void;
    onQuickActionClick?: (percentage: number) => void;
    onTokenClick?: () => void;
    onTokenSelect?: (value: string) => void;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    quickActions?: number[];
    readOnly?: boolean;
    preserveSpaceWhenNoFeedback?: boolean;
    selectedTokenValue?: string;
    showApproxSymbol?: boolean;
    showMaxShortcut?: boolean;
    testId?: string;
    tokenIconClassName?: string;
    tokenLabel?: string;
    tokenOptions?: TokenAmountInputOption[];
    tokenSelectable?: boolean;
    validateError?: boolean;
}

function sanitizeValue(value: string): string {
    let formattedValue = value;

    if (formattedValue.length > 20) {
        return formattedValue.slice(0, 20);
    }

    if (formattedValue.startsWith(".")) {
        formattedValue = `0${formattedValue}`;
    }

    if (formattedValue.includes(",")) {
        formattedValue = formattedValue.replace(/,/g, "");
    }

    if (!formattedValue) {
        return "";
    }

    return Number.isNaN(Number(formattedValue))
        ? ""
        : formattedValue.replace(",", ".");
}

export default function TokenAmountInput({
    balanceLabel,
    balanceValue,
    displayOnly = false,
    feedbackMessage,
    feedbackState,
    fiatLabel = "USD",
    fiatValue,
    inputValue = "",
    label,
    onMaxClick,
    onQuickActionClick,
    onTokenClick,
    onTokenSelect,
    onValueChange,
    placeholder = "0.00",
    quickActions = [],
    readOnly = false,
    preserveSpaceWhenNoFeedback = false,
    selectedTokenValue,
    showApproxSymbol = true,
    showMaxShortcut = true,
    testId,
    tokenIconClassName,
    tokenLabel,
    tokenOptions = [],
    tokenSelectable = false,
    validateError = false,
}: TokenAmountInputProps): React.ReactElement {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);
    const isNonEditable = readOnly || displayOnly;
    const resolvedToken =
        tokenOptions.find((option) => option.value === selectedTokenValue) ||
        null;
    const resolvedTokenIconClassName =
        resolvedToken?.iconClassName || tokenIconClassName;
    const resolvedTokenLabel = resolvedToken?.label || tokenLabel;
    const hasTokenSelector = tokenSelectable && tokenOptions.length > 0;
    const hasInteractiveToken =
        tokenSelectable && (hasTokenSelector || !!onTokenClick);
    const resolvedFeedbackState =
        feedbackState || (validateError ? "negative" : "default");
    const shouldRenderFeedback =
        !!feedbackMessage || preserveSpaceWhenNoFeedback;

    React.useEffect(() => {
        const inputElement = inputRef.current;

        if (!inputElement) {
            return;
        }

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
        };

        inputElement.addEventListener("wheel", handleWheel, {
            passive: false,
        });

        return () => {
            inputElement.removeEventListener("wheel", handleWheel);
        };
    }, []);

    const handleValueChange = (value: string) => {
        if (isNonEditable || !onValueChange) {
            return;
        }

        onValueChange(sanitizeValue(value));
    };

    const handleTokenButtonClick = () => {
        if (!hasInteractiveToken) {
            return;
        }

        if (hasTokenSelector && onTokenSelect) {
            setIsSelectorOpen(true);
            return;
        }

        onTokenClick?.();
    };

    const TokenContent = (
        <>
            <div
                className={[
                    "tokenAmountInput__token-selectSlot",
                    !tokenSelectable &&
                        "tokenAmountInput__token-selectSlot--hidden",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <div className="icon-select-token tokenAmountInput__token-selectIcon"></div>
            </div>
            {resolvedTokenIconClassName ? (
                <div
                    className={[
                        resolvedTokenIconClassName,
                        "tokenAmountInput__token-icon",
                    ].join(" ")}
                ></div>
            ) : null}
            {resolvedTokenLabel ? (
                <div className="tokenAmountInput__token-label">
                    {resolvedTokenLabel}
                </div>
            ) : null}
        </>
    );

    return (
        <div
            className={[
                "tokenAmountInput",
                displayOnly && "tokenAmountInput--displayOnly",
                validateError && "tokenAmountInput--error",
                isNonEditable && "tokenAmountInput--readonly",
                tokenSelectable && "tokenAmountInput--token-selectable",
            ]
                .filter(Boolean)
                .join(" ")}
            data-testid={testId}
        >
            <div className="tokenAmountInput__field">
                {(label || showMaxShortcut || quickActions.length > 0) && (
                    <div className="tokenAmountInput__topRow">
                        {label ? (
                            <div className="tokenAmountInput__label">
                                {label}
                            </div>
                        ) : (
                            <div></div>
                        )}

                        {(showMaxShortcut || quickActions.length > 0) && (
                            <div className="tokenAmountInput__actions">
                                {quickActions.length > 0 ? (
                                    <div className="tokenAmountInput__quick-actions">
                                        {quickActions.map(
                                            (percentage, index) => (
                                                <React.Fragment
                                                    key={percentage}
                                                >
                                                    {index > 0 ? (
                                                        <span className="tokenAmountInput__divider">
                                                            |
                                                        </span>
                                                    ) : null}
                                                    <button
                                                        className="tokenAmountInput__quick-action"
                                                        onClick={() =>
                                                            onQuickActionClick?.(
                                                                percentage
                                                            )
                                                        }
                                                        type="button"
                                                    >
                                                        {`${percentage}%`}
                                                    </button>
                                                </React.Fragment>
                                            )
                                        )}
                                    </div>
                                ) : null}

                                {showMaxShortcut ? (
                                    <>
                                        {quickActions.length > 0 ? (
                                            <span className="tokenAmountInput__divider tokenAmountInput__divider--max">
                                                |
                                            </span>
                                        ) : null}
                                        <button
                                            className="tokenAmountInput__maxButton"
                                            onClick={onMaxClick}
                                            type="button"
                                        >
                                            MAX
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                <div className="tokenAmountInput__content">
                    <div className="tokenAmountInput__amountBlock">
                        <input
                            className="tokenAmountInput__value"
                            data-testid={
                                testId ? `${testId}-input` : undefined
                            }
                            inputMode="decimal"
                            onChange={(event) =>
                                handleValueChange(event.target.value)
                            }
                            placeholder={placeholder}
                            readOnly={isNonEditable}
                            ref={inputRef}
                            style={
                                isNonEditable
                                    ? { pointerEvents: "none" }
                                    : undefined
                            }
                            tabIndex={isNonEditable ? -1 : 0}
                            value={inputValue}
                        />
                    </div>

                    {(tokenIconClassName || tokenLabel) &&
                        (hasInteractiveToken ? (
                            <button
                                className="tokenAmountInput__tokenButton"
                                onClick={handleTokenButtonClick}
                                type="button"
                            >
                                {TokenContent}
                            </button>
                        ) : (
                            <div className="tokenAmountInput__tokenButton tokenAmountInput__tokenButton--static">
                                {TokenContent}
                            </div>
                        ))}
                </div>

                {(fiatValue || balanceLabel || balanceValue) && (
                    <div className="tokenAmountInput__bottomRow">
                        <div className="tokenAmountInput__fiatValue">
                            {fiatValue ? (
                                <>
                                    {showApproxSymbol ? "≈ " : ""}
                                    {fiatValue}
                                    {fiatLabel ? ` ${fiatLabel}` : ""}
                                </>
                            ) : null}
                        </div>

                        {(balanceLabel || balanceValue) && (
                            <div className="tokenAmountInput__balance">
                                {balanceLabel ? `${balanceLabel}: ` : ""}
                                {balanceValue}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {shouldRenderFeedback ? (
                <div
                    className={[
                        "tokenAmountInput__feedback",
                        `tokenAmountInput__feedback--${resolvedFeedbackState}`,
                        !feedbackMessage &&
                            "tokenAmountInput__feedback--placeholder",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    {feedbackMessage}
                </div>
            ) : null}

            {hasTokenSelector && onTokenSelect ? (
                <Modal
                    centered
                    className="tokenAmountInput__selectorModal"
                    footer={null}
                    onCancel={() => setIsSelectorOpen(false)}
                    open={isSelectorOpen}
                    title="Select a token"
                >
                    <div className="tokenAmountInput__optionList">
                        {tokenOptions.map((option) => (
                            <button
                                className={[
                                    "tokenAmountInput__option",
                                    option.value === selectedTokenValue &&
                                        "tokenAmountInput__option--selected",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                key={option.value}
                                onClick={() => {
                                    onTokenSelect(option.value);
                                    setIsSelectorOpen(false);
                                }}
                                type="button"
                            >
                                {option.iconClassName ? (
                                    <div className={option.iconClassName}></div>
                                ) : null}
                                <div className="tokenAmountInput__optionLabel">
                                    {option.label}
                                </div>
                            </button>
                        ))}
                    </div>
                </Modal>
            ) : null}
        </div>
    );
}
