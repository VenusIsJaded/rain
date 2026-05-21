import { RNModules } from "./types";

const nmp = window.nativeModuleProxy;

export function wrapNativeModule<T = any>(rawModule: any): T | undefined {
    if (!rawModule) return undefined;
    if (rawModule.__isRainProxied) return rawModule;
    return rawModule; // Minimal - no heavy Proxy = no bridge conflict
}

export function getNativeModule<T = any>(...names: string[]): T | undefined {
    for (const name of names) {
        if (globalThis.__turboModuleProxy) {
            const m = globalThis.__turboModuleProxy(name);
            if (m) return wrapNativeModule<T>(m);
        }
        if (nmp && nmp[name]) {
            return wrapNativeModule<T>(nmp[name]);
        }
    }
    return undefined;
}

export const NativeCacheModule = getNativeModule<RNModules.MMKVManager>(
    "NativeCacheModule", "MMKVManager"
)!;
export const NativeFileModule = getNativeModule<RNModules.FileManager>(
    "NativeFileModule", "RTNFileManager", "DCDFileManager"
)!;
export const NativeClientInfoModule = getNativeModule<RNModules.ClientInfoModule>(
    "NativeClientInfoModule", "RTNClientInfoManager", "InfoDictionaryManager"
)!;
export const NativeDeviceModule = getNativeModule(
    "NativeDeviceModule", "RTNDeviceManager", "DCDDeviceManager"
)!;
export const NativeThemeModule = getNativeModule(
    "NativeThemeModule", "RTNThemeManager", "DCDTheme"
)!;
export const BundleUpdaterManager = getNativeModule(
    "BundleUpdaterManager"
)!;
export const ImageLoader = getNativeModule(
    "ImageLoader"
)!;
