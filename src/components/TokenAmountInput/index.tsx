import "./Styles.scss";

import { Modal } from "antd";
import React from "react";

import { getCurrenciesDetail, TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

export interface TokenAmountInputOption {
    displayLabel?: string;
    icon?: React.ReactNode;
    iconClassName?: string;
    label: string;
    value: string;
}

interface TokenAmountInputProps {
    action?: string;
    balance?: React.ReactNode;
    balanceLabel?: string;
    balanceText?: string;
    balanceValue?: React.ReactNode;
    currencyOptions?: string[];
    disabled?: boolean;
    "data-testid"?: string;
    displayOnly?: boolean;
    feedbackMessage?: React.ReactNode;
    feedbackState?: "default" | "negative" | "neutral" | "positive";
    getFiatEquivalent?: (value: number) => bigint | React.ReactNode;
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
    setAddTotalAvailable?: () => void;
    selectorTestId?: string;
    testId?: string;
    title?: string;
    tokenIconClassName?: string;
    tokenLabel?: string;
    tokenOptions?: TokenAmountInputOption[];
    tokenSelectable?: boolean;
    validateError?: boolean;
    value?: string;
    onChange?: (value: string) => void;
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
    action,
    balance,
    balanceLabel,
    balanceText,
    balanceValue,
    currencyOptions = [],
    disabled = false,
    "data-testid": dataTestId,
    displayOnly = false,
    feedbackMessage,
    feedbackState,
    getFiatEquivalent,
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
    setAddTotalAvailable,
    selectorTestId,
    selectedTokenValue,
    showApproxSymbol = true,
    showMaxShortcut = true,
    testId,
    title,
    tokenIconClassName,
    tokenLabel,
    tokenOptions = [],
    tokenSelectable = false,
    validateError = false,
    value,
    onChange,
}: TokenAmountInputProps): React.ReactElement {
    const { i18n, ns, t } = useProjectTranslation();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);
    const isNonEditable = readOnly || displayOnly;
    const resolvedSelectedTokenValue = selectedTokenValue || value;
    const resolvedOnTokenSelect = onTokenSelect || onChange;
    const tokenOptionsFromCurrencies = React.useMemo<
        TokenAmountInputOption[]
    >(() => {
        if (!currencyOptions.length || !action) {
            return [];
        }

        const currencies = getCurrenciesDetail()
            .filter((currency) => currencyOptions.includes(currency.value))
            .map((currency) => ({
                abbreviation: String(
                    t(`${action}.tokens.${currency.value}.abbr`, { ns })
                ),
                label: String(
                    t(`${action}.tokens.${currency.value}.abbr`, { ns })
                ),
                displayLabel: String(
                    t(`${action}.tokens.${currency.value}.label`, {
                        ns,
                    })
                ),
                icon: currency.image,
                value: currency.value,
            }));

        const alreadyAdded: string[] = [];

        return currencies.filter((currency) => {
            if (alreadyAdded.includes(currency.abbreviation)) {
                return false;
            }

            alreadyAdded.push(currency.abbreviation);
            return true;
        });
    }, [action, currencyOptions, ns, t]);
    const resolvedTokenOptions = tokenOptions.length
        ? tokenOptions
        : tokenOptionsFromCurrencies;
    const resolvedToken =
        resolvedTokenOptions.find(
            (option) => option.value === resolvedSelectedTokenValue
        ) || null;
    const resolvedTokenIconClassName =
        resolvedToken?.iconClassName || tokenIconClassName;
    const resolvedTokenLabel = resolvedToken?.label || tokenLabel;
    const hasTokenSelector =
        tokenSelectable &&
        resolvedTokenOptions.length > 0 &&
        !!resolvedOnTokenSelect;
    const hasInteractiveToken =
        !disabled && tokenSelectable && (hasTokenSelector || !!onTokenClick);
    const resolvedFeedbackState =
        feedbackState || (validateError ? "negative" : "default");
    const shouldRenderFeedback =
        !!feedbackMessage || preserveSpaceWhenNoFeedback;
    const sanitizedInputValue = sanitizeValue(inputValue);
    const numericInputValue = sanitizedInputValue
        ? Number(sanitizedInputValue)
        : 0;
    const rawFiatValue = getFiatEquivalent
        ? getFiatEquivalent(
              Number.isNaN(numericInputValue) ? 0 : numericInputValue
          )
        : fiatValue;
    const resolvedFiatValue =
        typeof rawFiatValue === "bigint" ? (
            <PrecisionNumbers
                amount={rawFiatValue}
                compact
                decimals={2}
                i18n={i18n}
                isUSD
                token={TokenSettings("CA_0")}
            />
        ) : (
            rawFiatValue
        );
    const resolvedLabel = label || action;
    const resolvedBalanceLabel = balanceLabel || balanceText;
    const resolvedBalanceValue =
        balanceValue !== undefined ? balanceValue : balance;
    const resolvedOnMaxClick = onMaxClick || setAddTotalAvailable;

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

        if (hasTokenSelector) {
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
            {resolvedToken?.icon ? (
                <div className="tokenAmountInput__token-icon">
                    {resolvedToken.icon}
                </div>
            ) : resolvedTokenIconClassName ? (
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
            data-testid={testId || dataTestId}
        >
            <div className="tokenAmountInput__field">
                {(resolvedLabel ||
                    showMaxShortcut ||
                    quickActions.length > 0) && (
                    <div className="tokenAmountInput__topRow">
                        {resolvedLabel ? (
                            <div className="tokenAmountInput__label">
                                {resolvedLabel}
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
                                            onClick={resolvedOnMaxClick}
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
                                testId || dataTestId
                                    ? `${testId || dataTestId}-input`
                                    : undefined
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

                    {(resolvedToken || tokenIconClassName || tokenLabel) &&
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

                {(resolvedFiatValue ||
                    resolvedBalanceLabel ||
                    resolvedBalanceValue) && (
                    <div className="tokenAmountInput__bottomRow">
                        <div className="tokenAmountInput__fiatValue">
                            {resolvedFiatValue ? (
                                <>
                                    {showApproxSymbol ? "≈ " : ""}
                                    {resolvedFiatValue}
                                    {fiatLabel ? ` ${fiatLabel}` : ""}
                                </>
                            ) : null}
                        </div>

                        {(resolvedBalanceLabel || resolvedBalanceValue) && (
                            <div className="tokenAmountInput__balance">
                                {resolvedBalanceLabel
                                    ? `${resolvedBalanceLabel}: `
                                    : ""}
                                {resolvedBalanceValue}
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

            {hasTokenSelector && resolvedOnTokenSelect ? (
                <Modal
                    centered
                    className="tokenAmountInput__selectorModal"
                    data-testid={selectorTestId}
                    footer={null}
                    onCancel={() => setIsSelectorOpen(false)}
                    open={isSelectorOpen}
                    title={
                        title && title.trim() !== ""
                            ? title
                            : t("tokenAmountInput.selectTokenTitle")
                    }
                >
                    <div className="tokenAmountInput__optionList">
                        {resolvedTokenOptions.map((option) => (
                            <button
                                className={[
                                    "tokenAmountInput__option",
                                    option.value ===
                                        resolvedSelectedTokenValue &&
                                        "tokenAmountInput__option--selected",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                data-testid={`token-list-select-${option.label}`}
                                key={option.value}
                                onClick={() => {
                                    resolvedOnTokenSelect(option.value);
                                    setIsSelectorOpen(false);
                                }}
                                type="button"
                            >
                                {option.icon ? (
                                    <div className="tokenAmountInput__optionIcon">
                                        {option.icon}
                                    </div>
                                ) : option.iconClassName ? (
                                    <div className={option.iconClassName}></div>
                                ) : null}
                                <div className="tokenAmountInput__optionLabel">
                                    {option.displayLabel || option.label}
                                </div>
                            </button>
                        ))}
                    </div>
                </Modal>
            ) : null}
        </div>
    );
}
