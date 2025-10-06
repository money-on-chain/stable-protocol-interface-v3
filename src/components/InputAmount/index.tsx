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
}

const InputAmount: React.FC<InputAmountProps> = (props) => {
    const { t } = useProjectTranslation();

    const inputRef = useRef<HTMLInputElement>(null);
    //const [value, setValue] = useState("");
    const {
        balanceText,
        action,
        balance,
        placeholder,
        inputValue,
        onValueChange,
        setAddTotalAvailable,
        validateError,
    } = props;

    useEffect(() => {
        const handleWheel = (event: WheelEvent) => {
            console.warn("Wheel event triggered");
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

    return (
        <div className="amountInput">
            <div className="amountInput__infoBar">
                <div className="amountInput__label">{action}</div>
                <span className="amountInput__available">
                    {`${balanceText}: `}
                    {balance}
                </span>
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
                        className={`amountInput__value ${validateError ? "amountInput__feedback--error" : ""}`}
                    />
                </div>
                <button
                    className="amountInput__maxButton"
                    onClick={setAddTotalAvailable}
                >
                    {t("button.inputMaxValue")}
                </button>
            </div>
        </div>
    );
};

export default InputAmount;
