import { RNModules } from "./types";

const nmp = window.nativeModuleProxy;

export function wrapNativeModule<T = any>(rawModule: any): T | undefined {
    if (!rawModule) return undefined;
    if (rawModule.__isRainProxied) return rawModule;
    
    const wrapper: any = {
        __isRainProxied: true
    };
    const keys = new Set<string | symbol>();
    let current = rawModule;
    
    // Gather all properties and methods from the raw C++ JSI object prototype chain
    while (current && current !== Object.prototype) {
        Reflect.ownKeys(current).forEach(k => keys.add(k));
        current = Object.getPrototypeOf(current);
    }
    
    for (const key of keys) {
        if (key === "constructor" || key === "__isRainProxied") continue;
        
        try {
            const value = rawModule[key];
            if (typeof value === "function") {
                // Safely copy the native method as a plain, writable JS function bound to original context
                wrapper[key] = value.bind(rawModule);
            } else {
                // Set up dynamically forwarding getters/setters for raw constants
                Object.defineProperty(wrapper, key, {
                    get: () => rawModule[key],
                    set: (v) => {
                        try {
                            rawModule[key] = v;
                        } catch {}
                    },
                    configurable: true,
                    enumerable: true
                });
            }
        } catch {}
    }
    
    return wrapper as T;
}

export function getNativeModule<T = any>(...names: string[]): T | undefined {
    for (const name of names) {
        let rawModule: any = undefined;

        if (globalThis.__turboModuleProxy) {
            try {
                rawModule = globalThis.__turboModuleProxy(name);
            } catch {}
        }

        if (!rawModule && nmp && nmp[name]) {
            rawModule = nmp[name];
        }

        if (rawModule) {
            return wrapNativeModule<T>(rawModule);
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
