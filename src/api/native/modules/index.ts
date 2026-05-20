import { RNModules } from "./types";

const nmp = window.nativeModuleProxy;

export function wrapNativeModule<T = any>(rawModule: any): T | undefined {
    if (!rawModule) return undefined;
    if (rawModule.__isRainProxied) return rawModule;

    // Local safe storage for patches and modifications
    const shadow: Record<string | symbol, any> = {};

    // Using an empty object {} as the Proxy target eliminates JSI C++ proxy invariants,
    // allowing sublimation to perform writes/defineProperties with 100% safety.
    return new Proxy({}, {
        get(target, prop, receiver) {
            if (prop === "__isRainProxied") return true;
            if (prop in shadow) return shadow[prop];
            
            const value = rawModule[prop];
            if (typeof value === "function") {
                // Ensure native functions run bound to the correct raw native context
                return value.bind(rawModule);
            }
            return value;
        },
        set(target, prop, value) {
            shadow[prop] = value;
            return true;
        },
        defineProperty(target, prop, descriptor) {
            // Intercept defineProperty writes completely away from JSI C++ memory
            Object.defineProperty(shadow, prop, descriptor);
            return true;
        },
        deleteProperty(target, prop) {
            delete shadow[prop];
            return true;
        },
        has(target, prop) {
            return prop in shadow || prop in rawModule;
        },
        ownKeys(target) {
            return Array.from(new Set([
                ...Reflect.ownKeys(rawModule),
                ...Reflect.ownKeys(shadow)
            ]));
        },
        getOwnPropertyDescriptor(target, prop) {
            if (prop in shadow) {
                return Object.getOwnPropertyDescriptor(shadow, prop);
            }
            try {
                // Synthesize a clean, configurable descriptor for the patcher
                if (typeof rawModule[prop] === "function") {
                    return {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: rawModule[prop].bind(rawModule)
                    };
                }
                const desc = Object.getOwnPropertyDescriptor(rawModule, prop);
                if (desc) {
                    return { ...desc, configurable: true, writable: true };
                }
            } catch {}
            return undefined;
        }
    }) as T;
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
