import React, { useEffect, useRef, useState } from "react";

interface FilterSelectProps {
    id: string;
    label: string;
    value: string;
    options: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
}

/** Theme-aware single select with keyboard navigation and outside dismissal. */
export default function FilterSelect({
    id,
    label,
    value,
    options,
    onChange,
}: FilterSelectProps): React.ReactElement {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const selected = Math.max(
        0,
        options.findIndex((option) => option.value === value)
    );

    useEffect(() => {
        if (!open) return;
        list.current?.focus();
        const dismiss = (event: PointerEvent) => {
            if (
                event.target instanceof Node &&
                !root.current?.contains(event.target)
            )
                setOpen(false);
        };
        document.addEventListener("pointerdown", dismiss);
        return () => document.removeEventListener("pointerdown", dismiss);
    }, [open]);

    useEffect(() => {
        if (open)
            list.current?.children[active]?.scrollIntoView({
                block: "nearest",
            });
    }, [active, open]);

    const close = () => {
        setOpen(false);
        trigger.current?.focus();
    };
    const choose = (index: number) => {
        onChange(options[index].value);
        close();
    };

    return (
        <div
            ref={root}
            className="data-table__control"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setOpen(false);
            }}
        >
            <span id={`${id}-label`}>{label}</span>
            <div className="data-table__select">
                <button
                    ref={trigger}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-labelledby={`${id}-label ${id}-value`}
                    aria-controls={open ? `${id}-options` : undefined}
                    onClick={() => {
                        setActive(selected);
                        setOpen(!open);
                    }}
                    onKeyDown={(event) => {
                        if (
                            event.key === "ArrowDown" ||
                            event.key === "ArrowUp"
                        ) {
                            event.preventDefault();
                            setActive(selected);
                            setOpen(true);
                        }
                    }}
                >
                    <span id={`${id}-value`}>{options[selected].label}</span>
                    <svg
                        aria-hidden="true"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
                {open ? (
                    <div
                        ref={list}
                        id={`${id}-options`}
                        role="listbox"
                        tabIndex={-1}
                        aria-labelledby={`${id}-label`}
                        aria-activedescendant={`${id}-option-${active}`}
                        className="data-table__select-menu"
                        onKeyDown={(event) => {
                            switch (event.key) {
                                case "ArrowDown":
                                    event.preventDefault();
                                    setActive(
                                        (index) => (index + 1) % options.length
                                    );
                                    break;
                                case "ArrowUp":
                                    event.preventDefault();
                                    setActive(
                                        (index) =>
                                            (index - 1 + options.length) %
                                            options.length
                                    );
                                    break;
                                case "Home":
                                    event.preventDefault();
                                    setActive(0);
                                    break;
                                case "End":
                                    event.preventDefault();
                                    setActive(options.length - 1);
                                    break;
                                case "Enter":
                                case " ":
                                    event.preventDefault();
                                    choose(active);
                                    break;
                                case "Escape":
                                    event.preventDefault();
                                    close();
                                    break;
                            }
                        }}
                    >
                        {options.map((option, index) => (
                            <div
                                key={option.value}
                                id={`${id}-option-${index}`}
                                role="option"
                                aria-selected={option.value === value}
                                className={
                                    active === index
                                        ? "data-table__select-option--active"
                                        : undefined
                                }
                                onMouseEnter={() => setActive(index)}
                                onClick={() => choose(index)}
                            >
                                <span>{option.label}</span>
                                <span aria-hidden="true">
                                    {option.value === value ? "✓" : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
