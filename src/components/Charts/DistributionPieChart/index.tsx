import "./Styles.scss";

import React, { useMemo, useState } from "react";

export interface DistributionPieSlice {
    id: string;
    label: string;
    value: number;
    color?: string;
}

export interface DistributionPieChartProps {
    slices: DistributionPieSlice[];
    size?: number;
    displaySize?: number | string;
    maxSize?: number;
    gap?: number | string;
    borderColor?: string;
    borderWidth?: number;
    sliceGap?: number;
    showLegend?: boolean;
    legendPosition?: "bottom" | "top" | "left" | "right";
    legendLayout?: "column" | "row";
    legendFlexBasis?: number | string;
    legendMaxWidth?: number | string;
    legendWidth?: number | string;
    showPercentages?: boolean;
    showValues?: boolean;
    valueFormatter?: (value: number) => string;
    alignItems?: React.CSSProperties["alignItems"];
    justifyContent?: React.CSSProperties["justifyContent"];
    className?: string;
}

interface NormalizedSlice extends DistributionPieSlice {
    value: number;
    percentage: number;
    color: string;
}

const DEFAULT_COLORS = [
    "var(--brand-color-base)",
    "var(--brand-color-light)",
    "var(--brand-color-dark)",
    "var(--color-semantic-positive)",
    "var(--color-semantic-neutral-alt)",
    "var(--color-txt-link)",
];
const TOOLTIP_WIDTH = 144;
const TOOLTIP_VERTICAL_PADDING = 10;
const TOOLTIP_LINE_HEIGHT = 13;
const TOOLTIP_VALUE_LINE_HEIGHT = 16;
const TOOLTIP_LABEL_MAX_LINE_LENGTH = 20;

export function sanitizeValue(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

export function normalizeSlices(
    slices: DistributionPieSlice[]
): NormalizedSlice[] {
    const sanitizedSlices = slices
        .map((slice, index) => ({
            ...slice,
            value: sanitizeValue(slice.value),
            color: slice.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        }))
        .filter((slice) => slice.id && slice.label);
    const total = sanitizedSlices.reduce((sum, slice) => sum + slice.value, 0);

    return sanitizedSlices.map((slice) => ({
        ...slice,
        percentage: total > 0 ? (slice.value / total) * 100 : 0,
    }));
}

export function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
): { x: number; y: number } {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}

export function describeArc(
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
): string {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
        "M",
        centerX,
        centerY,
        "L",
        start.x,
        start.y,
        "A",
        radius,
        radius,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
        "Z",
    ].join(" ");
}

export function createPiePath(
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
): string {
    if (endAngle - startAngle >= 359.999) {
        const top = polarToCartesian(centerX, centerY, radius, 0);
        const bottom = polarToCartesian(centerX, centerY, radius, 180);

        return [
            "M",
            centerX,
            centerY,
            "L",
            top.x,
            top.y,
            "A",
            radius,
            radius,
            0,
            1,
            1,
            bottom.x,
            bottom.y,
            "A",
            radius,
            radius,
            0,
            1,
            1,
            top.x,
            top.y,
            "Z",
        ].join(" ");
    }

    return describeArc(centerX, centerY, radius, startAngle, endAngle);
}

function wrapLabel(label: string): string[] {
    const words = label.trim().split(/\s+/);
    const lines: string[] = [];

    words.forEach((word) => {
        const wordChunks = word.match(
            new RegExp(`.{1,${TOOLTIP_LABEL_MAX_LINE_LENGTH}}`, "g")
        ) ?? [word];

        wordChunks.forEach((chunk) => {
            const currentLine = lines[lines.length - 1];

            if (!currentLine) {
                lines.push(chunk);
                return;
            }

            if (
                `${currentLine} ${chunk}`.length <=
                TOOLTIP_LABEL_MAX_LINE_LENGTH
            ) {
                lines[lines.length - 1] = `${currentLine} ${chunk}`;
                return;
            }

            lines.push(chunk);
        });
    });

    return lines.length > 0 ? lines : [label];
}

function toStyleValue(value: number | string): string {
    return typeof value === "number" ? `${value}px` : value;
}

