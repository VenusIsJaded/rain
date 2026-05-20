import { RNModules } from "./types";

function wrapIndividualNativeModule(rawModule: any) {
    if (!rawModule || rawModule.__isRainProxied) return rawModule;
    
    const shadow: Record<string | symbol, any> = {};
    return new Proxy(rawModule, {
        get(target, prop, receiver) {
            if (prop === "__isRainProxied") return true;
            if (prop in shadow) return shadow[prop];
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === "function") {
                return value.bind(target);
            }
            return value;
        },
        set(target, prop, value) {
            shadow[prop] = value;
            return true;
        },
        defineProperty(target, prop, descriptor) {
            Object.defineProperty(shadow, prop, descriptor);
            return true;
        },
        deleteProperty(target, prop) {
            delete shadow[prop];
            return true;
        },
        has(target, prop) {
            return prop in shadow || Reflect.has(target, prop);
        },
        ownKeys(target) {
            return Array.from(new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(shadow)]));
        },
        getOwnPropertyDescriptor(target, prop) {
            if (prop in shadow) {
                return { configurable: true, enumerable: true, writable: true, value: shadow[prop] };
            }
            try {
                if (typeof target[prop] === "function") {
                    return { configurable: true, enumerable: true, writable: true, value: target[prop] };
                }
                const desc = Reflect.getOwnPropertyDescriptor(target, prop);
                if (desc) {
                    return { ...desc, configurable: true };
                }
            } catch {}
            return undefined;
        }
    });
}

function wrapNativeModuleProxy(originalNMP: any) {
    if (!originalNMP || originalNMP.__isRainProxied) return originalNMP;
    
    const nmpShadow: Record<string | symbol, any> = {};
    return new Proxy(originalNMP, {
        get(target, prop, receiver) {
            if (prop === "__isRainProxied") return true;
            if (prop in nmpShadow) return nmpShadow[prop];
            const value = Reflect.get(target, prop, receiver);
            if (value && typeof value === "object") {
                return wrapIndividualNativeModule(value);
            }
            return value;
        },
        set(target, prop, value) {
            nmpShadow[prop] = value;
            return true;
        },
        defineProperty(target, prop, descriptor) {
            Object.defineProperty(nmpShadow, prop, descriptor);
            return true;
        },
        deleteProperty(target, prop) {
            delete nmpShadow[prop];
            return true;
        },
        has(target, prop) {
            return prop in nmpShadow || Reflect.has(target, prop);
        }
    });
}

// Safely patch window.nativeModuleProxy using defineProperty
try {
    if (window.nativeModuleProxy && !(window.nativeModuleProxy as any).__isRainProxied) {
        const proxied = wrapNativeModuleProxy(window.nativeModuleProxy);
        Object.defineProperty(window, "nativeModuleProxy", {
            value: proxied,
            configurable: true,
            writable: true,
            enumerable: true
        });
    }
} catch {}

const nmp = window.nativeModuleProxy;

export function getNativeModule<T = any>(...names: string[]): T | undefined {
    for (const name of names) {
        let rawModule: any = undefined;

        if (globalThis.__turboModuleProxy) {
            try {
                rawModule = globalThis.__turboModuleProxy(name);
            } catch {}
        }

        if (!rawModule && nmp[name]) {
            rawModule = nmp[name];
        }

        if (rawModule) {
            return wrapIndividualNativeModule(rawModule) as T;
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
