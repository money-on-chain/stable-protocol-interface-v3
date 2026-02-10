import "./Styles.scss";

import React, { useEffect, useRef } from "react";

import { useProjectTranslation } from "../../helpers/translations";

interface InputAmountProps {
    balanceText?: string;
    action?: string;
    balance?: React.ReactNode;
    placeholder?: string;
    inputValue?: string;
    onValueChange: (value: string) => void;
    setAddTotalAvailable: () => void;
    validateError?: boolean;

    /** Optional fiat equivalent calculation */
    getFiatEquivalent?: (value: number) => number;

    /** Fiat label (defaults to USD) */
    fiatLabel?: string;

    /** Show ≈ symbol before fiat value (defaults to true) */
    showApproxSymbol?: boolean;
}

const InputAmount: React.FC<InputAmountProps> = (props) => {
    const { t } = useProjectTranslation();
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        balanceText,
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
    } = props;

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
        let formattedValue = value;

        if (value.length > 20) {
            return;
        }

        if (value.startsWith(".")) {
            formattedValue = `0${value}`;
        }

        if (formattedValue === "") {
            if (formattedValue.includes(",")) {
                formattedValue = formattedValue.replace(/,/g, "");
                onValueChange(formattedValue);
            } else {
                onValueChange("");
            }
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
        <div className="amountInput">
            <div className="amountInput__infoBar">
                <div className="amountInput__label">{action}</div>{" "}
                <button
                    className="amountInput__maxButton"
                    onClick={setAddTotalAvailable}
                >
                    {t("button.inputMaxValue")}
                </button>
            </div>
            <div className="amountInput__inputBar">
                <div className="amountInput__amount">
                    <input
                        ref={inputRef}
                        placeholder={placeholder}
                        value={inputValue}
                        inputMode="decimal"
                        onChange={(event) => {
                            handleValueChange(event.target.value);
                        }}
                        className={`amountInput__value ${
                            validateError ? "amountInput__feedback--error" : ""
                        }`}
                    />
                </div>
            </div>
            <div className="amountInput__infoBar">
                <div className="amountInput__fiatEquivalent">
                    {getFiatEquivalent && fiatValue !== null && (
                        <>
                            {showApproxSymbol && "≈ "}
                            {fiatValue.toFixed(2)} {fiatLabel}
                        </>
                    )}
                </div>
                <span className="amountInput__available">
                    {`${balanceText}: `}
                    {balance}
                </span>
            </div>
        </div>
    );
};

export default InputAmount;
