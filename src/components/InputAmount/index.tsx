// /mnt/data/index.tsx
import "./Styles.scss";

import React, { useEffect, useRef } from "react";

import { TokenSettings } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";

interface InputAmountProps {
    testId?: string;
    balanceText?: string;
    action?: string;
    balance?: React.ReactNode;
    placeholder?: string;
    inputValue?: string;
    onValueChange: (value: string) => void;
    setAddTotalAvailable: () => void;
    validateError?: boolean;

    /** Optional fiat equivalent calculation */
    getFiatEquivalent?: (value: number) => bigint;

    /** Fiat label (defaults to USD) */
    fiatLabel?: string;

    /** Show ≈ symbol before fiat value (defaults to true) */
    showApproxSymbol?: boolean;

    /** Makes input read-only */
    readOnly?: boolean;

    /** Displays value but prevents any direct editing */
    displayOnly?: boolean;
}

const space: string = "\u00A0";

const InputAmount: React.FC<InputAmountProps> = (props) => {
    const { t, i18n } = useProjectTranslation();
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        balanceText,
        testId,
        action,
        balance,
        placeholder,
        inputValue,
        onValueChange,
        setAddTotalAvailable,
        validateError,
        getFiatEquivalent,
        fiatLabel = "USD",
        showApproxSymbol = true,
        readOnly = false,
        displayOnly = false,
    } = props;

    const isNonEditable = readOnly || displayOnly;

    useEffect(() => {
        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
        };

        const inputElement = inputRef.current;
        if (inputElement) {
            inputElement.addEventListener("wheel", handleWheel, {
                passive: false,
            });
        }

        return () => {
            if (inputElement) {
                inputElement.removeEventListener("wheel", handleWheel);
            }
        };
    }, []);

    const isValidNumber = (value: string): boolean => {
        const num = value.replace(",", ".");
        return !isNaN(Number(num));
    };

    const handleValueChange = (value: string): void => {
        if (isNonEditable) return;

        let formattedValue = value;

        if (value.length > 20) {
            return;
        }

        if (value.startsWith(".")) {
            formattedValue = `0${value}`;
        }

        if (formattedValue.includes(",")) {
            formattedValue = formattedValue.replace(/,/g, "");
        }

        if (formattedValue === "") {
            onValueChange("");
        } else if (isValidNumber(formattedValue)) {
            onValueChange(formattedValue.replace(",", "."));
        } else {
            onValueChange("");
        }
    };

    const numericValue = Number(inputValue);

    const fiatValue = getFiatEquivalent
        ? getFiatEquivalent(isNaN(numericValue) ? 0 : numericValue)
        : null;

    return (
        <div
            data-testid={testId}
            className={`amountInput ${readOnly ? "amountInput--readonly" : ""} ${
                displayOnly ? "display-only-background" : ""
            }`}
        >
            <div className="amountInput__infoBar">
                <div className="amountInput__label">{action}</div>
                {!readOnly && !displayOnly && (
                    <button
                        className="amountInput__maxButton"
                        onClick={setAddTotalAvailable}
                    >
                        {t("button.inputMaxValue")}
                    </button>
                )}
            </div>
            <div className="amountInput__inputBar">
                <div className="amountInput__amount">
                    <input
                        data-testid={testId ? `${testId}-input` : undefined}
                        ref={inputRef}
                        placeholder={placeholder}
                        value={inputValue}
                        inputMode="decimal"
                        readOnly={isNonEditable}
                        tabIndex={isNonEditable ? -1 : 0}
                        style={
                            isNonEditable
                                ? { pointerEvents: "none" }
                                : undefined
                        }
                        onChange={(event) => {
                            handleValueChange(event.target.value);
                        }}
                        onKeyDown={(event) => {
                            if (!displayOnly) return;

                            const allowedKeys = new Set([
                                "Tab",
                                "ArrowLeft",
                                "ArrowRight",
                                "ArrowUp",
                                "ArrowDown",
                                "Home",
                                "End",
                                "Shift",
                            ]);

                            const isCopyOrSelectAll =
                                (event.ctrlKey || event.metaKey) &&
                                (event.key.toLowerCase() === "c" ||
                                    event.key.toLowerCase() === "a");

                            if (
                                isCopyOrSelectAll ||
                                allowedKeys.has(event.key)
                            ) {
                                return;
                            }

                            event.preventDefault();
                        }}
                        onPaste={(event) => {
                            if (!displayOnly) return;
                            event.preventDefault();
                        }}
                        onDrop={(event) => {
                            if (!displayOnly) return;
                            event.preventDefault();
                        }}
                        onBeforeInput={(event) => {
                            if (!displayOnly) return;
                            event.preventDefault();
                        }}
                        className={`amountInput__value ${
                            validateError ? "amountInput__feedback--error" : ""
                        } ${displayOnly ? "display-only-data" : ""}`}
                    />
                </div>
            </div>
            <div className="amountInput__infoBar">
                <div className="amountInput__fiatEquivalent">
                    {getFiatEquivalent && fiatValue !== null && (
                        <>
                            {showApproxSymbol && "≈ "}

                            {PrecisionNumbers({
                                amount: fiatValue || 0n,
                                token: TokenSettings("CA_0"),
                                decimals: 2,
                                i18n: i18n,
                                isUSD: true,
                                compact: true,
                            })}
                            {space}
                            {fiatLabel}
                        </>
                    )}
                </div>
                <span className="amountInput__available">
                    {`${balanceText}: `}
                    {space}
                    {balance}
                </span>
            </div>
        </div>
    );
};

export default InputAmount;