export default function DistributionPieChart({
    slices,
    size = 220,
    displaySize,
    maxSize,
    gap = 16,
    borderColor = "var(--surface-color-1)",
    borderWidth = 2,
    sliceGap = 0,
    showLegend = true,
    legendPosition = "bottom",
    legendLayout = "column",
    legendFlexBasis = 132,
    legendMaxWidth,
    legendWidth,
    showPercentages = true,
    showValues = false,
    valueFormatter,
    alignItems = "center",
    justifyContent,
    className,
}: DistributionPieChartProps): JSX.Element | null {
    const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);
    const normalizedSlices = useMemo(() => normalizeSlices(slices), [slices]);
    const drawableSlices = useMemo(
        () => normalizedSlices.filter((slice) => slice.value > 0),
        [normalizedSlices]
    );
    const paths = useMemo(() => {
        let currentAngle = 0;
        const center = size / 2;
        const radius = center - borderWidth / 2;
        const gapAngle = drawableSlices.length > 1 ? Math.max(0, sliceGap) : 0;

        return drawableSlices.map((slice) => {
            const angle = (slice.percentage / 100) * 360;
            const startAngle = currentAngle + gapAngle / 2;
            const endAngle = currentAngle + angle - gapAngle / 2;
            const safeEndAngle = Math.max(startAngle, endAngle);
            const labelAngle = startAngle + (safeEndAngle - startAngle) / 2;
            const labelPoint = polarToCartesian(
                center,
                center,
                radius * 0.58,
                labelAngle
            );
            currentAngle += angle;

            return {
                ...slice,
                path: createPiePath(
                    center,
                    center,
                    radius,
                    startAngle,
                    safeEndAngle
                ),
                tooltipX: labelPoint.x,
                tooltipY: labelPoint.y,
            };
        });
    }, [borderWidth, drawableSlices, size, sliceGap]);
    const formatValue =
        valueFormatter ?? ((value: number): string => `${value.toFixed(2)}%`);
    const rootClassName = [
        "distributionPieChart",
        `distributionPieChart--${legendPosition}`,
        className,
    ]
        .filter(Boolean)
        .join(" ");
    const chartSize = displaySize ?? maxSize ?? size;
    const rootStyle = {
        "--distribution-pie-size": toStyleValue(chartSize),
        "--distribution-pie-gap": toStyleValue(gap),
        "--distribution-pie-legend-direction": legendLayout,
        "--distribution-pie-legend-flex-basis": toStyleValue(legendFlexBasis),
        "--distribution-pie-legend-max-width": legendMaxWidth
            ? toStyleValue(legendMaxWidth)
            : `min(100%, ${toStyleValue(chartSize)})`,
        "--distribution-pie-legend-width": legendWidth
            ? toStyleValue(legendWidth)
            : "100%",
        alignItems,
        justifyContent,
    } as React.CSSProperties;
    const hoveredSlice =
        hoveredSliceId === null
            ? null
            : paths.find((slice) => slice.id === hoveredSliceId);
    const hoveredLabelLines = hoveredSlice ? wrapLabel(hoveredSlice.label) : [];
    const tooltipHeight =
        TOOLTIP_VERTICAL_PADDING * 2 +
        hoveredLabelLines.length * TOOLTIP_LINE_HEIGHT +
        TOOLTIP_VALUE_LINE_HEIGHT;

    if (normalizedSlices.length === 0) {
        return null;
    }

    return (
        <div className={rootClassName} style={rootStyle}>
            <div className="distributionPieChart__chart">
                <svg
                    className="distributionPieChart__svg"
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${size} ${size}`}
                    role="img"
                    aria-label="Distribution pie chart"
                >
                    {paths.map((slice) => (
                        <path
                            key={slice.id}
                            className="distributionPieChart__slice"
                            d={slice.path}
                            fill={slice.color}
                            stroke={borderColor}
                            strokeWidth={borderWidth}
                            tabIndex={0}
                            aria-label={`${slice.label} ${formatValue(
                                slice.value
                            )}`}
                            onMouseEnter={() => setHoveredSliceId(slice.id)}
                            onMouseLeave={() => setHoveredSliceId(null)}
                            onFocus={() => setHoveredSliceId(slice.id)}
                            onBlur={() => setHoveredSliceId(null)}
                        />
                    ))}
                    {hoveredSlice ? (
                        <g
                            className="distributionPieChart__tooltip"
                            transform={`translate(${hoveredSlice.tooltipX} ${hoveredSlice.tooltipY})`}
                        >
                            <rect
                                className="distributionPieChart__tooltipBox"
                                x={-TOOLTIP_WIDTH / 2}
                                y={-tooltipHeight / 2}
                                width={TOOLTIP_WIDTH}
                                height={tooltipHeight}
                                rx="8"
                            />
                            <text
                                className="distributionPieChart__tooltipText"
                                textAnchor="middle"
                            >
                                {hoveredLabelLines.map((line, index) => (
                                    <tspan
                                        key={`${hoveredSlice.id}-label-${index}`}
                                        className="distributionPieChart__tooltipLabel"
                                        x="0"
                                        y={
                                            -tooltipHeight / 2 +
                                            TOOLTIP_VERTICAL_PADDING +
                                            TOOLTIP_LINE_HEIGHT * (index + 0.75)
                                        }
                                    >
                                        {line}
                                    </tspan>
                                ))}
                                <tspan
                                    className="distributionPieChart__tooltipValue"
                                    x="0"
                                    y={
                                        tooltipHeight / 2 -
                                        TOOLTIP_VERTICAL_PADDING
                                    }
                                >
                                    {formatValue(hoveredSlice.value)}
                                </tspan>
                            </text>
                        </g>
                    ) : null}
                </svg>
            </div>
            {showLegend ? (
                <div className="distributionPieChart__legend">
                    {normalizedSlices.map((slice) => (
                        <div
                            key={slice.id}
                            className="distributionPieChart__legendItem"
                        >
                            <span
                                className="distributionPieChart__legendDot"
                                style={{ backgroundColor: slice.color }}
                            />
                            <span className="distributionPieChart__legendLabel">
                                {slice.label}
                            </span>
                            <span className="distributionPieChart__legendValue">
                                {showPercentages
                                    ? formatValue(slice.value)
                                    : null}
                                {showValues && showPercentages ? " " : null}
                                {showValues && !showPercentages
                                    ? formatValue(slice.value)
                                    : null}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
