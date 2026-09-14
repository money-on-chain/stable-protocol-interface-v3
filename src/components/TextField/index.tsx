import "./Styles.scss";

import React from "react";

interface TextFieldProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
    className?: string;
    error?: string;
    label: string;
}

export default function TextField({
    className = "",
    error,
    id,
    label,
    ...inputProps
}: TextFieldProps): React.ReactElement {
    const classes = ["textField", error ? "textField--error" : "", className]
        .filter(Boolean)
        .join(" ");
    const errorId = error && id ? `${id}-error` : undefined;

    return (
        <div className={classes}>
            <label className="textField__label" htmlFor={id}>
                {label}
            </label>
            <div className="textField__control">
                <input
                    {...inputProps}
                    aria-describedby={errorId}
                    aria-invalid={!!error}
                    className="textField__input"
                    id={id}
                />
            </div>
            {error ? (
                <div className="textField__error" id={errorId}>
                    {error}
                </div>
            ) : null}
        </div>
    );
}
