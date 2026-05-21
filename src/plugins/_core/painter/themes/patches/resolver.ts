import { NativeThemeModule } from "@api/native/modules";
import { before, instead } from "@api/patcher";
import { findByPropsLazy } from "@metro";
import chroma from "chroma-js";

import { _colorRef } from "../updater";

const tokenReference = findByPropsLazy("SemanticColor");
const themeModule = findByPropsLazy("ThemeTypes");

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

export default function patchDefinitionAndResolver() {
    const callback = ([theme]: any[]) => theme === _colorRef.key ? [_colorRef.current!.reference] : void 0;

    if (themeTypes) {
        origDarker = themeModule?.ThemeTypes?.DARKER as string;
        origLight = themeModule?.ThemeTypes?.LIGHT as string;

        Object.defineProperty(themeModule?.ThemeTypes, "DARKER", {
            configurable: true,
            enumerable: true,
            get: () => _colorRef.current?.reference === "darker" ? _colorRef.key : origDarker,
        });
        Object.defineProperty(themeModule?.ThemeTypes, "LIGHT", {
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

    const unpatches: any[] = [
        before("updateTheme", NativeThemeModule, callback),
        targetResolver && instead("resolveSemanticColor", targetResolver, (args: any[], orig: any) => {
            if (!_colorRef.current) return orig(...args);
            if (args[0] !== _colorRef.key) return orig(...args);

            args[0] = _colorRef.current.reference;

            const [name, colorDef] = extractInfo(_colorRef.current!.reference, args[1]);

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
                // Set opacity if needed
                return colorDef.opacity === 1 ? rawValue : chroma(rawValue).alpha(colorDef.opacity).hex();
            }

            // Fallback to default
            return orig(...args);
        }),
        () => {
            if (themeTypes) {
                Object.defineProperty(themeModule?.ThemeTypes, "DARKER", {
                    configurable: true, writable: true, value: origDarker
                });
                Object.defineProperty(themeModule?.ThemeTypes, "LIGHT", {
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
    ].filter(Boolean);

    return () => { for (const p of unpatches) p(); };
}

function extractInfo(themeName: string, colorObj: any): [name: string, colorDef: any] {
    // Symbol is cached on the function object after the first call — Object.getOwnPropertySymbols
    // is only called once for the lifetime of this module.
    // @ts-ignore - assigning to extractInfo._sym
    const propName = colorObj[extractInfo._sym ??= Object.getOwnPropertySymbols(colorObj)[0]];
    const colorDef = tokenReference.SemanticColor[propName];

    return [propName, colorDef[themeName]];
}
