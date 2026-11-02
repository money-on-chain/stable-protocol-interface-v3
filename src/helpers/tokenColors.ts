// Use the most frequent chromatic fill in each token icon as its chart color.
// Neutral backgrounds and lettering should not override the token identity.
const icons = import.meta.glob<string>("../assets/tokens/*.svg", {
    eager: true,
    query: "?raw",
    import: "default",
});

const colors = new Map<string, string>();
for (const [path, svg] of Object.entries(icons)) {
    const counts = new Map<string, number>();
    for (const match of svg.matchAll(
        /(?:fill\s*[:=]\s*["']?)(#[\da-f]{6}|#[\da-f]{3})(?![\da-f])/gi
    )) {
        const hex = match[1].slice(1);
        const full =
            hex.length === 3
                ? hex
                      .split("")
                      .map((c) => c + c)
                      .join("")
                : hex;
        const rgb = [0, 2, 4].map((offset) =>
            parseInt(full.slice(offset, offset + 2), 16)
        );
        if (Math.max(...rgb) - Math.min(...rgb) < 25) continue;
        const color = `#${full.toUpperCase()}`;
        counts.set(color, (counts.get(color) ?? 0) + 1);
    }
    const color = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (color)
        colors.set(
            path.split("/").pop()!.replace(".svg", "").toUpperCase(),
            color
        );
}

export function tokenChartColor(symbol: string): string {
    const key = symbol.toUpperCase();
    const iconColor = colors.get(key);
    if (iconColor) return iconColor;
    // Stable fallback for tokens without a colored icon, independent of slice order.
    const hash = Array.from(key).reduce(
        (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
        0
    );
    return `hsl(${hash % 360}, 65%, 55%)`;
}

// Resolve a whole chart together so tokens sharing an icon color remain distinct.
// Sorting symbols makes the shades independent of legend / slice order.
export function tokenChartColors(symbols: string[]): Map<string, string> {
    const groups = new Map<string, string[]>();
    for (const symbol of new Set(symbols.map((value) => value.toUpperCase()))) {
        const color = tokenChartColor(symbol);
        groups.set(color, [...(groups.get(color) ?? []), symbol]);
    }

    const result = new Map<string, string>();
    for (const [color, group] of groups) {
        if (group.length === 1) {
            result.set(group[0], color);
            continue;
        }
        const [hue, saturation] = color.startsWith("#")
            ? hexHueAndSaturation(color)
            : (color.match(/[\d.]+/g) ?? []).map(Number);
        group.sort().forEach((symbol, index) => {
            const lightness = 36 + (index * 38) / (group.length - 1);
            result.set(symbol, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
        });
    }
    return result;
}

function hexHueAndSaturation(hex: string): [number, number] {
    const [r, g, b] = [1, 3, 5].map(
        (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255
    );
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta === 0) return [0, 0];
    const lightness = (max + min) / 2;
    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    const hue =
        max === r
            ? ((g - b) / delta) % 6
            : max === g
              ? (b - r) / delta + 2
              : (r - g) / delta + 4;
    return [Math.round((hue * 60 + 360) % 360), Math.round(saturation * 100)];
}
