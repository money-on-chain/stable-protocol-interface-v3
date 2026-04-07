import "./index.scss";

import React, { useEffect, useMemo, useState } from "react";

import settings from "../../settings/settings.json";

const { slippage } = settings;
export type SlippageMode = "auto" | "custom";

export interface SlippageState {
    mode: SlippageMode;
    /** Percentage value, e.g. 0.5 means 0.5% */
    value: number;
}

export interface SlippageToleranceProps {
    /** Pair identifier, e.g. "RBTC-DOC" or "tokenA-tokenB" */
    pairId: string;

    /** Controlled state (if provided, component becomes controlled) */
    state?: SlippageState;

    /** Initial state for uncontrolled usage */
    defaultState?: SlippageState;

    /** Default percentage used when user selects Auto (0.5 = 0.5%) */
    autoDefault?: number;

    /** Quick preset values (percentages) used for buttons */
    presets?: number[];

    /** Called whenever the slippage state changes */
    onChange?: (next: SlippageState) => void;

    /** Notifies about interaction state: pending custom value and validity */
    onInteractionChange?: (state: {
        hasPendingCustom: boolean;
        isValid: boolean;
    }) => void;

    /** Disables all interactions */
    disabled?: boolean;

    className?: string;
}

const DEFAULT_AUTO_SLIPPAGE = slippage.autoDefault;
const DEFAULT_PRESETS = slippage.presets;

const MIN_CUSTOM_SLIPPAGE = 0; // 0%
const MAX_CUSTOM_SLIPPAGE = 100; // 100%

