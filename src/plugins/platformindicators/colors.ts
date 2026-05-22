import { rawColors } from "@api/ui/components/color";

const FALLBACK_COLORS: Record<string, string> = {
    online: "#23a55a",
    dnd: "#f23f43",
    idle: "#f0b232",
    offline: "#80848e"
};

// OPTIMIZATION: Cache the theme color map so getThemeColors() doesn't
// allocate a new object + run 8 fallback chains on every single call.
// rawColors doesn't change at runtime, so this is safe to compute once.
let _cachedThemeColors: Record<string, string> | null = null;

function getThemeColors(): Record<string, string> {
    if (_cachedThemeColors) return _cachedThemeColors;
    if (!rawColors) return FALLBACK_COLORS;

    _cachedThemeColors = {
        online: String(rawColors.GREEN_360 ?? rawColors.GREEN_500 ?? FALLBACK_COLORS.online),
        dnd: String(rawColors.RED_400 ?? rawColors.RED_500 ?? FALLBACK_COLORS.dnd),
        idle: String(rawColors.YELLOW_300 ?? rawColors.YELLOW_500 ?? FALLBACK_COLORS.idle),
        offline: String(rawColors.PRIMARY_400 ?? rawColors.GREY_500 ?? FALLBACK_COLORS.offline),
    };
    return _cachedThemeColors;
}

export function getStatusColor(status: string, useTheme: boolean = true): string {
    if (useTheme) {
        const themeColors = getThemeColors();
        return themeColors[status] || FALLBACK_COLORS[status] || FALLBACK_COLORS.offline;
    }
    return FALLBACK_COLORS[status] || FALLBACK_COLORS.offline;
}
