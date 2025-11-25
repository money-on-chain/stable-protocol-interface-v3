import "./index.scss";

import React, { useEffect, useMemo, useState } from "react";

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

    /** Disables all interactions */
    disabled?: boolean;

    className?: string;
}

const DEFAULT_AUTO_SLIPPAGE = 0.5;
const DEFAULT_PRESETS = [0.1, 0.5, 1.0];

export const SlippageTolerance: React.FC<SlippageToleranceProps> = ({
    pairId,
    state,
    defaultState,
    autoDefault,
    presets,
    onChange,
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

    // Expanded / collapsed panel
    const [isExpanded, setIsExpanded] = useState<boolean>(() => {
        return currentState.mode === "custom";
    });

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
        const next: SlippageState = {
            mode: "auto",
            value: resolvedAutoDefault,
        };
        emitChange(next, true);
    };

    const handleSelectPreset = (preset: number) => {
        if (disabled) return;
        const next: SlippageState = { mode: "custom", value: preset };
        emitChange(next, true);
    };

    const handleCustomInputChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setCustomInput(event.target.value);
    };

    const handleConfirmCustom = () => {
        if (disabled) return;
        const parsed = parseFloat(customInput.replace(",", "."));

        if (Number.isNaN(parsed) || parsed < 0) {
            // You might want to add proper validation feedback here
            return;
        }

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

    const rootClassName = [
        "slippage-tolerance",
        isExpanded
            ? "slippage-tolerance--expanded"
            : "slippage-tolerance--collapsed",
        disabled ? "slippage-tolerance--disabled" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={rootClassName} data-pair-id={pairId}>
            <div className="slippage-tolerance__header">
                <div className="slippage-tolerance__label">
                    Slippage Tolerance
                </div>

                <button
                    type="button"
                    className={`slippage-tolerance__pill slippage-tolerance__pill--mode-${currentState.mode}`}
                    onClick={toggleExpanded}
                    disabled={disabled}
                >
                    <span className="slippage-tolerance__pill-mode">
                        {pillModeLabel}
                    </span>
                    <span className="slippage-tolerance__pill-separator">
                        ·
                    </span>
                    <span className="slippage-tolerance__pill-value">
                        {pillValueLabel}
                    </span>
                    <span
                        className="slippage-tolerance__pill-icon"
                        aria-hidden="true"
                    >
                        {/* You can replace this with an actual icon */}
                        ✏️
                    </span>
                </button>
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
                                    value={customInput}
                                    onChange={handleCustomInputChange}
                                    onKeyDown={handleCustomKeyDown}
                                    placeholder="Custom"
                                    disabled={disabled}
                                />
                                <span className="slippage-tolerance__input-suffix">
                                    %
                                </span>
                                <button
                                    type="button"
                                    className="slippage-tolerance__confirm"
                                    onClick={handleConfirmCustom}
                                    disabled={
                                        disabled || customInput.trim() === ""
                                    }
                                    aria-label="Set custom slippage"
                                >
                                    ✓
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
