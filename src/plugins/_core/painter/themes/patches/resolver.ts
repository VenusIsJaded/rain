import { NativeThemeModule } from "@api/native/modules";
import { before, instead } from "@api/patcher";
import { findByProps } from "@metro";
import chroma from "chroma-js";

import { _colorRef } from "../updater";

const tokenReference = findByProps("SemanticColor");
const themeTypes = findByProps("ThemeTypes")?.ThemeTypes;

const origRawColor = tokenReference?.RawColor ? { ...tokenReference.RawColor } : {};
let origDarker: string;
let origLight: string;

const SEMANTIC_FALLBACK_MAP: Record<string, string> = {
    "BG_BACKDROP": "BACKGROUND_FLOATING",
    "BG_BASE_PRIMARY": "BACKGROUND_PRIMARY",
    "BG_BASE_SECONDARY": "BACKGROUND_SECONDARY",
    "BG_BASE_TERTIARY": "BACKGROUND_SECONDARY_ALT",
    "BG_MOD_FAINT": "BACKGROUND_MODIFIER_ACCENT",
    "BG_MOD_STRONG": "BACKGROUND_MODIFIER_ACCENT",
    "BG_MOD_SUBTLE": "BACKGROUND_MODIFIER_ACCENT",
    "BG_SURFACE_OVERLAY": "BACKGROUND_FLOATING",
    "BG_SURFACE_OVERLAY_TMP": "BACKGROUND_FLOATING",
    "BG_SURFACE_RAISED": "BACKGROUND_MOBILE_PRIMARY"
};

// Cache the Symbol used to look up prop names in extractInfo — computed once
// instead of calling Object.getOwnPropertySymbols on every resolveSemanticColor
// invocation. Stored as a module-level variable for persistence across calls.
let _extractInfoSym: symbol | undefined;

export default function patchDefinitionAndResolver() {
    const callback = ([theme]: any[]) =>
        theme === _colorRef.key ? [_colorRef.current!.reference] : void 0;

    if (themeTypes) {
        origDarker = themeTypes.DARKER as string;
        origLight = themeTypes.LIGHT as string;

        Object.defineProperty(themeTypes, "DARKER", {
            configurable: true,
            enumerable: true,
            get: () => _colorRef.current?.reference === "darker" ? _colorRef.key : origDarker,
        });
        Object.defineProperty(themeTypes, "LIGHT", {
            configurable: true,
            enumerable: true,
            get: () => _colorRef.current?.reference === "light" ? _colorRef.key : origLight,
        });
    }

    if (tokenReference?.RawColor) {
        for (const key of Object.keys(tokenReference.RawColor)) {
            Object.defineProperty(tokenReference.RawColor, key, {
                configurable: true,
                enumerable: true,
                get: () => _colorRef.current?.raw[key] || origRawColor[key],
            });
        }
    }

    const targetResolver = tokenReference?.default?.meta ?? tokenReference?.default?.internal;

    const unpatches: Array<() => void> = [
        before("updateTheme", NativeThemeModule, callback),
        targetResolver && instead("resolveSemanticColor", targetResolver, (args: any[], orig: any) => {
            if (!_colorRef.current) return orig(...args);
            if (args[0] !== _colorRef.key) return orig(...args);

            args[0] = _colorRef.current.reference;

            const [name, colorDef] = extractInfo(_colorRef.current.reference, args[1]);

            let semanticDef = _colorRef.current.semantic[name];
            if (!semanticDef && _colorRef.current.spec === 2 && name in SEMANTIC_FALLBACK_MAP) {
                semanticDef = _colorRef.current.semantic[SEMANTIC_FALLBACK_MAP[name]];
            }

            if (semanticDef?.value) {
                return semanticDef.opacity === 1
                    ? semanticDef.value
                    : chroma(semanticDef.value).alpha(semanticDef.opacity).hex();
            }

            const rawValue = _colorRef.current.raw[colorDef.raw];
            if (rawValue) {
                return colorDef.opacity === 1 ? rawValue : chroma(rawValue).alpha(colorDef.opacity).hex();
            }

            return orig(...args);
        }),
        () => {
            if (themeTypes) {
                Object.defineProperty(themeTypes, "DARKER", {
                    configurable: true, writable: true, value: origDarker
                });
                Object.defineProperty(themeTypes, "LIGHT", {
                    configurable: true, writable: true, value: origLight
                });
            }
            if (tokenReference) {
                Object.defineProperty(tokenReference, "RawColor", {
                    configurable: true,
                    writable: true,
                    value: origRawColor
                });
            }
        }
    ].filter(Boolean) as Array<() => void>;

    return () => unpatches.forEach(p => p());
}

function extractInfo(themeName: string, colorObj: any): [name: string, colorDef: any] {
    // Cache the symbol across calls — Object.getOwnPropertySymbols is expensive
    // and the symbol is always the same for every colorObj in this context.
    _extractInfoSym ??= Object.getOwnPropertySymbols(colorObj)[0];
    const propName = colorObj[_extractInfoSym];
    const colorDef = tokenReference.SemanticColor[propName];
    return [propName, colorDef[themeName]];
}
