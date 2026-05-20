import { RNModules } from "./types";

const nmp = window.nativeModuleProxy;

function wrapNativeModule<T = any>(rawModule: any): T | undefined {
    if (!rawModule) return undefined;
    
    const wrapper: any = {};
    const keys = new Set<string | symbol>();
    let current = rawModule;
    
    // Gather all properties/methods from the raw C++ JSI object prototype chain
    while (current && current !== Object.prototype) {
        Reflect.ownKeys(current).forEach(k => keys.add(k));
        current = Object.getPrototypeOf(current);
    }
    
    for (const key of keys) {
        if (key === "constructor") continue;
        
        try {
            const value = rawModule[key];
            if (typeof value === "function") {
                // Copy method as a plain, fully writable JS function
                wrapper[key] = function (this: any, ...args: any[]) {
                    return value.apply(rawModule, args);
                };
            } else {
                // Forward properties and constants dynamically
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
            // Return our clean, safe writable JS clone instead of the locked JSI HostObject
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
