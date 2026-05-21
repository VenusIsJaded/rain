import { ThemeManifest } from "@plugins/_core/painter/themes/types";

// @ts-ignore
const pyonLoaderIdentity = globalThis.__PYON_LOADER__;
// @ts-ignore
const rainLoaderIdentity = globalThis.__RAIN_LOADER__;

export interface ThemeInfo {
    id: string;
    selected: boolean;
    data: ThemeManifest;
}

export const isPyonLoader = () => pyonLoaderIdentity != null;
export const isRainLoader = () => rainLoaderIdentity != null;

export function getLoaderIdentity() {
    return rainLoaderIdentity ?? pyonLoaderIdentity ?? null;
}

export function getLoaderName(): string {
    if (isRainLoader()) return rainLoaderIdentity.loaderName;
    if (isPyonLoader()) return pyonLoaderIdentity.loaderName;
    return "Unknown";
}

export function getLoaderVersion(): string | null {
    if (isRainLoader()) return rainLoaderIdentity.loaderVersion;
    if (isPyonLoader()) return pyonLoaderIdentity.loaderVersion;
    return null;
}

export function isLoaderConfigSupported(): boolean {
    return isRainLoader() || isPyonLoader();
}

export function getThemeFilePath(): string | null {
    // Both loaders use the same path
    if (isRainLoader() || isPyonLoader()) return "current-theme.json";
    return null;
}

export function isReactDevToolsPreloaded(): boolean {
    return Boolean(window.__REACT_DEVTOOLS__);
}

export function getReactDevToolsProp(): string | null {
    if (!isReactDevToolsPreloaded()) return null;

    if (isRainLoader()) {
        window.__rain_rdt = window.__REACT_DEVTOOLS__.exports;
        return "__rain_rdt";
    }
    if (isPyonLoader()) {
        window.__pyoncord_rdt = window.__REACT_DEVTOOLS__.exports;
        return "__pyoncord_rdt";
    }

    return null;
}

export function getReactDevToolsVersion(): string | null {
    if (!isReactDevToolsPreloaded()) return null;
    // Both loaders expose the version on the same shape
    return window.__REACT_DEVTOOLS__?.version ?? null;
}

export function getSysColors() {
    return rainLoaderIdentity?.sysColors ?? pyonLoaderIdentity?.sysColors;
}

export function getStoredTheme(): ThemeInfo | null {
    return rainLoaderIdentity?.storedTheme ?? pyonLoaderIdentity?.storedTheme ?? null;
}

export function isChatBubblesSupported(): boolean {
    return rainLoaderIdentity?.isChatBubblesSupported ?? false;
}

export function isSysColorsSupported(): boolean {
    return rainLoaderIdentity?.isSysColorsSupported ?? pyonLoaderIdentity?.isSysColorsSupported;
}

export function getLoaderConfigPath(): string {
    return "loader.json";
}
