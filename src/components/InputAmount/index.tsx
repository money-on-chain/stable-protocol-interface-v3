import "./Styles.scss";

import React, { useEffect, useRef, useState } from "react";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";

interface InputAmountProps {
  balanceText?: string;
  action?: string;
  balance?: React.ReactNode;
  placeholder?: string;
  inputValue?: string;
  onValueChange: (value: string) => void;
  setAddTotalAvailable: () => void;
  validateError?: boolean;

  /**
   * Optional: converts the token input value into a USD display string.
   * - Return something like: "$ 12.34" or "12.34"
   * - Can be async.
   * - If not provided, USD line is not shown.
   */
  onConvertUSD?: (value: string) => bigint | Promise<bigint>;
}

const InputAmount: React.FC<InputAmountProps> = (props) => {
  const { t, i18n } = useProjectTranslation();

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
    onConvertUSD,
  } = props;

  const [usdValue, setUsdValue] = useState<bigint>(0n);
  const convertReqIdRef = useRef(0);

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

  // normaliza el input a string decimal con punto, o "" si inválido
  const normalizeValue = (value: string): string => {
    let formattedValue = value;

    if (value.length > 20) return "__TOO_LONG__";

    if (value.startsWith(".")) {
      formattedValue = `0${value}`;
    }

    if (formattedValue === "") return "";

    if (isValidNumber(formattedValue)) {
      return formattedValue.replace(",", ".");
    }

    return "";
  };

  const updateUSD = async (normalizedTokenValue: string) => {
    if (!onConvertUSD) return;

    // if empty, clear
    if (!normalizedTokenValue) {
      setUsdValue(0n);
      return;
    }

    const reqId = ++convertReqIdRef.current;

    try {
      const result = await onConvertUSD(normalizedTokenValue);

      // if old response, ignore
      if (reqId !== convertReqIdRef.current) return;

      setUsdValue(result ?? "");
    } catch {
      // if conversion fails, clear (or you could show "--")
      if (reqId !== convertReqIdRef.current) return;
      setUsdValue(0n);
    }
  };

  const handleValueChange = (rawValue: string): void => {
    const normalized = normalizeValue(rawValue);
    if (normalized === "__TOO_LONG__") return;

    // update token
    onValueChange(normalized);

    // update USD (if applicable)
    void updateUSD(normalized);
  };

  // if the value comes from outside (MAX button, prop changes, etc),
  // also recalculate USD
  useEffect(() => {
    if (!onConvertUSD) return;
    void updateUSD(inputValue ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, onConvertUSD]);

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
            className={`amountInput__value ${
              validateError ? "amountInput__feedback--error" : ""
            }`}
          />

          {/* USD small line (only if onConvertUSD is provided) */}
          {onConvertUSD && (
            <div className="amountInput__usdValue">
                {PrecisionNumbers({
                                    amount: usdValue || 0n,
                                    token: TokenSettings("CA_0"),
                                    decimals: 8,
                                    i18n: i18n,
                                    isUSD: true,
                                }) }               
            </div>
          )}
        </div>

        <button className="amountInput__maxButton" onClick={setAddTotalAvailable}>
          {t("button.inputMaxValue")}
        </button>
      </div>
    </div>
  );
};

export default InputAmount;
