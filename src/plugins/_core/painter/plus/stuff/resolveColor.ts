import { rawColors, resolveSemanticColor, semanticColors } from "@api/ui/components/color";
import { findByStoreName } from "@metro";

type PlusColorResolvable =
    | string
    | [string, string | undefined, string | undefined, string | undefined];

const ThemeStore = findByStoreName("ThemeStore");

// Pre-build a Set of the dark-family themes to avoid repeated array allocation
// in matchTheme — ["dark", "midnight"].includes(theme) allocates a new array
// on every call.
const DARK_THEMES = new Set(["dark", "midnight"]);

export function matchTheme(colors: {
    darker?: string;
    light?: string;
    midnight?: string;
}): string | undefined {
    const { theme } = ThemeStore;
    if (theme in colors) return (colors as any)[theme];
    if (DARK_THEMES.has(theme)) return colors.darker;
    return colors.light;
}

export default function resolveColor(color: PlusColorResolvable): string | undefined {
    if (Array.isArray(color)) {
        return matchTheme({
            darker: color[0],
            light: color[1],
            midnight: color[2],
        });
    }

    if (color.startsWith("SC_")) {
        const key = color.slice(3);
        return semanticColors[key]
            ? resolveSemanticColor(semanticColors[key])
            : "#ffffff";
    }

    if (color.startsWith("RC_")) return rawColors[color.slice(3)] ?? "#ffffff";

    if (color.startsWith("#")) {
        if (color.length === 4) {
            // Expand shorthand #RGB → #RRGGBB
            return `#${color[1].repeat(2)}${color[2].repeat(2)}${color[3].repeat(2)}`;
        }
        if (color.length === 7) return color;
    }
}