export const SlippageTolerance: React.FC<SlippageToleranceProps> = ({
    pairId,
    state,
    defaultState,
    autoDefault,
    presets,
    onChange,
    onInteractionChange,
    disabled,
    className,
}) => {
    // Decide whether the component is controlled or uncontrolled
    const isControlled = state !== undefined;

    const resolvedPresets = useMemo(
        () => (presets && presets.length > 0 ? presets : DEFAULT_PRESETS),
        [presets]
    );

    const resolvedAutoDefault = useMemo(
        () =>
            typeof autoDefault === "number"
                ? autoDefault
                : DEFAULT_AUTO_SLIPPAGE,
        [autoDefault]
    );

    // Internal state only used when the component is not controlled
    const [internalState, setInternalState] = useState<SlippageState>(() => {
        if (defaultState) return defaultState;
        return { mode: "auto", value: resolvedAutoDefault };
    });

    const currentState = isControlled ? state : internalState;
    const [validationError, setValidationError] = useState<string | null>(null);

    // Expanded / collapsed panel
    const [isExpanded, setIsExpanded] = useState<boolean>(() => {
        return currentState.mode === "custom";
    });

    const validateCustomInput = (rawValue: string): string | null => {
        const trimmed = rawValue.trim();
        if (trimmed === "") {
            return null; // no value yet, no error
        }

        const parsed = parseFloat(trimmed.replace(",", "."));
        if (Number.isNaN(parsed)) {
            return "Please enter a valid number.";
        }

        if (parsed < MIN_CUSTOM_SLIPPAGE) {
            return `Slippage cannot be lower than ${MIN_CUSTOM_SLIPPAGE}%.`;
        }

        if (parsed > MAX_CUSTOM_SLIPPAGE) {
            return `Slippage cannot be higher than ${MAX_CUSTOM_SLIPPAGE}%.`;
        }

        return null;
    };

    // String value used for the custom input
    const [customInput, setCustomInput] = useState<string>(() =>
        currentState.mode === "custom" ? String(currentState.value) : ""
    );

    // Keep custom input in sync when mode/value changes and the panel is expanded
    useEffect(() => {
        if (!isExpanded) return;
        if (currentState.mode === "custom") {
            setCustomInput(String(currentState.value));
        } else {
            setCustomInput("");
        }
    }, [currentState.mode, currentState.value, isExpanded]);

    const emitChange = (next: SlippageState, collapseAfter: boolean) => {
        if (!isControlled) {
            setInternalState(next);
        }
        if (onChange) {
            onChange(next);
        }
        if (collapseAfter) {
            setIsExpanded(false);
        }
    };

    const toggleExpanded = () => {
        if (disabled) return;
        setIsExpanded((prev) => !prev);
    };

    const handleSelectAuto = () => {
        if (disabled) return;
        // Selecting Auto should clear any pending custom state
        setCustomInput("");
        setValidationError(null);
        const next: SlippageState = {
            mode: "auto",
            value: resolvedAutoDefault,
        };
        emitChange(next, true);
    };

    const handleSelectPreset = (preset: number) => {
        if (disabled) return;
        // Selecting a preset should clear any pending custom state
        setCustomInput("");
        setValidationError(null);
        const next: SlippageState = { mode: "custom", value: preset };
        emitChange(next, true);
    };

    const handleCustomInputChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const rawValue = event.target.value;
        setCustomInput(rawValue);
        setValidationError(validateCustomInput(rawValue));
    };

    const handleConfirmCustom = () => {
        if (disabled) return;

        const error = validateCustomInput(customInput);
        if (error) {
            setValidationError(error);
            return;
        }

        const parsed = parseFloat(customInput.replace(",", "."));
        const next: SlippageState = { mode: "custom", value: parsed };
        emitChange(next, true);
    };

    const handleCustomKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleConfirmCustom();
        }
    };

    const formatPercentage = (value: number): string => {
        // Adjust decimal precision to your needs
        return `${value.toFixed(2)}%`;
    };

    const pillModeLabel = currentState.mode === "auto" ? "Auto" : "Custom";
    const pillValueLabel = formatPercentage(currentState.value);
    const isCustomActive = currentState.mode === "custom";

    // Derived interaction state: pending custom vs confirmed value
    const trimmedCustom = customInput.trim();

    const parsedCustom =
        trimmedCustom === ""
            ? null
            : parseFloat(trimmedCustom.replace(",", "."));

    const hasPendingCustom =
        trimmedCustom !== "" &&
        parsedCustom !== null &&
        !Number.isNaN(parsedCustom) &&
        // If mode is auto, any non-empty value is pending.
        // If mode is custom, pending when input differs from current confirmed value.
        (currentState.mode !== "custom" || parsedCustom !== currentState.value);

    const hasError = Boolean(validationError);
    const isValid = !hasError && !hasPendingCustom;

    // Notify parent about interaction state so it can, for example,
    // disable the outer "Confirm" button while there is a pending custom value.
    useEffect(() => {
        if (!onInteractionChange) return;
        onInteractionChange({
            hasPendingCustom,
            isValid,
        });
    }, [hasPendingCustom, isValid, onInteractionChange]);

    const rootClassName = [
        "slippage-tolerance",
        isExpanded
            ? "slippage-tolerance--expanded"
            : "slippage-tolerance--collapsed",
        disabled ? "slippage-tolerance--disabled" : "",
        isCustomActive ? "slippage-tolerance--custom-active" : "",
        hasError ? "slippage-tolerance--error" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={rootClassName} data-pair-id={pairId}>
            <div className="slippage-tolerance__header">
                <div className="slippage-tolerance__label">
                    Slippage Tolerance:
                    <button
                        type="button"
                        className={`slippage-tolerance__pill slippage-tolerance__pill--mode-${currentState.mode}`}
                        onClick={toggleExpanded}
                        data-testid={`slippage-selector-open-${pairId}`}
                        disabled={disabled}
                    >
                        <div className="slippage-tolerance__pill-mode">
                            {pillModeLabel}
                        </div>
                        {/* <div className="slippage-tolerance__pill-separator"></div> */}
                        <div className="slippage-tolerance__pill-value">
                            {pillValueLabel}
                        </div>
                        <div className="icon-edit-value slippage-tolerance__pill-icon"></div>
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="slippage-tolerance__panel">
                    <div className="slippage-tolerance__options">
                        <button
                            type="button"
                            className={`slippage-tolerance__option slippage-tolerance__option--auto ${
                                currentState.mode === "auto"
                                    ? "slippage-tolerance__option--active"
                                    : ""
                            }`}
                            onClick={handleSelectAuto}
                            disabled={disabled}
                        >
                            Auto
                        </button>

                        {resolvedPresets.map((preset) => {
                            const isActive =
                                currentState.mode === "custom" &&
                                currentState.value === preset;

                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    className={`slippage-tolerance__option slippage-tolerance__option--preset ${
                                        isActive
                                            ? "slippage-tolerance__option--active"
                                            : ""
                                    }`}
                                    onClick={() => handleSelectPreset(preset)}
                                    disabled={disabled}
                                >
                                    {formatPercentage(preset)}
                                </button>
                            );
                        })}

                        <div className="slippage-tolerance__custom">
                            <div className="slippage-tolerance__input-group">
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    className="slippage-tolerance__input"
                                    data-testid={`slippage-input-${pairId}`}
                                    value={customInput}
                                    onChange={handleCustomInputChange}
                                    onKeyDown={handleCustomKeyDown}
                                    placeholder="Custom"
                                    disabled={disabled}
                                />
                                <div className="slippage-tolerance__input-suffix">
                                    %
                                </div>
                                <button
                                    type="button"
                                    className="slippage-tolerance__confirm"
                                    onClick={handleConfirmCustom}
                                    disabled={
                                        disabled ||
                                        customInput.trim() === "" ||
                                        Boolean(validationError)
                                    }
                                    aria-label="Set custom slippage"
                                >
                                    <div
                                        data-testid={`slippage-accept-${pairId}`}
                                        className="icon-accept slippage-tolerance__accept"
                                    ></div>
                                </button>
                            </div>
                        </div>
                    </div>
                    {validationError && (
                        <div className="slippage-tolerance__feedback">
                            {validationError}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
