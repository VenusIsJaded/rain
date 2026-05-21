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

export function isPyonLoader() {
    return pyonLoaderIdentity != null;
}

export function isRainLoader() {
    return rainLoaderIdentity != null;
}

export function getLoaderIdentity() {
    return rainLoaderIdentity ?? pyonLoaderIdentity ?? null;
}

export function getLoaderName() {
    if (isPyonLoader()) return pyonLoaderIdentity.loaderName;
    if (isRainLoader()) return rainLoaderIdentity.loaderName;

    return "Unknown";
}

export function getLoaderVersion(): string | null {
    if (isPyonLoader()) return pyonLoaderIdentity.loaderVersion;
    if (isRainLoader()) return rainLoaderIdentity.loaderVersion;
    return null;
}

export function isLoaderConfigSupported() {
    return isRainLoader() || isPyonLoader();
}

export function getThemeFilePath() {
    return (isRainLoader() || isPyonLoader()) ? "current-theme.json" : null;
}

export function isReactDevToolsPreloaded() {
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

export function getReactDevToolsVersion() {
    if (!isReactDevToolsPreloaded()) return null;
    return window.__REACT_DEVTOOLS__.version || null;
}

export function getSysColors() {
    return rainLoaderIdentity?.sysColors ?? pyonLoaderIdentity?.sysColors;
}

export function getStoredTheme(): ThemeInfo | null {
    return rainLoaderIdentity?.storedTheme ?? pyonLoaderIdentity?.storedTheme ?? null;
}

export function isChatBubblesSupported() {
    return rainLoaderIdentity?.isChatBubblesSupported ?? false;
}

export function isSysColorsSupported() {
    return rainLoaderIdentity?.isSysColorsSupported ?? pyonLoaderIdentity?.isSysColorsSupported;
}

export function getLoaderConfigPath() {
    return "loader.json";
}
