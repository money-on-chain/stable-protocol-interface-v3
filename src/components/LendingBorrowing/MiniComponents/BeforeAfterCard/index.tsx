import "./Styles.scss";

import React from "react";

type BeforeAfterTrend = "positive" | "negative" | "neutral";

interface BeforeAfterCardEntry {
    isInvalid?: boolean;
    label: string;
    unit?: string;
    value?: string;
}

interface BeforeAfterCardProps {
    after: BeforeAfterCardEntry;
    before?: BeforeAfterCardEntry;
    notchHeight?: number;
    notchWidth?: number;
    trend?: BeforeAfterTrend;
    title: string;
    useBorder?: boolean;
}

function renderEntryValue(
    entry: BeforeAfterCardEntry
): { unit?: string; value: string } {
    if (entry.isInvalid) {
        return { value: "- -" };
    }

    return {
        unit: entry.unit,
        value: entry.value?.trim() ? entry.value : "- -",
    };
}

export default function BeforeAfterCard({
    after,
    before,
    notchHeight,
    notchWidth,
    title,
    trend,
    useBorder = false,
}: BeforeAfterCardProps): React.ReactElement {
    const style =
        notchHeight !== undefined || notchWidth !== undefined
            ? ({
                  ...(notchHeight !== undefined && {
                      "--before-after-card-notch-height": `${notchHeight}px`,
                  }),
                  ...(notchWidth !== undefined && {
                      "--before-after-card-notch-width": `${notchWidth}px`,
                  }),
              } as React.CSSProperties)
            : undefined;

    const beforeValue = before ? renderEntryValue(before) : null;
    const afterValue = renderEntryValue(after);
    const resolvedTrend = before ? trend : undefined;

    return (
        <div
            className={[
                "before-after-card",
                useBorder && "before-after-card--bordered",
            ]
                .filter(Boolean)
                .join(" ")}
            style={style}
        >
            <div className="before-after-card__title">{title}</div>

            {before ? (
                <div className="before-after-card__section before-after-card__section--before">
                    <div className="before-after-card__label">{before.label}</div>
                    <div className="before-after-card__value-row">
                        <div className="before-after-card__value">
                            {beforeValue?.value}
                        </div>
                        {beforeValue?.unit ? (
                            <div className="before-after-card__unit">
                                {beforeValue.unit}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div
                className={[
                    "before-after-card__section",
                    "before-after-card__section--after",
                    !before && "before-after-card__section--after-only",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <div className="before-after-card__label">{after.label}</div>
                <div
                    className={[
                        "before-after-card__value-row",
                        resolvedTrend &&
                            "before-after-card__value-row--with-trend",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    <div className="before-after-card__value-group">
                        <div className="before-after-card__value">
                            {afterValue.value}
                        </div>
                        {afterValue.unit ? (
                            <div className="before-after-card__unit">
                                {afterValue.unit}
                            </div>
                        ) : null}
                    </div>
                    {resolvedTrend ? (
                        <div
                            className={`before-after-card__trend before-after-card__trend--${resolvedTrend}`}
                        ></div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
