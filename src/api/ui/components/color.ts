import { constants } from "@metro/common";
import { findByPropsLazy, findByStoreNameLazy } from "@metro/wrappers";
import { lazyDestructure } from "@lib/utils/lazy";

//! This module is only found on 165.0+, under the assumption that iOS 165.0 is the same as Android 165.0.
//* In 167.1, most if not all traces of the old color modules were removed.
//* In 168.6, Discord restructured EVERYTHING again. SemanticColor on this module no longer works when passed to a stylesheet. We must now use what you see below.
//* In 173.10, Discord restructured a lot of the app. These changes included making the color module impossible to early-find.
// ? To stop duplication, it is now exported in our theming code.
// ? These comments are preserved for historical purposes.
// const colorModule = findByPropsProxy("colors", "meta");

const color = findByPropsLazy("SemanticColor");

// ? SemanticColor and default.colors are effectively ThemeColorMap
export const semanticColors = new Proxy({}, { 
    get: (_, prop) => {
        const c = color.default;
        if (c && c.colors) return c.colors[prop];
        return constants?.ThemeColorMap?.[prop];
    } 
}) as Record<string, any>;

// ? RawColor and default.unsafe_rawColors are effectively Colors
//* Note that constants.Colors does still appear to exist on newer versions despite Discord not internally using it - what the fuck?
export const rawColors = new Proxy({}, { 
    get: (_, prop) => {
        const c = color.default;
        if (c && c.unsafe_rawColors) return c.unsafe_rawColors[prop];
        return constants?.Colors?.[prop];
    } 
}) as Record<string, string>;

const ThemeStore = findByStoreNameLazy("ThemeStore");
const getColorResolver = () => color?.default ? (color.default.meta ?? color.default.internal) : null;

export function isSemanticColor(sym: any): boolean {
    const res = getColorResolver();
    return res?.isSemanticColor ? res.isSemanticColor(sym) : false;
}

export function resolveSemanticColor(sym: any, theme = ThemeStore.theme): string {
    const res = getColorResolver();
    return res?.resolveSemanticColor ? res.resolveSemanticColor(theme, sym) : "";
}
