import type { ButtonHTMLAttributes, ReactElement } from "react";

type ButtonVariant = "default" | "primary";
type ButtonSize = "small";

interface ButtonProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    type?: ButtonVariant;
    size?: ButtonSize;
}

export default function Button({
    type = "default",
    size,
    className,
    ...props
}: ButtonProps): ReactElement {
    const resolvedClassName =
        className ??
        (size === "small"
            ? "button--small"
            : type === "primary"
              ? "button"
              : "button secondary");

    return <button {...props} type="button" className={resolvedClassName} />;
}
